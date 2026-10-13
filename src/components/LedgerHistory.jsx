import { useState } from 'react';
import { fmt, saveLS, LS_LEDGER, LS_PIRIVU } from '../utils';
import { exportLedger } from '../excel';

const INCOME_CATS = ['പണപ്പിരിവ്', 'വഴിപാട്', 'കാണിക്ക', 'വാടക', 'ബാങ്ക് പലിശ', 'മറ്റ് വരവ്'];
const EXPENSE_CATS = ['പൂജാ സാധനങ്ങൾ', 'ശമ്പളം / ദക്ഷിണ', 'വൈദ്യുതി / വെള്ളം', 'അറ്റകുറ്റപ്പണി', 'ഉത്സവ ചെലവ്', 'മറ്റ് ചെലവ്'];

export default function LedgerHistory({
  ledgerRecords,
  setLedgerRecords,
  pirivuRecords = [],
  setPirivuRecords,
  onEditLedger,
  onGoToLedgerEntry,
  onStatement,
  statementLoading
}) {
  const [search, setSearch] = useState('');
  const [typeChip, setTypeChip] = useState('all');
  const [catChip, setCatChip] = useState('all');

  const handleDelete = id => {
    if (!confirm('ഈ എൻട്രി ഡിലീറ്റ് ചെയ്യണോ?')) return;
    const rec = ledgerRecords.find(r => r.id === id);
    if (rec && rec.id.startsWith('pirivu_')) {
      const pId = rec.id.replace('pirivu_', '');
      const newPirivu = pirivuRecords.filter(p => p.id !== pId);
      saveLS(LS_PIRIVU, newPirivu);
      if (setPirivuRecords) setPirivuRecords(newPirivu);
    }
    const newLedger = ledgerRecords.filter(r => r.id !== id);
    saveLS(LS_LEDGER, newLedger);
    setLedgerRecords(newLedger);
  };

  const filtered = ledgerRecords.filter(r => {
    if (typeChip !== 'all' && r.type !== typeChip) return false;
    if (catChip !== 'all' && r.category !== catChip) return false;
    if (search.trim()) {
      const hay = [r.desc, r.category, r.date, String(r.amount)].join(' ').toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const allCats = [...new Set(ledgerRecords.map(r => r.category).filter(Boolean))];

  return (
    <div className="page-ledger-history">
      {/* SEARCH HEADER */}
      <div className="searchbar">
        <input
          id="ledgerSearch"
          type="text"
          placeholder="🔍 വിവരണം, ഇനം, തീയതി തിരയുക..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoComplete="off"
        />
      </div>

      {/* TYPE CHIPS */}
      <div className="chips">
        <button
          className={'chip' + (typeChip === 'all' ? ' active' : '')}
          onClick={() => setTypeChip('all')}
        >
          എല്ലാ ഇടപാടുകളും
        </button>
        <button
          className={'chip' + (typeChip === 'income' ? ' active' : '')}
          onClick={() => setTypeChip('income')}
        >
          🟢 വരവ് മാത്രം
        </button>
        <button
          className={'chip' + (typeChip === 'expense' ? ' active' : '')}
          onClick={() => setTypeChip('expense')}
        >
          🔴 ചെലവ് മാത്രം
        </button>
      </div>

      {/* CATEGORY CHIPS */}
      {allCats.length > 0 && (
        <div className="chips" style={{ marginTop: -4 }}>
          <button
            className={'chip' + (catChip === 'all' ? ' active' : '')}
            onClick={() => setCatChip('all')}
          >
            എല്ലാ ഇനങ്ങളും
          </button>
          {allCats.map(cat => (
            <button
              key={cat}
              className={'chip' + (catChip === cat ? ' active' : '')}
              onClick={() => setCatChip(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* ACTIONS ROW */}
      <div style={{ display: 'flex', gap: 10, margin: '10px 0 14px', flexWrap: 'wrap' }}>
        <button
          className="btn gold"
          style={{ flex: 1, minHeight: 44, fontSize: 13 }}
          onClick={() => exportLedger(ledgerRecords, pirivuRecords)}
        >
          📊 എക്സൽ എക്സ്പോർട്ട് (എല്ലാ ടാബുകളും)
        </button>
        <button
          className="btn"
          style={{ flex: 1, minHeight: 44, fontSize: 13, background: 'var(--maroon)' }}
          onClick={onStatement}
          disabled={statementLoading}
        >
          {statementLoading ? '⏳ തയ്യാറാക്കുന്നു...' : '📄 യോഗ സ്റ്റേറ്റ്മെന്റ്'}
        </button>
      </div>

      <div className="count">
        കണ്ടെത്തിയ ഇടപാടുകൾ: <b>{filtered.length}</b> / {ledgerRecords.length}
      </div>

      {/* TRANSACTIONS LIST */}
      <div className="cards-list">
        {filtered.length === 0 ? (
          <div className="empty-box">
            <div style={{ fontSize: 32, marginBottom: 8 }}>📜</div>
            <div>ഇടപാടുകളൊന്നും കണ്ടെത്തിയില്ല</div>
            <button className="btn secondary" style={{ marginTop: 14 }} onClick={onGoToLedgerEntry}>
              ➕ പുതിയ ഇടപാട് ചേർക്കുക
            </button>
          </div>
        ) : (
          filtered.map(r => (
            <div key={r.id} className="card">
              <div className="card-top">
                <div>
                  <div className="card-name">{r.desc}</div>
                  <div className="card-sub">
                    {r.date} {r.category ? `· ${r.category}` : ''}
                  </div>
                </div>
                <div className={'txn-amt ' + r.type}>
                  {r.type === 'income' ? '+ ' : '- '}
                  {fmt(r.amount)}
                </div>
              </div>

              <div className="card-actions">
                <button onClick={() => onEditLedger(r)}>✏️ എഡിറ്റ്</button>
                <button onClick={() => handleDelete(r.id)}>🗑️ ഡിലീറ്റ്</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
