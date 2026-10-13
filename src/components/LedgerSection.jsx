import { useState, useRef } from 'react';
import { genId, saveLS, LS_LEDGER, EXPENSE_CATEGORIES, fmt } from '../utils';
import { exportLedger } from '../excel';

const EMPTY_FORM = { date: '', amount: '', desc: '', category: '' };

function LedgerCard({ r, onEdit, onDelete }) {
  const isIncome = r.type === 'income';
  const subParts = [r.date || '', r.category ? ' · ' + r.category : '', r.linkedPirivu ? ' · 🔗 പണപ്പിരിവിൽ നിന്ന് ഓട്ടോമാറ്റിക്' : ''].filter(p => p.trim());
  return (
    <div className="card">
      <div className="card-top">
        <div>
          <div className="card-name">{r.desc}</div>
          <div className="card-sub">{r.date || ''}{r.category ? ' · ' + r.category : ''}{r.linkedPirivu ? ' · 🔗 പണപ്പിരിവിൽ നിന്ന് ഓട്ടോമാറ്റിക്' : ''}</div>
        </div>
        <div className={`txn-amt ${r.type}`}>{isIncome ? '+' : '−'} {fmt(r.amount)}</div>
      </div>
      {!r.linkedPirivu
        ? <div className="card-actions">
            <button onClick={() => onEdit(r.id)}>എഡിറ്റ്</button>
            <button onClick={() => onDelete(r.id)}>ഡിലീറ്റ്</button>
          </div>
        : <div className="card-sub" style={{ marginTop: 8, fontStyle: 'italic' }}>മാറ്റണമെങ്കിൽ പണപ്പിരിവ് ടാബിൽ എഡിറ്റ് ചെയ്യുക</div>
      }
    </div>
  );
}

export default function LedgerSection({ ledgerRecords, setLedgerRecords }) {
  const [form, setForm]       = useState(EMPTY_FORM);
  const [editId, setEditId]   = useState(null);
  const [txnType, setTxnType] = useState('income');
  const [search, setSearch]   = useState('');
  const [typeChip, setTypeChip] = useState('all');
  const [catChip, setCatChip]   = useState('all');
  const formRef = useRef(null);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const clearForm = () => { setForm(EMPTY_FORM); setEditId(null); };

  const startEdit = id => {
    const r = ledgerRecords.find(x => x.id === id);
    if (!r) return;
    setForm({ date: r.date || '', amount: r.amount || '', desc: r.desc || '', category: r.category || '' });
    setTxnType(r.type);
    setEditId(id);
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSave = () => {
    if (!form.desc.trim() || !form.amount) { alert('വിവരണവും തുകയും നിർബന്ധമാണ്.'); return; }
    const rec = {
      id: editId || genId(),
      type: txnType,
      date: form.date,
      amount: form.amount,
      desc: form.desc.trim(),
      category: txnType === 'expense' ? form.category : '',
    };
    const newLedger = editId ? ledgerRecords.map(r => r.id === editId ? rec : r) : [...ledgerRecords, rec];
    saveLS(LS_LEDGER, newLedger);
    setLedgerRecords(newLedger);
    clearForm();
  };

  const handleDelete = id => {
    if (!confirm('ഈ എൻട്രി ഡിലീറ്റ് ചെയ്യണോ?')) return;
    const newLedger = ledgerRecords.filter(r => r.id !== id);
    saveLS(LS_LEDGER, newLedger);
    setLedgerRecords(newLedger);
  };

  const sorted = [...ledgerRecords].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const filtered = sorted.filter(r => {
    if (typeChip !== 'all' && r.type !== typeChip) return false;
    if (typeChip === 'expense' && catChip !== 'all' && (r.category || '') !== catChip) return false;
    if (search && !(r.desc || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleTypeChip = chip => { setTypeChip(chip); setCatChip('all'); };

  return (
    <div>
      {/* FORM */}
      <div className="panel" ref={formRef}>
        <h2>{editId ? 'എൻട്രി എഡിറ്റ് ചെയ്യുക' : 'പുതിയ എൻട്രി'}</h2>
        <div className="typetoggle">
          <button id="typeIncome" className={`typebtn income${txnType === 'income' ? ' active' : ''}`} onClick={() => setTxnType('income')}>വരവ്</button>
          <button id="typeExpense" className={`typebtn expense${txnType === 'expense' ? ' active' : ''}`} onClick={() => setTxnType('expense')}>ചെലവ്</button>
        </div>
        <div className="grid">
          <div><label>തീയതി</label><input id="l_date" type="date" name="date" value={form.date} onChange={handleChange} /></div>
          <div><label>തുക (₹)</label><input id="l_amount" type="number" name="amount" value={form.amount} onChange={handleChange} min="0" /></div>
        </div>
        <label id="l_descLabel">{txnType === 'income' ? 'വിവരണം (ആരിൽ നിന്ന് / എന്തിന്)' : 'വിവരണം (എന്തിന് / ആർക്ക്)'}</label>
        <input id="l_desc" type="text" name="desc" value={form.desc} onChange={handleChange} placeholder="ഉദാ: വഴിപാട്, ഉത്സവ ചെലവ്, വൈദ്യുതി ബിൽ..." />
        {txnType === 'expense' && (
          <div id="l_categoryBlock">
            <label>ഇനം</label>
            <select id="l_category" name="category" value={form.category} onChange={handleChange}>
              <option value="">— തിരഞ്ഞെടുക്കുക —</option>
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
        <div className="btn-row">
          <button id="ledgerSaveBtn" className="btn" onClick={handleSave}>സേവ് ചെയ്യുക</button>
          {editId && <button id="ledgerCancelBtn" className="btn secondary" onClick={clearForm}>എഡിറ്റ് റദ്ദാക്കുക</button>}
        </div>
      </div>

      {/* SEARCH */}
      <div className="searchbar">
        <input id="ledgerSearch" type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="വിവരണത്തിൽ തിരയുക..." />
      </div>

      {/* TYPE CHIPS */}
      <div className="chips" id="ledgerChips">
        {[['all', 'എല്ലാം'], ['income', 'വരവ്'], ['expense', 'ചെലവ്']].map(([k, l]) => (
          <button key={k} className={'chip' + (typeChip === k ? ' active' : '')} onClick={() => handleTypeChip(k)}>{l}</button>
        ))}
      </div>

      {/* CATEGORY CHIPS (when expense filter active) */}
      {typeChip === 'expense' && (
        <div className="chips" id="ledgerCatChips">
          {['all', ...EXPENSE_CATEGORIES].map(c => (
            <button key={c} className={'chip' + (catChip === c ? ' active' : '')} onClick={() => setCatChip(c)}>
              {c === 'all' ? 'എല്ലാ ഇനവും' : c}
            </button>
          ))}
        </div>
      )}

      <div className="count" id="ledgerCount">{filtered.length} / {ledgerRecords.length} എൻട്രികൾ</div>

      {/* RESULTS */}
      <div id="ledgerResults">
        {filtered.length === 0
          ? <div className="empty">ഇതുവരെ എൻട്രികളൊന്നുമില്ല.</div>
          : filtered.map(r => (
              <LedgerCard key={r.id} r={r} onEdit={startEdit} onDelete={handleDelete} />
            ))
        }
      </div>

      <div className="btn-row" style={{ margin: '10px 0 30px' }}>
        <button id="ledgerExportBtn" className="btn gold" onClick={() => exportLedger(ledgerRecords)}>⬇ എക്സലിലേക്ക് എക്സ്പോർട്ട് ചെയ്യുക</button>
      </div>
    </div>
  );
}
