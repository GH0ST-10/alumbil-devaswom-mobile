import { fmt } from '../utils';
import { IconFileText, IconSpinner, IconChartBar } from './Icons';

export default function Header({
  pirivuRecords,
  ledgerRecords,
  onStatement,
  statementLoading,
  onGoToReports
}) {
  const pirivuPledged  = pirivuRecords.reduce((s, r) => s + (Number(r.receipt) || 0), 0);
  const ledgerIncome   = ledgerRecords.filter(r => r.type === 'income').reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const ledgerExpense  = ledgerRecords.filter(r => r.type === 'expense').reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const balance        = ledgerIncome - ledgerExpense;

  return (
    <header className="header">
      <div className="wrap" style={{ padding: 0 }}>
        <div className="header-top">
          <img src="/icon.png" alt="App Icon" className="header-icon" />
          <div className="header-titles">
            <h1>ആലുമ്പിൽ ദേവസ്ഥാനം</h1>
            <p>പണപ്പിരിവും വരവ്-ചെലവ് കണക്കും</p>
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
      </div>
    </header>
  );
}

