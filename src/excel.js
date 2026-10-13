import * as XLSX from 'xlsx';
import { STATUS_META, statusOf, fmt } from './utils';
import { shareOrSaveFile } from './nativeShare';

async function promptSaveOrShare(blob, filename, mimeType, description) {
  return shareOrSaveFile({
    blob,
    filename,
    mimeType,
    title: 'ആലുമ്പിൽ ദേവസ്ഥാനം - എക്സൽ കണക്ക്',
    text: 'ആലുമ്പിൽ ദേവസ്ഥാനം കണക്ക് എക്സൽ ഫയൽ'
  });
}

export function buildCompleteWorkbook(pirivuRecords = [], ledgerRecords = []) {
  const wb = XLSX.utils.book_new();

  // ====== TAB 1: പണപ്പിരിവ് (PIRIVU) ======
  const pirivuAoa = [['പേര്', 'വീട്/വിലാസം', 'രസീത് നമ്പർ', 'ഫോൺ', 'തീയതി', 'ഉത്സവം/കാരണം', 'രസീത് തുക', 'ലഭിച്ച തുക', 'ബാക്കി', 'നില', 'കുറിപ്പ്']];
  pirivuRecords.forEach(r => {
    const receipt = Number(r.receipt) || 0, paid = Number(r.paid) || 0;
    pirivuAoa.push([
      r.name || '',
      r.house || '',
      r.receiptno || '',
      r.phone || '',
      r.date || '',
      r.occasion || '',
      receipt,
      paid,
      receipt - paid,
      STATUS_META[statusOf(r)] ? STATUS_META[statusOf(r)].label : '',
      r.remarks || ''
    ]);
  });
  const wsPirivu = XLSX.utils.aoa_to_sheet(pirivuAoa);
  wsPirivu['!cols'] = [
    { wch: 22 }, { wch: 20 }, { wch: 12 }, { wch: 14 },
    { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 14 },
    { wch: 12 }, { wch: 14 }, { wch: 22 }
  ];
  XLSX.utils.book_append_sheet(wb, wsPirivu, 'പണപ്പിരിവ്');

  // ====== TAB 2: വരവ്-ചെലവ് (LEDGER) ======
  const ledgerAoa = [['തീയതി', 'തരം', 'ഇനം', 'വിവരണം', 'തുക']];
  const sortedLedger = [...ledgerRecords].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  let bal = 0;
  sortedLedger.forEach(r => {
    const amt = Number(r.amount) || 0;
    bal += r.type === 'income' ? amt : -amt;
    ledgerAoa.push([r.date || '', r.type === 'income' ? 'വരവ്' : 'ചെലവ്', r.category || '', r.desc || '', amt]);
  });
  ledgerAoa.push(['', '', '', 'ബാക്കി', bal]);
  const wsLedger = XLSX.utils.aoa_to_sheet(ledgerAoa);
  wsLedger['!cols'] = [{ wch: 13 }, { wch: 11 }, { wch: 18 }, { wch: 30 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsLedger, 'വരവ്-ചെലവ്');

  // ====== TAB 3: കണക്ക് സംഗ്രഹം (SUMMARY) ======
  const totalPirivuReceipt = pirivuRecords.reduce((s, r) => s + (Number(r.receipt) || 0), 0);
  const totalPirivuPaid    = pirivuRecords.reduce((s, r) => s + (Number(r.paid) || 0), 0);
  const totalPirivuPending = totalPirivuReceipt - totalPirivuPaid;
  const totalIncome        = ledgerRecords.filter(r => r.type === 'income').reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const totalExpense       = ledgerRecords.filter(r => r.type === 'expense').reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const netBalance         = totalIncome - totalExpense;

  const summaryAoa = [
    ['ആലുമ്പിൽ ദേവസ്ഥാനം — കണക്ക് സംഗ്രഹം'],
    ['തീയതി', new Date().toLocaleDateString('en-IN')],
    [],
    ['ഇനം', 'തുക (₹)'],
    ['ആകെ പണപ്പിരിവ് രസീത് തുക', totalPirivuReceipt],
    ['പണപ്പിരിവിൽ നിന്ന് ലഭിച്ചത്', totalPirivuPaid],
    ['പണപ്പിരിവ് ഇനി ലഭിക്കാനുള്ളത്', totalPirivuPending],
    [],
    ['ലെഡ്ജർ ആകെ വരവ്', totalIncome],
    ['ലെഡ്ജർ ആകെ ചെലവ്', totalExpense],
    ['കൈവശമുള്ള ബാക്കി തുക', netBalance]
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
  wsSummary['!cols'] = [{ wch: 32 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'കണക്ക് സംഗ്രഹം');

  return wb;
}

export async function exportPirivu(pirivuRecords, ledgerRecords = []) {
  const wb = buildCompleteWorkbook(pirivuRecords, ledgerRecords);
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  return promptSaveOrShare(blob, 'Alumbil_Devaswom_Panapirivu.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Excel Workbook (*.xlsx)');
}

export async function exportLedger(ledgerRecords, pirivuRecords = []) {
  const wb = buildCompleteWorkbook(pirivuRecords, ledgerRecords);
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  return promptSaveOrShare(blob, 'Alumbil_Devaswom_Varavu_Chelavu.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Excel Workbook (*.xlsx)');
}
