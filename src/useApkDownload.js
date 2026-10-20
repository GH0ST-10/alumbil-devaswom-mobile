import { useState, useCallback } from 'react';

/**
 * Initiates direct APK download on Android / browser.
 *
 * Uses native system intent / download mechanism so:
 *  - CORS restrictions on GitHub release assets do not block the download
 *  - Large APK binary isn't loaded into JavaScript memory
 *  - Android's native Download Manager handles the download and prompts installation
 */
export function useApkDownload() {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  const startDownload = useCallback(async (apkUrl) => {
    if (!apkUrl) {
      setError('ഡൗൺലോഡ് ലിങ്ക് ലഭ്യമല്ല');
      return { success: false, error: 'No APK URL' };
    }

    setDownloading(true);
    setError(null);

    try {
      // 1. In Capacitor Native Android:
      // window.open with '_system' delegates the direct APK URL to Android OS,
      // which triggers Chrome / Download Manager to download the APK.
      if (window.Capacitor?.isNativePlatform?.()) {
        try {
          window.open(apkUrl, '_system');
          return { success: true };
        } catch {
          window.location.href = apkUrl;
          return { success: true };
        }
      }

      // 2. Web browser: Trigger direct file download via anchor
      const a = document.createElement('a');
      a.href = apkUrl;
      a.download = apkUrl.split('/').pop() || 'AlumbilDevaswom.apk';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      return { success: true };
    } catch (err) {
      console.error('APK download error:', err);
      setError(err.message || 'ഡൗൺലോഡ് പരാജയപ്പെട്ടു');
      return { success: false, error: err.message };
    } finally {
      setDownloading(false);
    }
  }, []);

  return { downloading, error, startDownload };
}
