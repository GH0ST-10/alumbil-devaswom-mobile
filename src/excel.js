import * as XLSX from 'xlsx';
import { STATUS_META, statusOf } from './utils';

export function exportPirivu(pirivuRecords) {
  const aoa = [['പേര്', 'വീട്/വിലാസം', 'രസീത് നമ്പർ', 'ഫോൺ', 'തീയതി', 'ഉത്സവം/കാരണം', 'രസീത് തുക', 'ലഭിച്ച തുക', 'ബാക്കി', 'നില', 'കുറിപ്പ്']];
  pirivuRecords.forEach(r => {
    const receipt = Number(r.receipt) || 0, paid = Number(r.paid) || 0;
    aoa.push([r.name, r.house, r.receiptno, r.phone, r.date, r.occasion, receipt, paid, receipt - paid, STATUS_META[statusOf(r)].label, r.remarks]);
  });
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 22 }, { wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 20 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'പണപ്പിരിവ്');
  XLSX.writeFile(wb, 'Alumbil_Devaswom_Panapirivu.xlsx');
}

export function exportLedger(ledgerRecords) {
  const aoa = [['തീയതി', 'തരം', 'ഇനം', 'വിവരണം', 'തുക']];
  const sorted = [...ledgerRecords].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  let bal = 0;
  sorted.forEach(r => {
    const amt = Number(r.amount) || 0;
    bal += r.type === 'income' ? amt : -amt;
    aoa.push([r.date, r.type === 'income' ? 'വരവ്' : 'ചെലവ്', r.category || '', r.desc, amt]);
  });
  aoa.push(['', '', '', 'ബാക്കി', bal]);
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 28 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'വരവ്-ചെലവ്');
  XLSX.writeFile(wb, 'Alumbil_Devaswom_Varavu_Chelavu.xlsx');
}
