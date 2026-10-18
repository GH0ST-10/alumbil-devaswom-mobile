import { fmt } from '../utils';
import { IconFileText, IconSpinner, IconChartBar } from './Icons';

export default function Header({
  pirivuRecords,
  ledgerRecords,
  onStatement,
  statementLoading,
  onGoToReports,
  isAdmin,
  isOnline,
  onToggleAdmin,
  onMigrate,
  canMigrate
}) {
  const pirivuPledged  = pirivuRecords.reduce((s, r) => s + (Number(r.receipt) || 0), 0);
  const ledgerIncome   = ledgerRecords.filter(r => r.type === 'income').reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const ledgerExpense  = ledgerRecords.filter(r => r.type === 'expense').reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const balance        = ledgerIncome - ledgerExpense;

  return (
    <header className="header">
      <div className="wrap" style={{ padding: 0 }}>
        <div className="header-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/icon.png" alt="App Icon" className="header-icon" />
            <div className="header-titles">
              <h1>ആലുമ്പിൽ ദേവസ്ഥാനം</h1>
              <p>പണപ്പിരിവും വരവ്-ചെലവ് കണക്കും</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            {/* Online / Offline Sync Badge */}
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: 20,
                background: isOnline ? 'rgba(16, 185, 129, 0.22)' : 'rgba(245, 158, 11, 0.22)',
                color: isOnline ? '#34d399' : '#fbbf24',
                border: isOnline ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid rgba(251, 191, 36, 0.4)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}
              title={isOnline ? 'ക്ലൗഡുമായി ലൈവ് കണക്റ്റഡ് ആണ്' : 'ഓഫ്‌ലൈൻ കാഷെയിലാണ് സേവ് ആകുന്നത്'}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: isOnline ? '#34d399' : '#fbbf24',
                  boxShadow: isOnline ? '0 0 6px #34d399' : 'none'
                }}
              />
              <span>{isOnline ? 'ലൈവ് സിങ്ക്' : 'ഓഫ്‌ലൈൻ'}</span>
            </div>

            {/* Committee Admin PIN Button */}
            <button
              type="button"
              onClick={onToggleAdmin}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 20,
                background: isAdmin ? 'rgba(217, 119, 6, 0.35)' : 'rgba(255, 255, 255, 0.15)',
                color: '#fff',
                border: isAdmin ? '1px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.25)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <span>{isAdmin ? '🔓 കമ്മിറ്റി അഡ്മിൻ' : '🔒 വ്യൂ ഒൺലി'}</span>
            </button>
          </div>
        </div>
        <div className="stats">
          <div className="stat">
            <div className="num">{fmt(pirivuPledged)}</div>
            <div className="lbl">ആകെ രസീത് തുക</div>
          </div>
          <div className="stat">
            <div className="num">{fmt(ledgerIncome)}</div>
            <div className="lbl">ആകെ വരവ്</div>
          </div>
          <div className="stat">
            <div className="num">{fmt(ledgerExpense)}</div>
            <div className="lbl">ആകെ ചെലവ്</div>
          </div>
          <div className="stat highlight">
            <div className="num">{fmt(balance)}</div>
            <div className="lbl">കൈവശമുള്ള ബാക്കി</div>
          </div>
        </div>
        <div className="btn-row" style={{ marginTop: 14 }}>
          {onGoToReports && (
            <button
              type="button"
              className="btn"
              style={{
                flex: 1,
                minHeight: 44,
                fontSize: 13,
                background: 'rgba(255, 255, 255, 0.18)',
                border: '1.5px solid rgba(255, 255, 255, 0.35)',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
              onClick={onGoToReports}
            >
              <IconChartBar size={17} />
              <span>വിശദമായ റിപ്പോർട്ട്</span>
            </button>
          )}
          <button
            id="statementBtn"
            className="btn gold"
            style={{ flex: 1, minHeight: 44, fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            onClick={onStatement}
            disabled={statementLoading}
          >
            {statementLoading ? (
              <>
                <IconSpinner size={16} />
                <span>തയ്യാറാക്കുന്നു...</span>
              </>
            ) : (
              <>
                <IconFileText size={17} />
                <span>യോഗ സ്റ്റേറ്റ്മെന്റ്</span>
              </>
            )}
          </button>
        </div>

        {canMigrate && (
          <div
            style={{
              marginTop: 12,
              background: 'rgba(251, 191, 36, 0.22)',
              border: '1px dashed #fbbf24',
              borderRadius: 10,
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10
            }}
          >
            <span style={{ fontSize: 12, color: '#fef3c7' }}>
              ℹ️ ഫോണിലെ മുൻകാല വിവരങ്ങൾ ക്ലൗഡിലേക്ക് അപ്‌ലോഡ് ചെയ്യണോ?
            </span>
            <button
              type="button"
              onClick={onMigrate}
              style={{
                background: '#fbbf24',
                color: '#78350f',
                border: 'none',
                padding: '5px 12px',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              ക്ലൗഡ് സിങ്ക്
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

