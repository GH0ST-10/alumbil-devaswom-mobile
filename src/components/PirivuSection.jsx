import { useState, useRef } from 'react';
import { genId, saveLS, LS_PIRIVU, LS_LEDGER, statusOf, STATUS_META, syncPirivuToLedger, fmt } from '../utils';
import { shareReceipt } from '../pdf';
import { exportPirivu } from '../excel';

const EMPTY_FORM = { name: '', house: '', receiptno: '', phone: '', date: '', receipt: '', paid: '', occasion: '', remarks: '' };

function distinctOccasions(records) {
  return [...new Set(records.map(r => r.occasion).filter(Boolean))].sort();
}

function PirivuCard({ r, onEdit, onDelete, onReceipt }) {
  const st = statusOf(r);
  const meta = STATUS_META[st];
  const receipt = Number(r.receipt) || 0;
  const paid    = Number(r.paid)    || 0;
  const pct     = receipt > 0 ? Math.min(100, Math.round(paid / receipt * 100)) : 0;
  const subParts = [r.house, r.receiptno ? 'രസീത് #' + r.receiptno : '', r.phone, r.date, r.occasion].filter(Boolean);

  return (
    <div className="card">
      <div className="card-top">
        <div>
          <div className="card-name">{r.name}</div>
          <div className="card-sub">{subParts.join(' · ')}</div>
        </div>
        <div className="badge" style={{ background: meta.bg, color: meta.fg }}>{meta.label}</div>
      </div>
      <div className="amounts">
        <div>രസീത് തുക<b>{fmt(receipt)}</b></div>
        <div>ലഭിച്ചത്<b>{fmt(paid)}</b></div>
        <div>ബാക്കി<b>{fmt(receipt - paid)}</b></div>
      </div>
      <div className="progress"><div className="progress-fill" style={{ width: pct + '%' }} /></div>
      {r.remarks && <div className="card-sub" style={{ marginTop: 8 }}>{r.remarks}</div>}
      <div className="card-actions">
        <button onClick={() => onEdit(r.id)}>എഡിറ്റ്</button>
        <button onClick={() => onDelete(r.id)}>ഡിലീറ്റ്</button>
        {paid > 0 && <button onClick={() => onReceipt(r)}>🧾 രസീത് ഷെയർ ചെയ്യുക</button>}
      </div>
    </div>
  );
}

