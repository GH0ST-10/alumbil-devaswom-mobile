import { useEffect, useState } from 'react';
import { useApkDownload } from '../useApkDownload';

/**
 * UpdateBanner
 *
 * States:
 *  "prompt"      → "Update available" slide-up with Install / Later
 *  "done"        → "Downloading APK / install from notification"
 *  "error"       → error message with retry
 */
export default function UpdateBanner({ remoteInfo, onLater }) {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState('prompt'); // prompt | done | error
  const { startDownload } = useApkDownload();

  // Animate in after short delay so it doesn't flash on cold boot
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, []);

  const handleInstall = async () => {
    const apkUrl = remoteInfo?.apkUrl;
    if (!apkUrl) {
      setPhase('error');
      return;
    }
    const result = await startDownload(apkUrl);
    if (result.success) {
      setPhase('done');
    } else {
      setPhase('error');
    }
  };

  const handleLater = () => {
    setVisible(false);
    setTimeout(onLater, 350);
  };

  // ─── Shared card style ───────────────────────────────────────────────────
  const card = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    padding: '0 0 env(safe-area-inset-bottom)',
    transform: visible ? 'translateY(0)' : 'translateY(110%)',
    transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
    pointerEvents: visible ? 'auto' : 'none',
  };

  const inner = {
    margin: '0 12px 12px',
    background: 'linear-gradient(135deg, #7a1f2b 0%, #9c2b3a 60%, #b8860b 140%)',
    borderRadius: '20px',
    padding: '18px 20px',
    boxShadow: '0 -4px 32px rgba(122,31,43,0.35)',
    color: '#fff',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Noto Sans Malayalam', 'Inter', sans-serif",
  };

  const btnPrimary = {
    flex: 1,
    background: '#fff',
    color: '#7a1f2b',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 0',
    fontWeight: 800,
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  };

  const btnSecondary = {
    background: 'rgba(255,255,255,0.18)',
    color: '#fff',
    border: '1.5px solid rgba(255,255,255,0.3)',
    borderRadius: '12px',
    padding: '12px 16px',
    fontWeight: 700,
    fontSize: '13px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };

  const iconBox = {
    width: 38,
    height: 38,
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    flexShrink: 0,
  };

  // ─── PHASE: prompt ───────────────────────────────────────────────────────
  if (phase === 'prompt') {
    return (
      <div style={card}>
        <div style={inner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={iconBox}>🔔</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '15px' }}>പുതിയ അപ്‌ഡേറ്റ് ലഭ്യം!</div>
              <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '1px' }}>
                {remoteInfo?.version ? `v${remoteInfo.version}` : 'പുതിയ വേർഷൻ'}
                {remoteInfo?.buildDate ? ` · ${remoteInfo.buildDate}` : ''}
              </div>
            </div>
          </div>

          {remoteInfo?.releaseNotes && (
            <div
              style={{
                background: 'rgba(255,255,255,0.12)',
                borderRadius: '10px',
                padding: '9px 12px',
                fontSize: '12.5px',
                marginBottom: '14px',
                lineHeight: 1.5,
              }}
            >
              {remoteInfo.releaseNotes}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleInstall} style={btnPrimary}>
              ⬇️ അപ്‌ഡേറ്റ് ചെയ്യൂ
            </button>
            <button onClick={handleLater} style={btnSecondary}>
              പിന്നീട്
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── PHASE: done ─────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <div style={card}>
        <div style={{ ...inner, background: 'linear-gradient(135deg, #15803d 0%, #1f9d55 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={iconBox}>✅</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '15px' }}>ഡൗൺലോഡ് ആരംഭിച്ചു!</div>
              <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '1px' }}>
                APK ഡൗൺലോഡ് ആകുന്നു
              </div>
            </div>
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '13px',
              lineHeight: 1.6,
            }}
          >
            📲 ഡൗൺലോഡ് പൂർത്തിയാകുമ്പോൾ ഫോൺ <strong>Notification</strong>-ൽ നിന്നോ{' '}
            <strong>Downloads</strong> ഫോൾഡറിൽ നിന്നോ ഫയൽ ക്ലിക്ക് ചെയ്ത് <strong>Install / Update</strong> ചെയ്യുക.
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button
              onClick={handleInstall}
              style={{ ...btnPrimary, background: 'rgba(255,255,255,0.25)', color: '#fff' }}
            >
              🔄 വീണ്ടും ഡൗൺലോഡ്
            </button>
            <button onClick={handleLater} style={btnSecondary}>
              അടക്കൂ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── PHASE: error ────────────────────────────────────────────────────────
  return (
    <div style={card}>
      <div style={{ ...inner, background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div style={iconBox}>⚠️</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '15px' }}>ഡൗൺലോഡ് പരാജയപ്പെട്ടു</div>
            <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '1px' }}>
              ഇന്റർനെറ്റ് ഉണ്ടെന്ന് ഉറപ്പുവരുത്തൂ
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleInstall} style={btnPrimary}>
            🔄 വീണ്ടും ശ്രമിക്കൂ
          </button>
          <button onClick={handleLater} style={btnSecondary}>
            റദ്ദാക്കൂ
          </button>
        </div>
      </div>
    </div>
  );
}
