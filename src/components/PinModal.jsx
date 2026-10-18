import { useState, useEffect, useRef } from 'react';
import {
  hashPin,
  subscribeToSecurityConfig,
  updateSecurityPinInCloud,
  DEFAULT_PIN,
  MASTER_RECOVERY_KEY
} from '../services/db';
import { IconCheck } from './Icons';

export const LS_ADMIN_AUTH = 'devaswom_admin_auth_v1';
export const LS_CACHED_PIN_HASH = 'devaswom_cached_pin_hash_v1';
export const LS_FAILED_ATTEMPTS = 'devaswom_pin_failed_attempts_v1';
export const LS_COOLDOWN_UNTIL = 'devaswom_pin_cooldown_until_v1';

export default function PinModal({
  isOpen,
  onClose,
  onSuccess
}) {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('verify'); // 'verify' | 'change' | 'recovery'
  
  // Recovery & Change state
  const [masterKey, setMasterKey] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Cloud synced pin hash
  const [cloudPinHash, setCloudPinHash] = useState(() => localStorage.getItem(LS_CACHED_PIN_HASH) || '');

  // Brute-force lockout state
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const timerRef = useRef(null);

  // Subscribe to cloud security config
  useEffect(() => {
    const unsub = subscribeToSecurityConfig(data => {
      if (data && data.pinHash) {
        setCloudPinHash(data.pinHash);
        localStorage.setItem(LS_CACHED_PIN_HASH, data.pinHash);
      }
    });
    return () => unsub();
  }, []);

  // Check cooldown on mount / open
  useEffect(() => {
    const checkCooldown = () => {
      const cooldownUntil = parseInt(localStorage.getItem(LS_COOLDOWN_UNTIL) || '0', 10);
      const remaining = Math.ceil((cooldownUntil - Date.now()) / 1000);
      if (remaining > 0) {
        setCooldownSeconds(remaining);
      } else {
        setCooldownSeconds(0);
      }
    };

    checkCooldown();
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      const cooldownUntil = parseInt(localStorage.getItem(LS_COOLDOWN_UNTIL) || '0', 10);
      const remaining = Math.ceil((cooldownUntil - Date.now()) / 1000);
      if (remaining > 0) {
        setCooldownSeconds(remaining);
      } else {
        setCooldownSeconds(0);
        localStorage.removeItem(LS_COOLDOWN_UNTIL);
      }
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFailedAttempt = () => {
    const attempts = parseInt(localStorage.getItem(LS_FAILED_ATTEMPTS) || '0', 10) + 1;
    localStorage.setItem(LS_FAILED_ATTEMPTS, String(attempts));

    if (attempts >= 5) {
      const lockoutTime = Date.now() + 60 * 1000; // 60 seconds lockout
      localStorage.setItem(LS_COOLDOWN_UNTIL, String(lockoutTime));
      localStorage.setItem(LS_FAILED_ATTEMPTS, '0');
      setCooldownSeconds(60);
      setErrorMsg('5 തവണ തെറ്റായ PIN നൽകി. 60 സെക്കൻഡ് കഴിഞ്ഞ് വീണ്ടും ശ്രമിക്കുക.');
    } else {
      const remainingAttempts = 5 - attempts;
      setErrorMsg(`തെറ്റായ PIN! (${remainingAttempts} ശ്രമങ്ങൾ ബാക്കി)`);
    }
  };

  const handleSuccessAuth = () => {
    localStorage.setItem(LS_ADMIN_AUTH, 'true');
    localStorage.removeItem(LS_FAILED_ATTEMPTS);
    localStorage.removeItem(LS_COOLDOWN_UNTIL);
    setPin('');
    setErrorMsg('');
    onSuccess();
    onClose();
  };

  // 1. VERIFY PIN
  const handleVerify = async e => {
    e.preventDefault();
    if (cooldownSeconds > 0) return;
    if (pin.length !== 4) {
      setErrorMsg('4 അക്ക PIN നൽകുക');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const inputHash = await hashPin(pin);
      let targetHash = cloudPinHash;

      // Fallback to default hash if never set
      if (!targetHash) {
        targetHash = await hashPin(DEFAULT_PIN);
      }

      if (inputHash === targetHash) {
        handleSuccessAuth();
      } else {
        handleFailedAttempt();
        setPin('');
      }
    } catch {
      setErrorMsg('പരിശോധനയിൽ തടസ്സം നേരിട്ടു.');
    } finally {
      setLoading(false);
    }
  };

  // 2. CHANGE PIN (Requires Current PIN)
  const handleChangePin = async e => {
    e.preventDefault();
    if (newPin.length !== 4) {
      setErrorMsg('പുതിയ PIN 4 അക്കങ്ങൾ ഉണ്ടായിരിക്കണം');
      return;
    }
    if (newPin !== confirmNewPin) {
      setErrorMsg('പുതിയ PIN രണ്ടും ഒരേപോലെ ആയിരിക്കണം');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const currentInputHash = await hashPin(pin);
      let targetHash = cloudPinHash || (await hashPin(DEFAULT_PIN));

      if (currentInputHash !== targetHash) {
        setErrorMsg('നിലവിലെ PIN തെറ്റാണ്!');
        setLoading(false);
        return;
      }

      const updatedHash = await updateSecurityPinInCloud(newPin);
      setCloudPinHash(updatedHash);
      localStorage.setItem(LS_CACHED_PIN_HASH, updatedHash);

      setSuccessNotice('PIN വിജയകരമായി മാറ്റി! ക്ലൗഡിൽ അപ്‌ഡേറ്റ് ആയി.');
      setTimeout(() => {
        setSuccessNotice('');
        setMode('verify');
        handleSuccessAuth();
      }, 1200);
    } catch (err) {
      console.error(err);
      setErrorMsg('PIN മാറ്റാൻ കഴിഞ്ഞില്ല. ഇന്റർനെറ്റ് കണക്ഷൻ പരിശോധിക്കുക.');
    } finally {
      setLoading(false);
    }
  };

  // 3. MASTER KEY RECOVERY
  const handleRecovery = async e => {
    e.preventDefault();
    if (masterKey.trim() !== MASTER_RECOVERY_KEY) {
      setErrorMsg('തെറ്റായ Master Recovery Key!');
      return;
    }
    if (newPin.length !== 4) {
      setErrorMsg('പുതിയ PIN 4 അക്കങ്ങൾ ഉണ്ടായിരിക്കണം');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const updatedHash = await updateSecurityPinInCloud(newPin);
      setCloudPinHash(updatedHash);
      localStorage.setItem(LS_CACHED_PIN_HASH, updatedHash);
      localStorage.removeItem(LS_COOLDOWN_UNTIL);
      localStorage.removeItem(LS_FAILED_ATTEMPTS);
      setCooldownSeconds(0);

      setSuccessNotice('Master Key വഴി PIN വിജയകരമായി റീസെറ്റ് ചെയ്തു!');
      setTimeout(() => {
        setSuccessNotice('');
        setMode('verify');
        handleSuccessAuth();
      }, 1200);
    } catch {
      setErrorMsg('റീസെറ്റ് ചെയ്യുന്നതിൽ തടസ്സം നേരിട്ടു.');
    } finally {
      setLoading(false);
    }
  };

  const resetDialog = () => {
    setPin('');
    setNewPin('');
    setConfirmNewPin('');
    setMasterKey('');
    setErrorMsg('');
    setSuccessNotice('');
    setMode('verify');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.68)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px'
      }}
      onClick={resetDialog}
    >
      <div
        style={{
          background: 'var(--card, #ffffff)',
          color: 'var(--text, #1f2937)',
          borderRadius: 20,
          padding: '24px 20px',
          width: '100%',
          maxWidth: 380,
          boxShadow: '0 24px 48px rgba(0,0,0,0.35)',
          textAlign: 'center',
          border: '1px solid var(--border, #e5e7eb)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 38, marginBottom: 6 }}>
          {mode === 'recovery' ? '🔑' : '🔐'}
        </div>

        <h3 style={{ margin: '0 0 6px 0', fontSize: 18, fontWeight: 700 }}>
          {mode === 'verify' && 'കമ്മിറ്റി PIN നൽകുക'}
          {mode === 'change' && 'PIN മാറ്റുക (Cloud Update)'}
          {mode === 'recovery' && 'Master Key വഴി PIN റീസെറ്റ്'}
        </h3>

        <p style={{ margin: '0 0 16px 0', fontSize: 13, color: 'var(--muted, #6b7280)', lineHeight: 1.5 }}>
          {mode === 'verify' && 'ഇടപാടുകൾ ചേർക്കാനും മാറ്റങ്ങൾ വരുത്താനും 4 അക്ക കമ്മിറ്റി PIN നൽകുക.'}
          {mode === 'change' && 'നിലവിലെ PIN നൽകിയ ശേഷം പുതിയ 4 അക്ക PIN ക്ലൗഡിലേക്ക് സേവ് ചെയ്യുക.'}
          {mode === 'recovery' && 'കമ്മിറ്റി Master Recovery Key നൽകി പുതിയ PIN നൽകുക.'}
        </p>

        {successNotice ? (
          <div style={{ padding: '14px', background: 'var(--green-bg, #ecfdf5)', color: 'var(--green, #059669)', borderRadius: 12, fontWeight: 600, fontSize: 14 }}>
            ✓ {successNotice}
          </div>
        ) : mode === 'verify' ? (
          /* ================= VERIFY MODE ================= */
          <form onSubmit={handleVerify}>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              disabled={cooldownSeconds > 0}
              value={pin}
              onChange={e => {
                setPin(e.target.value.replace(/\D/g, ''));
                setErrorMsg('');
              }}
              placeholder="••••"
              style={{
                fontSize: 32,
                textAlign: 'center',
                letterSpacing: 14,
                padding: '10px 14px',
                width: '150px',
                margin: '0 auto 12px auto',
                border: errorMsg ? '2px solid #ef4444' : '2px solid var(--border, #d1d5db)',
                borderRadius: 14,
                outline: 'none',
                background: cooldownSeconds > 0 ? '#f3f4f6' : 'var(--bg, #f9fafb)',
                color: 'inherit',
                display: 'block'
              }}
              autoFocus
            />

            {cooldownSeconds > 0 && (
              <div style={{ color: '#dc2626', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                ⏳ ദയവായി കാത്തിരിക്കുക: {cooldownSeconds} സെക്കൻഡ്
              </div>
            )}

            {errorMsg && (
              <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 14, fontWeight: 600 }}>
                {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button
                type="button"
                onClick={resetDialog}
                className="btn-outline"
                style={{ flex: 1, padding: '11px', borderRadius: 10 }}
              >
                റദ്ദാക്കുക
              </button>
              <button
                type="submit"
                disabled={cooldownSeconds > 0 || loading}
                className="btn-primary"
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  opacity: cooldownSeconds > 0 ? 0.5 : 1
                }}
              >
                <IconCheck size={16} />
                <span>{loading ? 'പരിശോധിക്കുന്നു...' : 'തുറക്കുക'}</span>
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, fontSize: 12 }}>
              <button
                type="button"
                onClick={() => { setErrorMsg(''); setMode('change'); }}
                style={{ background: 'none', border: 'none', color: 'var(--primary, #d97706)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                PIN മാറ്റണോ?
              </button>
              <button
                type="button"
                onClick={() => { setErrorMsg(''); setMode('recovery'); }}
                style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', textDecoration: 'underline' }}
              >
                PIN മറന്നുപോയോ?
              </button>
            </div>
          </form>
        ) : mode === 'change' ? (
          /* ================= CHANGE PIN MODE ================= */
          <form onSubmit={handleChangePin}>
            <div style={{ marginBottom: 10, textAlign: 'left' }}>
              <label style={{ fontSize: 12, color: 'var(--muted, #6b7280)' }}>നിലവിലെ PIN:</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                style={{ width: '100%', padding: '9px 12px', fontSize: 18, textAlign: 'center', borderRadius: 8, border: '1px solid var(--border, #d1d5db)', marginTop: 4, boxSizing: 'border-box' }}
                autoFocus
              />
            </div>
            <div style={{ marginBottom: 10, textAlign: 'left' }}>
              <label style={{ fontSize: 12, color: 'var(--muted, #6b7280)' }}>പുതിയ 4 അക്ക PIN:</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={newPin}
                onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                style={{ width: '100%', padding: '9px 12px', fontSize: 18, textAlign: 'center', borderRadius: 8, border: '1px solid var(--border, #d1d5db)', marginTop: 4, boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: 14, textAlign: 'left' }}>
              <label style={{ fontSize: 12, color: 'var(--muted, #6b7280)' }}>പുതിയ PIN ഒരിക്കൽകൂടി നൽകുക:</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={confirmNewPin}
                onChange={e => setConfirmNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                style={{ width: '100%', padding: '9px 12px', fontSize: 18, textAlign: 'center', borderRadius: 8, border: '1px solid var(--border, #d1d5db)', marginTop: 4, boxSizing: 'border-box' }}
              />
            </div>

            {errorMsg && (
              <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12, fontWeight: 600 }}>
                {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => { setErrorMsg(''); setMode('verify'); }}
                className="btn-outline"
                style={{ flex: 1, padding: '10px', borderRadius: 8 }}
              >
                പിന്നോട്ട്
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ flex: 1, padding: '10px', borderRadius: 8 }}
              >
                {loading ? 'മാറ്റുന്നു...' : 'സേവ് ചെയ്യുക'}
              </button>
            </div>
          </form>
        ) : (
          /* ================= MASTER KEY RECOVERY MODE ================= */
          <form onSubmit={handleRecovery}>
            <div style={{ marginBottom: 10, textAlign: 'left' }}>
              <label style={{ fontSize: 12, color: 'var(--muted, #6b7280)' }}>
                Master Recovery Key:
              </label>
              <input
                type="text"
                value={masterKey}
                onChange={e => setMasterKey(e.target.value)}
                placeholder="ഉദാ: ALUMBAL@SEC2024"
                style={{ width: '100%', padding: '9px 12px', fontSize: 14, borderRadius: 8, border: '1px solid var(--border, #d1d5db)', marginTop: 4, boxSizing: 'border-box' }}
                autoFocus
              />
              <span style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginTop: 4 }}>
                (ക്ഷേത്ര സെക്രട്ടറി/ഓഫീസിൽ ലഭ്യമായ രഹസ്യ കോഡ്)
              </span>
            </div>

            <div style={{ marginBottom: 14, textAlign: 'left' }}>
              <label style={{ fontSize: 12, color: 'var(--muted, #6b7280)' }}>
                പുതിയ 4 അക്ക PIN നൽകുക:
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={newPin}
                onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                style={{ width: '100%', padding: '9px 12px', fontSize: 18, textAlign: 'center', borderRadius: 8, border: '1px solid var(--border, #d1d5db)', marginTop: 4, boxSizing: 'border-box' }}
              />
            </div>

            {errorMsg && (
              <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12, fontWeight: 600 }}>
                {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => { setErrorMsg(''); setMode('verify'); }}
                className="btn-outline"
                style={{ flex: 1, padding: '10px', borderRadius: 8 }}
              >
                പിന്നോട്ട്
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ flex: 1, padding: '10px', borderRadius: 8 }}
              >
                {loading ? 'റീസെറ്റ് ചെയ്യുന്നു...' : 'റീസെറ്റ് ചെയ്യുക'}
              </button>
            </div>

            <div style={{ marginTop: 14, padding: '8px 10px', background: '#fef3c7', borderRadius: 8, fontSize: 11, color: '#92400e', textAlign: 'left' }}>
              💡 <b>അഡ്മിൻ ശ്രദ്ധയ്ക്ക്:</b> Master Key യും ലഭ്യമല്ലെങ്കിൽ Firebase Console-ൽ കയറി <code>config/security</code> ഡോക്യുമെന്റ് ഡിലീറ്റ് ചെയ്താൽ തനിയെ <code>2024</code> ലേക്ക് റീസെറ്റ് ആകും.
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
