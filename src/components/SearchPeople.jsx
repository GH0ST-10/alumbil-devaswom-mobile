import { useState } from 'react';
import { statusOf, STATUS_META, fmt, syncPirivuToLedger, saveLS, LS_PIRIVU, LS_LEDGER } from '../utils';
import { shareReceipt } from '../pdf';
import { exportPirivu } from '../excel';
import { IconSearch, IconPencil, IconTrash, IconShare, IconSpinner, IconUserPlus, IconFileSpreadsheet } from './Icons';

function distinctOccasions(records) {
  return [...new Set(records.map(r => r.occasion).filter(Boolean))].sort();
}

export default function SearchPeople({
  pirivuRecords,
  setPirivuRecords,
  ledgerRecords,
  setLedgerRecords,
  onEditPerson,
  onGoToEntry
}) {
  const [search, setSearch] = useState('');
  const [statusChip, setStatusChip] = useState('all');
  const [occChip, setOccChip] = useState('all');
  const [sharingId, setSharingId] = useState(null);

  const occasions = distinctOccasions(pirivuRecords);

  const handleDelete = id => {
    if (!confirm('ഈ എൻട്രി ഡിലീറ്റ് ചെയ്യണോ?')) return;
    const newPirivu = pirivuRecords.filter(r => r.id !== id);
    saveLS(LS_PIRIVU, newPirivu);
    setPirivuRecords(newPirivu);
    const newLedger = ledgerRecords.filter(r => r.id !== 'pirivu_' + id);
    saveLS(LS_LEDGER, newLedger);
    setLedgerRecords(newLedger);
  };

  const handleReceipt = async r => {
    setSharingId(r.id);
    try {
      await shareReceipt(r);
    } catch {
      alert('രസീത് ഷെയർ ചെയ്യാൻ കഴിഞ്ഞില്ല.');
    } finally {
      setSharingId(null);
    }
  };

  const filtered = pirivuRecords.filter(r => {
    if (occChip !== 'all' && (r.occasion || '') !== occChip) return false;
    if (statusChip !== 'all' && statusOf(r) !== statusChip) return false;
    if (search.trim()) {
      const hay = [r.name, r.house, r.receiptno, r.phone, r.occasion, r.remarks].join(' ').toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const STATUS_CHIPS = [
    ['all', 'എല്ലാം'],
    ['full', 'പൂർണമായി അടച്ചു'],
    ['partial', 'ഭാഗികം'],
    ['unpaid', 'അടയ്ക്കാത്തവർ']
  ];

  return (
    <div className="page-search">
      {/* SEARCH HEADER */}
      <div className="searchbar">
        <IconSearch size={18} style={{ color: 'var(--text3)', flexShrink: 0 }} />
        <input
          id="pirivuSearch"
          type="text"
          placeholder="പേര്, വീട്, രസീത് നമ്പർ, ഫോൺ തിരയുക..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoComplete="off"
        />
      </div>

      {/* STATUS CHIPS */}
      <div className="chips">
        {STATUS_CHIPS.map(([val, lbl]) => (
          <button
            key={val}
            className={'chip' + (statusChip === val ? ' active' : '')}
            onClick={() => setStatusChip(val)}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* OCCASION CHIPS */}
      {occasions.length > 0 && (
        <div className="chips" style={{ marginTop: -4 }}>
          <button
            className={'chip' + (occChip === 'all' ? ' active' : '')}
            onClick={() => setOccChip('all')}
          >
            എല്ലാ ഉത്സവങ്ങളും
          </button>
          {occasions.map(occ => (
            <button
              key={occ}
              className={'chip' + (occChip === occ ? ' active' : '')}
              onClick={() => setOccChip(occ)}
            >
              {occ}
            </button>
          ))}
        </div>
      )}

      {/* COUNT & EXPORT */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 2px 12px' }}>
        <div className="count">
          കണ്ടെത്തിയവർ: <b>{filtered.length}</b> / {pirivuRecords.length}
        </div>
        <button
          className="btn-text"
          onClick={() => exportPirivu(pirivuRecords, ledgerRecords)}
          title="എക്സൽ ഫയലിൽ ഫോൾഡർ തിരഞ്ഞെടുത്ത് സേവ് ചെയ്യുക"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <IconFileSpreadsheet size={16} />
          <span>എക്സൽ എക്സ്പോർട്ട്</span>
        </button>
      </div>

      {/* CARDS LIST */}
      <div className="cards-list">
        {filtered.length === 0 ? (
          <div className="empty-box">
            <div style={{ color: 'var(--muted)', marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
              <IconSearch size={36} />
            </div>
            <div>ആളുകളെ ആരെയും കണ്ടെത്തിയില്ല</div>
            <button className="btn secondary" style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={onGoToEntry}>
              <IconUserPlus size={16} />
              <span>പുതിയ ആളുകളെ ചേർക്കുക</span>
            </button>
          </div>
        ) : (
          filtered.map(r => {
            const st = statusOf(r);
            const meta = STATUS_META[st];
            const receipt = Number(r.receipt) || 0;
            const paid = Number(r.paid) || 0;
            const pct = receipt > 0 ? Math.min(100, Math.round((paid / receipt) * 100)) : 0;
            const subParts = [r.house, r.receiptno ? 'രസീത് #' + r.receiptno : '', r.phone, r.date, r.occasion].filter(Boolean);

            return (
              <div key={r.id} className="card">
                <div className="card-top">
                  <div>
                    <div className="card-name">{r.name}</div>
                    <div className="card-sub">{subParts.join(' · ')}</div>
                  </div>
                  <div className="badge" style={{ background: meta.bg, color: meta.fg }}>
                    {meta.label}
                  </div>
                </div>

                <div className="amounts">
                  <div>
                    രസീത് തുക<b>{fmt(receipt)}</b>
                  </div>
                  <div>
                    ലഭിച്ചത്<b>{fmt(paid)}</b>
                  </div>
                  <div>
                    ബാക്കി<b>{fmt(receipt - paid)}</b>
                  </div>
                </div>

                <div className="progress">
                  <div className="progress-fill" style={{ width: pct + '%' }} />
                </div>

                {r.remarks && <div className="card-sub" style={{ marginTop: 8 }}>{r.remarks}</div>}

                <div className="card-actions">
                  <button onClick={() => onEditPerson(r)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <IconPencil size={13} />
                    <span>എഡിറ്റ്</span>
                  </button>
                  <button onClick={() => handleDelete(r.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <IconTrash size={13} />
                    <span>ഡിലീറ്റ്</span>
                  </button>
                  {paid > 0 && (
                    <button
                      className="btn-receipt-share"
                      disabled={sharingId === r.id}
                      onClick={() => handleReceipt(r)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      {sharingId === r.id ? (
                        <>
                          <IconSpinner size={14} />
                          <span>തയ്യാറാക്കുന്നു...</span>
                        </>
                      ) : (
                        <>
                          <IconShare size={14} />
                          <span>രസീത് ഇമേജ് ഷെയർ ചെയ്യുക</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
