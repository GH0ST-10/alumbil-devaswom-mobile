import { useState, useEffect, useCallback } from 'react';

// Injected at BUILD TIME by GitHub Actions via Vite define.
// 0 in local dev — update banner will never show locally.
const CURRENT_BUILD = typeof __APP_BUILD_NUMBER__ !== 'undefined' ? __APP_BUILD_NUMBER__ : 0;

const GITHUB_REPO = 'GH0ST-10/alumbil-devaswom-mobile';
const SNOOZE_KEY = 'alumbil_update_snoozed_until';
const CHECK_INTERVAL_MS = 30 * 60 * 1000; // every 30 minutes

/**
 * Checks for updates from GitHub Releases API (CORS enabled, real-time).
 * Falls back to GitHub release download version.json, then local version.json.
 */
async function fetchRemoteVersion() {
  // Strategy 1: GitHub Releases API (Supports CORS from mobile webview, always fresh)
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      const tag = data.tag_name || '';
      // Tag format: build-12 or v1.0.12
      const match = tag.match(/(\d+)$/);
      const buildNum = match ? parseInt(match[1], 10) : 0;
      const apkAsset = data.assets?.find(a => a.name && a.name.endsWith('.apk'));
      const apkUrl = apkAsset?.browser_download_url ||
        `https://github.com/${GITHUB_REPO}/releases/download/${tag}/AlumbilDevaswom-v1.0.${buildNum}.apk`;

      if (buildNum > 0) {
        return {
          version: data.name ? data.name.replace(/^ആലുമ്പിൽ ദേവസ്ഥാനം\s*/, '') : `1.0.${buildNum}`,
          buildNumber: buildNum,
          buildDate: data.published_at ? data.published_at.slice(0, 10) : '',
          releaseNotes: data.body || '',
          apkUrl,
          tag,
        };
      }
    }
  } catch (err) {
    console.warn('GitHub API check warning:', err);
  }

  // Strategy 2: GitHub Release direct version.json download
  try {
    const res = await fetch(`https://github.com/${GITHUB_REPO}/releases/latest/download/version.json?t=${Date.now()}`, {
      cache: 'no-store'
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // ignore
  }

  // Strategy 3: Local / relative version.json (used if web app is hosted)
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Silently checks for a newer APK build in the background.
 *
 * Returns:
 *   updateAvailable — true when server has a higher buildNumber
 *   remoteInfo      — { version, buildNumber, buildDate, releaseNotes, apkUrl }
 *   dismiss()       — snooze for 24 h ("Later" button)
 *   checkNow()      — manual re-check
 */
export function useAppUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [remoteInfo, setRemoteInfo] = useState(null);

  const check = useCallback(async () => {
    // Respect user's 24-hour snooze
    const snoozedUntil = Number(localStorage.getItem(SNOOZE_KEY) || 0);
    if (Date.now() < snoozedUntil) return;

    const remote = await fetchRemoteVersion();
    if (!remote) return;

    const remoteBuild = Number(remote.buildNumber) || 0;
    if (remoteBuild > CURRENT_BUILD) {
      setRemoteInfo(remote);
      setUpdateAvailable(true);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  useEffect(() => {
    const timer = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [check]);

  const dismiss = useCallback(() => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + 24 * 60 * 60 * 1000));
    setUpdateAvailable(false);
  }, []);

  return { updateAvailable, remoteInfo, dismiss, checkNow: check };
}
