import { useState, useEffect, useRef } from 'react';
import { genId, saveLS, LS_LEDGER, fmt } from '../utils';

const EMPTY_FORM = {
  date: new Date().toISOString().slice(0, 10),
  category: '',
  desc: '',
  amount: ''
};

const INCOME_CATS = ['പണപ്പിരിവ്', 'വഴിപാട്', 'കാണിക്ക', 'വാടക', 'ബാങ്ക് പലിശ', 'മറ്റ് വരവ്'];
const EXPENSE_CATS = ['പൂജാ സാധനങ്ങൾ', 'ശമ്പളം / ദക്ഷിണ', 'വൈദ്യുതി / വെള്ളം', 'അറ്റകുറ്റപ്പണി', 'ഉത്സവ ചെലവ്', 'മറ്റ് ചെലവ്'];

export default function LedgerEntry({
  ledgerRecords,
  setLedgerRecords,
  editingLedger,
  onClearEditing,
  onGoToHistory
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [txnType, setTxnType] = useState('income');
  const formRef = useRef(null);

  useEffect(() => {
    if (editingLedger) {
      setTxnType(editingLedger.type || 'income');
      setForm({
        date: editingLedger.date || '',
        category: editingLedger.category || '',
        desc: editingLedger.desc || '',
        amount: editingLedger.amount != null ? String(editingLedger.amount) : ''
      });
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [editingLedger]);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = e => {
    e.preventDefault();
    if (!form.desc.trim()) return alert('വിവരണം നൽകുക');
    const amt = Number(form.amount);
    if (!amt || amt <= 0) return alert('ശരിയായ തുക നൽകുക');

    const id = editingLedger ? editingLedger.id : genId();
    const rec = {
      id,
      date: form.date,
      type: txnType,
      category: form.category.trim(),
      desc: form.desc.trim(),
      amount: amt
    };

    let newLedger;
    if (editingLedger) {
      newLedger = ledgerRecords.map(r => (r.id === id ? rec : r));
    } else {
      newLedger = [rec, ...ledgerRecords];
    }

    saveLS(LS_LEDGER, newLedger);
    setLedgerRecords(newLedger);

    setForm(EMPTY_FORM);
    if (onClearEditing) onClearEditing();
  };

  const handleCancel = () => {
    setForm(EMPTY_FORM);
    if (onClearEditing) onClearEditing();
  };

  const cats = txnType === 'income' ? INCOME_CATS : EXPENSE_CATS;
  const recentLedger = ledgerRecords.slice(0, 4);

  return (
    <div className="page-ledger-entry">
      <div className="panel" ref={formRef}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2>{editingLedger ? '✏️ ഇടപാട് തിരുത്തുക' : '➕ പുതിയ വരവ് / ചെലവ് ചേർക്കുക'}</h2>
          {editingLedger && (
            <button type="button" className="btn-text cancel" onClick={handleCancel}>
              റദ്ദാക്കുക
            </button>
          )}
        </div>

        {/* TYPE TOGGLE */}
        <div className="typetoggle">
          <button
            type="button"
            className={'typebtn income' + (txnType === 'income' ? ' active' : '')}
            onClick={() => setTxnType('income')}
          >
            🟢 വരവ് (Income)
          </button>
          <button
            type="button"
            className={'typebtn expense' + (txnType === 'expense' ? ' active' : '')}
            onClick={() => setTxnType('expense')}
          >
            🔴 ചെലവ് (Expense)
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid">
            <div>
              <label>തീയതി *</label>
              <input
                name="date"
                type="date"
                value={form.date}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label>ഇനം (Category)</label>
              <select name="category" value={form.category} onChange={handleChange}>
                <option value="">തിരഞ്ഞെടുക്കുക</option>
                {cats.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid">
            <div>
              <label>വിവരണം *</label>
              <input
                name="desc"
                type="text"
                value={form.desc}
                onChange={handleChange}
                placeholder="ഉദാ: വിളക്ക് എണ്ണ വാങ്ങിയത്"
                required
              />
            </div>
            <div>
              <label>തുക (₹) *</label>
              <input
                name="amount"
                type="number"
                value={form.amount}
                onChange={handleChange}
                placeholder="0"
                min="1"
                required
              />
            </div>
          </div>

          <div className="btn-row" style={{ marginTop: 10 }}>
            <button type="submit" className="btn" style={{ flex: 1 }}>
              {editingLedger ? '💾 അപ്ഡേറ്റ് ചെയ്യുക' : '➕ ഇടപാട് ചേർക്കുക'}
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={onGoToHistory}
              style={{ flex: 1 }}
            >
              📜 ഹിസ്റ്ററി കാണുക ({ledgerRecords.length})
            </button>
          </div>
        </form>
      </div>

      {/* RECENT TRANSACTIONS */}
      {recentLedger.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--muted)' }}>
              സമീപകാല ഇടപാടുകൾ (RECENT)
            </div>
            <button className="btn-text" onClick={onGoToHistory}>
              എല്ലാം കാണുക ➔
            </button>
          </div>

          {recentLedger.map(r => (
            <div key={r.id} className="card-mini">
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{r.desc}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                  {r.date} {r.category ? `· ${r.category}` : ''}
                </div>
              </div>
              <div className={'txn-amt ' + r.type} style={{ fontSize: 15 }}>
                {r.type === 'income' ? '+ ' : '- '}
                {fmt(r.amount)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
