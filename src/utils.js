/* ============ STORAGE HELPERS ============ */
export const LS_PIRIVU = 'alumbil_devaswom_panapirivu_v1';
export const LS_LEDGER = 'alumbil_devaswom_ledger_v1';

export function loadLS(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
export function saveLS(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

/* ============ FORMATTING ============ */
export function fmt(n) {
  return '₹' + (Number(n) || 0).toLocaleString('en-IN');
}

export function genId() {
  return Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

/* ============ PIRIVU STATUS ============ */
export function statusOf(r) {
  const receipt = Number(r.receipt) || 0, paid = Number(r.paid) || 0;
  if (receipt <= 0) return 'unknown';
  if (paid >= receipt) return 'full';
  if (paid > 0) return 'partial';
  return 'unpaid';
}

export const STATUS_META = {
  full:    { label: 'പൂർണമായി അടച്ചു', bg: 'var(--green-bg)', fg: 'var(--green)' },
  partial: { label: 'ഭാഗികം',           bg: 'var(--amber-bg)', fg: 'var(--amber)' },
  unpaid:  { label: 'അടച്ചിട്ടില്ല',      bg: 'var(--red-bg)',   fg: 'var(--red)' },
  unknown: { label: '—',                bg: 'var(--gold-bg)',  fg: 'var(--gold)' },
};

export const EXPENSE_CATEGORIES = [
  'വൈദ്യുതി', 'അറ്റകുറ്റപ്പണി', 'പൂജാദ്രവ്യങ്ങൾ',
  'ഉത്സവച്ചെലവ്', 'ശമ്പളം', 'ഭക്ഷണം/സദ്യ', 'മറ്റുള്ളവ'
];

/* ============ SYNC PIRIVU → LEDGER ============ */
export function syncPirivuToLedger(pirivuId, rec, ledgerRecords) {
  const linkedId = 'pirivu_' + pirivuId;
  const paid = Number(rec.paid) || 0;
  const filtered = ledgerRecords.filter(r => r.id !== linkedId);
  if (paid > 0) {
    filtered.push({
      id: linkedId,
      type: 'income',
      date: rec.date,
      amount: paid,
      desc: 'പണപ്പിരിവ്: ' + rec.name,
      linkedPirivu: true,
      pirivuId,
    });
  }
  return filtered;
}

/* ============ WA LINK ============ */
export function waLinkFor(phone, text) {
  const digits = (phone || '').replace(/\D/g, '');
  const intl = digits.length === 10 ? '91' + digits : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/* ============ MALAYALAM DATES & MONTHS ============ */
export const ML_MONTHS = [
  'ജനുവരി', 'ഫെബ്രുവരി', 'മാർച്ച്', 'ഏപ്രിൽ', 'മെയ്', 'ജൂൺ',
  'ജൂലൈ', 'ഓഗസ്റ്റ്', 'സെപ്റ്റംബർ', 'ഒക്ടോബർ', 'നവംബർ', 'ഡിസംബർ'
];

export function formatMLMonth(ymStr) {
  if (!ymStr) return '';
  const parts = ymStr.split('-');
  if (parts.length < 2) return ymStr;
  const y = parts[0];
  const m = parseInt(parts[1], 10);
  const name = ML_MONTHS[m - 1] || parts[1];
  return `${name} ${y}`;
}

export function formatDisplayDate(dateStr) {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function getDistinctMonths(pirivu = [], ledger = []) {
  const set = new Set();
  pirivu.forEach(r => {
    if (r.date && r.date.length >= 7) set.add(r.date.slice(0, 7));
  });
  ledger.forEach(r => {
    if (r.date && r.date.length >= 7) set.add(r.date.slice(0, 7));
  });
  if (set.size === 0) {
    set.add(new Date().toISOString().slice(0, 7));
  }
  return Array.from(set).sort().reverse();
}

export function getDistinctYears(pirivu = [], ledger = []) {
  const set = new Set();
  pirivu.forEach(r => {
    if (r.date && r.date.length >= 4) set.add(r.date.slice(0, 4));
  });
  ledger.forEach(r => {
    if (r.date && r.date.length >= 4) set.add(r.date.slice(0, 4));
  });
  if (set.size === 0) {
    set.add(String(new Date().getFullYear()));
  }
  return Array.from(set).sort().reverse();
}

