import { useState } from 'react';
import { fmt, saveLS, LS_LEDGER, LS_PIRIVU } from '../utils';
import { deleteLedgerRecord } from '../services/db';
import { exportLedger } from '../excel';
import {
  IconSearch,
  IconTrendingUp,
  IconTrendingDown,
  IconFileSpreadsheet,
  IconFileText,
  IconSpinner,
  IconInbox,
  IconPlus,
  IconPencil,
  IconTrash,
  IconChartBar
} from './Icons';

export default function LedgerHistory({
  ledgerRecords,
  setLedgerRecords,
  pirivuRecords = [],
  setPirivuRecords,
  onEditLedger,
  onGoToLedgerEntry,
  onStatement,
  statementLoading,
  onGoToReports,
  isAdmin,
  onRequestUnlock
}) {
  const [search, setSearch] = useState('');
  const [typeChip, setTypeChip] = useState('all');
  const [catChip, setCatChip] = useState('all');

  const handleEdit = r => {
    if (!isAdmin && onRequestUnlock) {
      return onRequestUnlock(() => onEditLedger(r));
    }
    onEditLedger(r);
  };

  const handleDelete = id => {
    const proceed = () => {
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

      deleteLedgerRecord(id).catch(err => {
        console.warn('Cloud delete ledger notice:', err);
      });
    };

    if (!isAdmin && onRequestUnlock) {
      return onRequestUnlock(proceed);
    }
    proceed();
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
        <IconSearch size={18} style={{ color: 'var(--text3)', flexShrink: 0 }} />
        <input
          id="ledgerSearch"
          type="text"
          placeholder="വിവരണം, ഇനം, തീയതി തിരയുക..."
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
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
        >
          <IconTrendingUp size={14} style={{ color: 'var(--green)' }} />
          <span>വരവ് മാത്രം</span>
        </button>
        <button
          className={'chip' + (typeChip === 'expense' ? ' active' : '')}
          onClick={() => setTypeChip('expense')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
        >
          <IconTrendingDown size={14} style={{ color: 'var(--red)' }} />
          <span>ചെലവ് മാത്രം</span>
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
      <div style={{ display: 'flex', gap: 8, margin: '10px 0 14px', flexWrap: 'wrap' }}>
        {onGoToReports && (
          <button
            type="button"
            className="btn"
            style={{ flex: 1, minHeight: 44, fontSize: 13, background: 'var(--maroon-light)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            onClick={onGoToReports}
          >
            <IconChartBar size={16} />
            <span>വിശദമായ റിപ്പോർട്ട്</span>
          </button>
        )}
        <button
          className="btn gold"
          style={{ flex: 1, minHeight: 44, fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          onClick={() => exportLedger(ledgerRecords, pirivuRecords)}
        >
          <IconFileSpreadsheet size={16} />
          <span>എക്സൽ</span>
        </button>
        <button
          className="btn"
          style={{ flex: 1, minHeight: 44, fontSize: 13, background: 'var(--maroon)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
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
              <IconFileText size={16} />
              <span>യോഗ സ്റ്റേറ്റ്മെന്റ്</span>
            </>
          )}
        </button>
      </div>

      <div className="count">
        കണ്ടെത്തിയ ഇടപാടുകൾ: <b>{filtered.length}</b> / {ledgerRecords.length}
      </div>

      {/* TRANSACTIONS LIST */}
      <div className="cards-list">
        {filtered.length === 0 ? (
          <div className="empty-box">
            <IconInbox size={38} style={{ color: 'var(--text3)', margin: '0 auto 8px', display: 'block' }} />
            <div>ഇടപാടുകളൊന്നും കണ്ടെത്തിയില്ല</div>
            <button
              className="btn secondary"
              style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={onGoToLedgerEntry}
            >
              <IconPlus size={16} />
              <span>പുതിയ ഇടപാട് ചേർക്കുക</span>
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
                <button
                  onClick={() => handleEdit(r)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <IconPencil size={13} />
                  <span>എഡിറ്റ്</span>
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <IconTrash size={13} />
                  <span>ഡിലീറ്റ്</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

