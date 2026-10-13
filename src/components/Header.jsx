import { fmt } from '../utils';
import { IconFileText, IconSpinner } from './Icons';

export default function Header({ pirivuRecords, ledgerRecords, onStatement, statementLoading }) {
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
          <button
            id="statementBtn"
            className="btn gold"
            onClick={onStatement}
            disabled={statementLoading}
          >
            {statementLoading ? (
              <>
                <IconSpinner size={18} />
                <span>തയ്യാറാക്കുന്നു...</span>
              </>
            ) : (
              <>
                <IconFileText size={18} />
                <span>യോഗത്തിന് സ്റ്റേറ്റ്മെന്റ് തയ്യാറാക്കുക</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
