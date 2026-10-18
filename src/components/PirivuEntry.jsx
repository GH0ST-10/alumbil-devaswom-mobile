import { useState, useEffect, useRef } from 'react';
import { genId, saveLS, LS_PIRIVU, LS_LEDGER, syncPirivuToLedger, statusOf, STATUS_META, fmt } from '../utils';
import { savePirivuRecord } from '../services/db';
import { IconUserPlus, IconPencil, IconPlus, IconCheck, IconSearch, IconArrowRight } from './Icons';

const EMPTY_FORM = {
  name: '',
  house: '',
  receiptno: '',
  phone: '',
  date: new Date().toISOString().slice(0, 10),
  receipt: '',
  paid: '',
  occasion: '',
  remarks: ''
};

function distinctOccasions(records) {
  return [...new Set(records.map(r => r.occasion).filter(Boolean))].sort();
}

export default function PirivuEntry({
  pirivuRecords,
  setPirivuRecords,
  ledgerRecords,
  setLedgerRecords,
  editingPerson,
  onClearEditing,
  onGoToSearch,
  isAdmin,
  onRequestUnlock
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const formRef = useRef(null);

  useEffect(() => {
    if (editingPerson) {
      setForm({
        name: editingPerson.name || '',
        house: editingPerson.house || '',
        receiptno: editingPerson.receiptno || '',
        phone: editingPerson.phone || '',
        date: editingPerson.date || '',
        receipt: editingPerson.receipt != null ? String(editingPerson.receipt) : '',
        paid: editingPerson.paid != null ? String(editingPerson.paid) : '',
        occasion: editingPerson.occasion || '',
        remarks: editingPerson.remarks || ''
      });
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [editingPerson]);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = e => {
    e.preventDefault();
    if (!form.name.trim()) return alert('പേര് നൽകുക');
    if (form.receipt === '' && form.paid === '') return alert('രസീത് തുകയോ നൽകിയ തുകയോ നൽകുക');

    const proceed = () => {
      const id = editingPerson ? editingPerson.id : genId();
      const rec = {
        id,
        name: form.name.trim(),
        house: form.house.trim(),
        receiptno: form.receiptno.trim(),
        phone: form.phone.trim(),
        date: form.date,
        receipt: form.receipt !== '' ? Number(form.receipt) : 0,
        paid: form.paid !== '' ? Number(form.paid) : 0,
        occasion: form.occasion.trim(),
        remarks: form.remarks.trim()
      };

      let newPirivu;
      if (editingPerson) {
        newPirivu = pirivuRecords.map(r => (r.id === id ? rec : r));
      } else {
        newPirivu = [rec, ...pirivuRecords];
      }
      saveLS(LS_PIRIVU, newPirivu);
      setPirivuRecords(newPirivu);

      const newLedger = syncPirivuToLedger(id, rec, ledgerRecords);
      saveLS(LS_LEDGER, newLedger);
      setLedgerRecords(newLedger);

      // Save to Firebase Firestore (instant offline caching + cloud sync)
      savePirivuRecord(rec, ledgerRecords).catch(err => {
        console.warn('Firestore offline/notice:', err);
      });

      setForm(EMPTY_FORM);
      if (onClearEditing) onClearEditing();
    };

    if (!isAdmin && onRequestUnlock) {
      return onRequestUnlock(proceed);
    }
    proceed();
  };

  const handleCancel = () => {
    setForm(EMPTY_FORM);
    if (onClearEditing) onClearEditing();
  };

  const occasions = distinctOccasions(pirivuRecords);
  const recentRecords = pirivuRecords.slice(0, 4);

  return (
    <div className="page-entry">
      {/* ADD / EDIT FORM */}
      <div className="panel" ref={formRef}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {editingPerson ? (
              <>
                <IconPencil size={18} />
                <span>വിവരങ്ങൾ തിരുത്തുക</span>
              </>
            ) : (
              <>
                <IconUserPlus size={19} />
                <span>പുതിയ പിരിവുകാരനെ ചേർക്കുക</span>
              </>
            )}
          </h2>
          {editingPerson && (
            <button type="button" className="btn-text cancel" onClick={handleCancel}>
              റദ്ദാക്കുക
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid">
            <div>
              <label>പേര് *</label>
              <input
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="ഉദാ: രാമൻ നായർ"
                required
              />
            </div>
            <div>
              <label>വീട് / വിലാസം</label>
              <input
                name="house"
                type="text"
                value={form.house}
                onChange={handleChange}
                placeholder="ഉദാ: വടക്കേതിൽ"
              />
            </div>
          </div>

          <div className="grid">
            <div>
              <label>രസീത് നമ്പർ</label>
              <input
                name="receiptno"
                type="text"
                value={form.receiptno}
                onChange={handleChange}
                placeholder="ഉദാ: 104"
              />
            </div>
            <div>
              <label>ഫോൺ നമ്പർ</label>
              <input
                name="phone"
                type="text"
                value={form.phone}
                onChange={handleChange}
                placeholder="10 അക്ക നമ്പർ"
              />
            </div>
          </div>

          <div className="grid">
            <div>
              <label>തീയതി</label>
              <input
                name="date"
                type="date"
                value={form.date}
                onChange={handleChange}
              />
            </div>
            <div>
              <label>ഉത്സവം / കാരണം</label>
              <input
                name="occasion"
                list="occListEntry"
                type="text"
                value={form.occasion}
                onChange={handleChange}
                placeholder="ഉത്സവം 2026"
              />
              <datalist id="occListEntry">
                {occasions.map(o => (
                  <option key={o} value={o} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid">
            <div>
              <label>രസീത് തുക (₹)</label>
              <input
                name="receipt"
                type="number"
                value={form.receipt}
                onChange={handleChange}
                placeholder="0"
                min="0"
              />
            </div>
            <div>
              <label>ലഭിച്ച തുക (₹)</label>
              <input
                name="paid"
                type="number"
                value={form.paid}
                onChange={handleChange}
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          <div>
            <label>കുറിപ്പ് (ഓപ്ഷണൽ)</label>
            <input
              name="remarks"
              type="text"
              value={form.remarks}
              onChange={handleChange}
              placeholder="മറ്റ് വിവരങ്ങൾ..."
            />
          </div>

          <div className="btn-row" style={{ marginTop: 10 }}>
            <button type="submit" className="btn" style={{ flex: 1 }}>
              {editingPerson ? (
                <>
                  <IconCheck size={18} />
                  <span>അപ്ഡേറ്റ് ചെയ്യുക</span>
                </>
              ) : (
                <>
                  <IconPlus size={18} />
                  <span>പിരിവ് ചേർക്കുക</span>
                </>
              )}
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={onGoToSearch}
              style={{ flex: 1 }}
            >
              <IconSearch size={16} />
              <span>ആളുകളെ തിരയുക ({pirivuRecords.length})</span>
            </button>
          </div>
        </form>
      </div>

      {/* RECENT ENTRIES PREVIEW */}
      {recentRecords.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--muted)' }}>
              സമീപകാല എൻട്രികൾ (RECENT)
            </div>
            <button className="btn-text" onClick={onGoToSearch} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span>എല്ലാം കാണുക</span>
              <IconArrowRight size={13} />
            </button>
          </div>

          {recentRecords.map(r => {
            const st = statusOf(r);
            const meta = STATUS_META[st];
            const receipt = Number(r.receipt) || 0;
            const paid = Number(r.paid) || 0;
            return (
              <div key={r.id} className="card-mini">
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{r.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                    {r.house || r.date} {r.receiptno ? `· #${r.receiptno}` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, color: 'var(--maroon)', fontSize: 14.5 }}>
                    {fmt(paid || receipt)}
                  </div>
                  <span className="badge" style={{ background: meta.bg, color: meta.fg, fontSize: 9.5 }}>
                    {meta.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