export default function PirivuSection({ pirivuRecords, setPirivuRecords, ledgerRecords, setLedgerRecords }) {
  const [form, setForm]           = useState(EMPTY_FORM);
  const [editId, setEditId]       = useState(null);
  const [search, setSearch]       = useState('');
  const [statusChip, setStatusChip] = useState('all');
  const [occChip, setOccChip]     = useState('all');
  const formRef = useRef(null);

  const occasions = distinctOccasions(pirivuRecords);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const clearForm = () => { setForm(EMPTY_FORM); setEditId(null); };

  const startEdit = id => {
    const r = pirivuRecords.find(x => x.id === id);
    if (!r) return;
    setForm({ name: r.name || '', house: r.house || '', receiptno: r.receiptno || '', phone: r.phone || '', date: r.date || '', receipt: r.receipt || '', paid: r.paid || '', occasion: r.occasion || '', remarks: r.remarks || '' });
    setEditId(id);
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSave = () => {
    if (!form.name.trim()) { alert('പേര് നിർബന്ധമാണ്.'); return; }
    const id = editId || genId();
    const rec = { id, name: form.name.trim(), house: form.house.trim(), occasion: form.occasion.trim(), receiptno: form.receiptno.trim(), phone: form.phone.trim(), date: form.date, receipt: form.receipt, paid: form.paid, remarks: form.remarks.trim() };

    const newPirivu = editId ? pirivuRecords.map(r => r.id === editId ? rec : r) : [...pirivuRecords, rec];
    saveLS(LS_PIRIVU, newPirivu);
    setPirivuRecords(newPirivu);

    const newLedger = syncPirivuToLedger(id, rec, ledgerRecords);
    saveLS(LS_LEDGER, newLedger);
    setLedgerRecords(newLedger);

    clearForm();
  };

  const handleDelete = id => {
    if (!confirm('ഈ എൻട്രി ഡിലീറ്റ് ചെയ്യണോ?')) return;
    const newPirivu = pirivuRecords.filter(r => r.id !== id);
    saveLS(LS_PIRIVU, newPirivu);
    setPirivuRecords(newPirivu);
    const newLedger = ledgerRecords.filter(r => r.id !== 'pirivu_' + id);
    saveLS(LS_LEDGER, newLedger);
    setLedgerRecords(newLedger);
  };

  const handleReceipt = async r => { try { await shareReceipt(r); } catch { alert('രസീത് ഷെയർ ചെയ്യാൻ കഴിഞ്ഞില്ല.'); } };

  const filtered = pirivuRecords.filter(r => {
    if (occChip !== 'all' && (r.occasion || '') !== occChip) return false;
    if (statusChip !== 'all' && statusOf(r) !== statusChip) return false;
    if (search) {
      const hay = [r.name, r.house, r.receiptno, r.occasion, r.remarks].join(' ').toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const STATUS_CHIPS = [['all', 'എല്ലാം'], ['full', 'പൂർണമായി അടച്ചു'], ['partial', 'ഭാഗികം'], ['unpaid', 'അടച്ചിട്ടില്ല']];

  return (
    <div>
      {/* FORM */}
      <div className="panel" ref={formRef}>
        <h2>{editId ? 'പിരിവുകാരനെ എഡിറ്റ് ചെയ്യുക' : 'പിരിവുകാരനെ ചേർക്കുക'}</h2>
        <div className="grid">
          <div><label>പേര്</label><input id="p_name" type="text" name="name" value={form.name} onChange={handleChange} placeholder="ഉദാ: ഇളംതൊട്ടത്തിൽ സുധീഷ്" /></div>
          <div><label>വീട് / വിലാസം</label><input id="p_house" type="text" name="house" value={form.house} onChange={handleChange} /></div>
          <div><label>രസീത് നമ്പർ</label><input id="p_receiptno" type="text" name="receiptno" value={form.receiptno} onChange={handleChange} /></div>
          <div><label>ഫോൺ നമ്പർ</label><input id="p_phone" type="text" name="phone" value={form.phone} onChange={handleChange} placeholder="ഉദാ: 9876543210" /></div>
          <div><label>തീയതി</label><input id="p_date" type="date" name="date" value={form.date} onChange={handleChange} /></div>
          <div><label>രസീത് തുക (₹)</label><input id="p_receipt" type="number" name="receipt" value={form.receipt} onChange={handleChange} min="0" /></div>
          <div><label>ലഭിച്ച തുക (₹)</label><input id="p_paid" type="number" name="paid" value={form.paid} onChange={handleChange} min="0" /></div>
        </div>
        <label>ഉത്സവം / പിരിവ് കാരണം</label>
        <input id="p_occasion" type="text" name="occasion" value={form.occasion} onChange={handleChange} list="occasionList" placeholder="ഉദാ: വാർഷികം 2026, ഉത്സവം 2026..." />
        <datalist id="occasionList">{occasions.map(o => <option key={o} value={o} />)}</datalist>
        <label>കുറിപ്പ്</label>
        <input id="p_remarks" type="text" name="remarks" value={form.remarks} onChange={handleChange} />
        <div className="btn-row">
          <button id="pirivuSaveBtn" className="btn" onClick={handleSave}>സേവ് ചെയ്യുക</button>
          {editId && <button id="pirivuCancelBtn" className="btn secondary" onClick={clearForm}>എഡിറ്റ് റദ്ദാക്കുക</button>}
        </div>
      </div>

      {/* SEARCH */}
      <div className="searchbar">
        <input id="pirivuSearch" type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="പേര്, വീട്, രസീത് നമ്പർ എന്നിവയിൽ തിരയുക..." />
      </div>

      {/* STATUS CHIPS */}
      <div className="chips" id="pirivuChips">
        {STATUS_CHIPS.map(([k, l]) => (
          <button key={k} className={'chip' + (statusChip === k ? ' active' : '')} onClick={() => setStatusChip(k)}>{l}</button>
        ))}
      </div>

      {/* OCCASION CHIPS */}
      {occasions.length > 0 && (
        <div className="chips" id="pirivuOccChips">
          {['all', ...occasions].map(o => (
            <button key={o} className={'chip' + (occChip === o ? ' active' : '')} onClick={() => setOccChip(o)}>
              {o === 'all' ? 'എല്ലാ ഉത്സവവും' : o}
            </button>
          ))}
        </div>
      )}

      <div className="count" id="pirivuCount">{filtered.length} / {pirivuRecords.length} പിരിവുകാർ</div>

      {/* RESULTS */}
      <div id="pirivuResults">
        {filtered.length === 0
          ? <div className="empty">ഇതുവരെ ആരെയും ചേർത്തിട്ടില്ല.</div>
          : filtered.map(r => (
              <PirivuCard key={r.id} r={r} onEdit={startEdit} onDelete={handleDelete} onReceipt={handleReceipt} />
            ))
        }
      </div>

      <div className="btn-row" style={{ margin: '10px 0' }}>
        <button id="pirivuExportBtn" className="btn gold" onClick={() => exportPirivu(pirivuRecords)}>⬇ എക്സലിലേക്ക് എക്സ്പോർട്ട് ചെയ്യുക</button>
      </div>
    </div>
  );
}
