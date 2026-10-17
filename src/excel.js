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

export async function exportCustomReport({
  periodTitle = 'സാമ്പത്തിക റിപ്പോർട്ട്',
  incomeList = [],
  expenseList = [],
  totalIncome = 0,
  totalExpense = 0,
  netBalance = 0,
  monthlySummary = []
}) {
  const wb = XLSX.utils.book_new();

  // 1. സംഗ്രഹം
  const summaryAoa = [
    ['ആലുമ്പിൽ ദേവസ്ഥാനം — സാമ്പത്തിക റിപ്പോർട്ട്'],
    ['കാലയളവ്', periodTitle],
    ['റിപ്പോർട്ട് തീയതി', new Date().toLocaleDateString('en-IN')],
    [],
    ['ഇനം', 'വിവരം / തുക (₹)'],
    ['ആകെ വരവ്', totalIncome],
    ['ആകെ ചെലവ്', totalExpense],
    ['കൈവശമുള്ള ബാക്കി', netBalance],
    ['പൈസ തന്നവരുടെ എണ്ണം (വരവ്)', incomeList.length],
    ['ചെലവ് ഇടപാടുകളുടെ എണ്ണം', expenseList.length]
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'സംഗ്രഹം');

  // 2. വരവ് - ആരൊക്കെ പൈസ തന്നു
  const incomeAoa = [['പേര്', 'വീട്/വിലാസം', 'രസീത് നമ്പർ', 'ഫോൺ', 'തീയതി', 'ഉത്സവം/ഇനം', 'ലഭിച്ച തുക']];
  incomeList.forEach(r => {
    incomeAoa.push([
      r.name || r.desc || '',
      r.house || '',
      r.receiptno || '',
      r.phone || '',
      r.date || '',
      r.occasion || r.category || 'പണപ്പിരിവ്',
      Number(r.amount || r.paid) || 0
    ]);
  });
  incomeAoa.push(['', '', '', '', '', 'ആകെ വരവ്', totalIncome]);
  const wsIncome = XLSX.utils.aoa_to_sheet(incomeAoa);
  wsIncome['!cols'] = [{ wch: 22 }, { wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsIncome, 'വരവ് - പൈസ തന്നവർ');

  // 3. ചെലവുകൾ - എന്തിനൊക്കെ ചെലവാക്കി
  const expenseAoa = [['തീയതി', 'ഇനം (Category)', 'വിവരണം', 'തുക']];
  expenseList.forEach(r => {
    expenseAoa.push([
      r.date || '',
      r.category || '',
      r.desc || '',
      Number(r.amount) || 0
    ]);
  });
  expenseAoa.push(['', '', 'ആകെ ചെലവ്', totalExpense]);
  const wsExpense = XLSX.utils.aoa_to_sheet(expenseAoa);
  wsExpense['!cols'] = [{ wch: 13 }, { wch: 18 }, { wch: 32 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsExpense, 'ചെലവുകൾ');

  // 4. മാസ തിരിച്ചുള്ള കണക്ക് (If present)
  if (monthlySummary && monthlySummary.length > 0) {
    const monthAoa = [['മാസം', 'വരവ്', 'ചെലവ്', 'നീക്കിയിരിപ്പ് / ബാക്കി']];
    monthlySummary.forEach(m => {
      monthAoa.push([m.monthLabel, m.income, m.expense, m.balance]);
    });
    const wsMonth = XLSX.utils.aoa_to_sheet(monthAoa);
    wsMonth['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsMonth, 'മാസ കണക്ക്');
  }

  const cleanTitle = periodTitle.replace(/[^\w\d\u0D00-\u0D7F]/g, '_').slice(0, 30);
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  return promptSaveOrShare(blob, `Alumbil_Devaswom_Report_${cleanTitle}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Excel Workbook (*.xlsx)');
}

