import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { fmt, downloadBlob, waLinkFor } from './utils';

/* ====== RECEIPT HTML ====== */
function buildReceiptHTML(r) {
  const paid = Number(r.paid) || 0;
  const target = Number(r.receipt) || 0;
  const balance = target - paid;

  const esc = s => String(s || '').replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

  return `
  <div style="width:390px;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Noto Sans Malayalam','Inter',sans-serif;border-radius:18px;overflow:hidden;box-shadow:0 12px 36px rgba(0,0,0,0.12);border:1px solid #ecdfca;color:#1c1917;">
    <div style="background:linear-gradient(135deg,#7a1f2b 0%,#9c2b3a 60%,#b8860b 140%);padding:22px 20px;color:#fff;display:flex;align-items:center;gap:14px;">
      <img src="/icon.png" style="width:48px;height:48px;border-radius:12px;border:1.5px solid rgba(255,255,255,0.4);object-fit:cover;" />
      <div>
        <div style="font-weight:800;font-size:19px;letter-spacing:-0.2px;">ആലുമ്പിൽ ദേവസ്ഥാനം</div>
        <div style="font-size:12.5px;opacity:0.9;margin-top:2px;">${r.occasion ? esc(r.occasion) : 'പണപ്പിരിവ് രസീത്'}</div>
      </div>
    </div>
    <div style="padding:22px 20px;">
      <div style="text-align:center;font-weight:800;color:#7a1f2b;font-size:14px;margin-bottom:16px;letter-spacing:0.08em;text-transform:uppercase;">പണപ്പിരിവ് രസീത്</div>
      <table style="width:100%;font-size:13.5px;border-collapse:collapse;">
        <tr><td style="color:#78716c;padding:5px 0;width:110px;">രസീത് നമ്പർ</td><td style="color:#1c1917;font-weight:700;">${esc(r.receiptno || '—')}</td></tr>
        <tr><td style="color:#78716c;padding:5px 0;">തീയതി</td><td style="color:#1c1917;font-weight:600;">${esc(r.date || '—')}</td></tr>
        <tr><td style="color:#78716c;padding:5px 0;">പേര്</td><td style="color:#1c1917;font-weight:700;font-size:14.5px;">${esc(r.name || '—')}</td></tr>
        ${r.house ? `<tr><td style="color:#78716c;padding:5px 0;">വീട്/വിലാസം</td><td style="color:#1c1917;font-weight:600;">${esc(r.house)}</td></tr>` : ''}
        ${r.phone ? `<tr><td style="color:#78716c;padding:5px 0;">ഫോൺ</td><td style="color:#1c1917;font-weight:600;">${esc(r.phone)}</td></tr>` : ''}
      </table>
      <div style="border-top:1.5px dashed #e7e2d9;margin:16px 0;"></div>
      <div style="background:#fdf6e7;border:1px solid #f9e7be;border-radius:12px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;">
        <div style="color:#78716c;font-size:13px;font-weight:600;">ലഭിച്ച തുക</div>
        <div style="color:#7a1f2b;font-size:24px;font-weight:800;">${fmt(paid)}</div>
      </div>
      <div style="margin-top:10px;font-size:12.5px;">
        ${target > paid
          ? `<div style="color:#b45309;font-weight:600;">രസീത് തുക: ${fmt(target)} &nbsp;·&nbsp; ബാക്കി: ${fmt(balance)}</div>`
          : `<div style="color:#15803d;font-weight:700;">✅ പൂർണമായി അടച്ചു</div>`}
      </div>
      ${r.remarks ? `<div style="color:#78716c;font-size:12px;margin-top:12px;font-style:italic;">കുറിപ്പ്: ${esc(r.remarks)}</div>` : ''}
    </div>
    <div style="background:#f8f6f2;text-align:center;color:#78716c;font-size:11px;padding:12px 20px;border-top:1px solid #e7e2d9;">
      ആലുമ്പിൽ ദേവസ്ഥാനം കണക്ക് രജിസ്റ്ററിൽ നിന്ന് തയ്യാറാക്കിയത്
    </div>
  </div>`;
}

export async function makeReceiptImageBlob(r, scale = 3) {
  const holder = document.createElement('div');
  holder.style.position = 'fixed';
  holder.style.left = '-9999px';
  holder.style.top = '0';
  holder.innerHTML = buildReceiptHTML(r);
  document.body.appendChild(holder);

  // Wait for layout and image loading
  await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));

  const canvas = await html2canvas(holder.firstElementChild, {
    scale,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false
  });
  document.body.removeChild(holder);

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

import { directShareFile, shareOrSaveFile } from './nativeShare';

export async function shareReceipt(r) {
  const filename = 'Receipt_' + (r.name || 'contributor').replace(/\s+/g, '_') + '.png';
  const blob = await makeReceiptImageBlob(r, 3);
  if (!blob) return;

  const success = await directShareFile({
    blob,
    filename,
    mimeType: 'image/png',
    title: 'ആലുമ്പിൽ ദേവസ്ഥാനം - രസീത്',
    text: `നമസ്കാരം ${r.name || ''}, ആലുമ്പിൽ ദേവസ്ഥാനം പണപ്പിരിവ് രസീത് ഇതോടൊപ്പം അയക്കുന്നു 🙏`
  });

  // If on desktop and phone is available, offer quick WhatsApp link as well
  if (r.phone && !success) {
    const text = `നമസ്കാരം ${r.name}, നിങ്ങളുടെ പണപ്പിരിവ് രസീത് ഇമേജ് അയക്കുന്നു 🙏`;
    window.open(waLinkFor(r.phone, text), '_blank');
  }
}

/* ====== STATEMENT HTML ====== */
function buildStatementHTML(pirivuRecords, ledgerRecords) {
  const esc = s => String(s || '').replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  const statusOf = r => {
    const receipt = Number(r.receipt) || 0, paid = Number(r.paid) || 0;
    if (receipt <= 0) return 'unknown';
    if (paid >= receipt) return 'full';
    if (paid > 0) return 'partial';
    return 'unpaid';
  };

  const pirivuPledged   = pirivuRecords.reduce((s, r) => s + (Number(r.receipt) || 0), 0);
  const pirivuCollected = pirivuRecords.reduce((s, r) => s + (Number(r.paid) || 0), 0);
  const fullCount       = pirivuRecords.filter(r => statusOf(r) === 'full').length;
  const partialCount    = pirivuRecords.filter(r => statusOf(r) === 'partial').length;
  const unpaidCount     = pirivuRecords.filter(r => statusOf(r) === 'unpaid').length;

  const ledgerIncome    = ledgerRecords.filter(r => r.type === 'income').reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const ledgerExpense   = ledgerRecords.filter(r => r.type === 'expense').reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const balance         = ledgerIncome - ledgerExpense;

  const incomeByCategory = {};
  ledgerRecords.filter(r => r.type === 'income').forEach(r => {
    const cat = r.category || 'മറ്റുള്ളവ';
    incomeByCategory[cat] = (incomeByCategory[cat] || 0) + (Number(r.amount) || 0);
  });

  const expenseByCategory = {};
  ledgerRecords.filter(r => r.type === 'expense').forEach(r => {
    const cat = r.category || 'മറ്റുള്ളവ';
    expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (Number(r.amount) || 0);
  });

  const catRows = (cats, total) => Object.entries(cats).map(([c, a]) => `
    <tr>
      <td style="padding:6px 0;color:#2a1d12;">${esc(c)}</td>
      <td style="padding:6px 0;text-align:right;font-weight:600;color:#2a1d12;">${fmt(a)}</td>
      <td style="padding:6px 0;text-align:right;color:#8a7a68;font-size:11px;width:55px;">${total > 0 ? Math.round(a / total * 100) : 0}%</td>
    </tr>
  `).join('');

  return `
  <div style="width:680px;background:#fffdf9;font-family:'Noto Sans Malayalam','Inter',sans-serif;color:#2a1d12;padding:32px 36px;">
    <div style="text-align:center;border-bottom:2px solid #7a1f2b;padding-bottom:14px;margin-bottom:22px;">
      <div style="font-size:24px;font-weight:800;color:#7a1f2b;">ആലുമ്പിൽ ദേവസ്ഥാനം</div>
      <div style="font-size:14px;font-weight:700;color:#5c1620;margin-top:4px;">സാമ്പത്തിക സ്റ്റേറ്റ്മെന്റ് (യോഗം)</div>
      <div style="font-size:11.5px;color:#8a7a68;margin-top:4px;">തയ്യാറാക്കിയത്: ${today}</div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:22px;">
      <div style="background:#fff;border:1px solid #ecdfca;border-radius:10px;padding:12px 14px;">
        <div style="font-size:11px;color:#8a7a68;font-weight:600;">ആകെ പിരിവ് രസീത്</div>
        <div style="font-size:18px;font-weight:800;color:#7a1f2b;margin-top:2px;">${fmt(pirivuPledged)}</div>
        <div style="font-size:10.5px;color:#8a7a68;margin-top:3px;">ലഭിച്ചത്: ${fmt(pirivuCollected)} (${pirivuPledged > 0 ? Math.round(pirivuCollected / pirivuPledged * 100) : 0}%)</div>
      </div>
      <div style="background:#fff;border:1px solid #ecdfca;border-radius:10px;padding:12px 14px;">
        <div style="font-size:11px;color:#8a7a68;font-weight:600;">കൈവശമുള്ള ബാക്കി</div>
        <div style="font-size:18px;font-weight:800;color:#1f9d55;margin-top:2px;">${fmt(balance)}</div>
        <div style="font-size:10.5px;color:#8a7a68;margin-top:3px;">വരവ്: ${fmt(ledgerIncome)} · ചെലവ്: ${fmt(ledgerExpense)}</div>
      </div>
    </div>

    <div style="font-size:13px;font-weight:700;color:#7a1f2b;margin-bottom:8px;">1. പണപ്പിരിവ് സംഗ്രഹം</div>
    <table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:18px;background:#fff;border:1px solid #ecdfca;">
      <tr style="background:#fbf0d9;font-weight:700;color:#5c1620;">
        <th style="padding:6px 10px;text-align:left;">വിഭാഗം</th>
        <th style="padding:6px 10px;text-align:center;">എണ്ണം</th>
        <th style="padding:6px 10px;text-align:right;">ശതമാനം</th>
      </tr>
      <tr><td style="padding:6px 10px;border-top:1px solid #ecdfca;">പൂർണമായി അടച്ചവർ</td><td style="padding:6px 10px;text-align:center;border-top:1px solid #ecdfca;">${fullCount}</td><td style="padding:6px 10px;text-align:right;border-top:1px solid #ecdfca;">${pirivuRecords.length > 0 ? Math.round(fullCount / pirivuRecords.length * 100) : 0}%</td></tr>
      <tr><td style="padding:6px 10px;border-top:1px solid #ecdfca;">ഭാഗികമായി അടച്ചവർ</td><td style="padding:6px 10px;text-align:center;border-top:1px solid #ecdfca;">${partialCount}</td><td style="padding:6px 10px;text-align:right;border-top:1px solid #ecdfca;">${pirivuRecords.length > 0 ? Math.round(partialCount / pirivuRecords.length * 100) : 0}%</td></tr>
      <tr><td style="padding:6px 10px;border-top:1px solid #ecdfca;">അടയ്ക്കാത്തവർ</td><td style="padding:6px 10px;text-align:center;border-top:1px solid #ecdfca;">${unpaidCount}</td><td style="padding:6px 10px;text-align:right;border-top:1px solid #ecdfca;">${pirivuRecords.length > 0 ? Math.round(unpaidCount / pirivuRecords.length * 100) : 0}%</td></tr>
      <tr style="font-weight:700;background:#fbf7f0;"><td style="padding:6px 10px;border-top:1px solid #ecdfca;">ആകെ അംഗങ്ങൾ</td><td style="padding:6px 10px;text-align:center;border-top:1px solid #ecdfca;">${pirivuRecords.length}</td><td style="padding:6px 10px;text-align:right;border-top:1px solid #ecdfca;">100%</td></tr>
    </table>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:22px;">
      <div>
        <div style="font-size:13px;font-weight:700;color:#1f9d55;margin-bottom:6px;">2. വരവ് — ഇനം തിരിച്ച്</div>
        <table style="width:100%;font-size:12px;border-collapse:collapse;">
          ${catRows(incomeByCategory, ledgerIncome)}
          <tr style="border-top:1.5px solid #ecdfca;font-weight:700;">
            <td style="padding:8px 0;">ആകെ വരവ്</td>
            <td style="padding:8px 0;text-align:right;color:#1f9d55;">${fmt(ledgerIncome)}</td>
            <td></td>
          </tr>
        </table>
      </div>
      <div>
        <div style="font-size:13px;font-weight:700;color:#c0392b;margin-bottom:6px;">3. ചെലവ് — ഇനം തിരിച്ച്</div>
        <table style="width:100%;font-size:12px;border-collapse:collapse;">
          ${catRows(expenseByCategory, ledgerExpense)}
          <tr style="border-top:1.5px solid #ecdfca;font-weight:700;">
            <td style="padding:8px 0;">ആകെ ചെലവ്</td>
            <td style="padding:8px 0;text-align:right;color:#c0392b;">${fmt(ledgerExpense)}</td>
            <td></td>
          </tr>
        </table>
      </div>
    </div>

    <div style="border-top:1px solid #ecdfca;padding-top:22px;margin-top:22px;display:flex;justify-content:space-between;color:#8a7a68;font-size:11px;">
      <div>പ്രസിഡന്റ്: ___________________</div>
      <div>സെക്രട്ടറി: ___________________</div>
      <div>ട്രഷറർ: ___________________</div>
    </div>
  </div>`;
}

async function renderHTMLToPDF(html, scale = 2) {
  const holder = document.createElement('div');
  holder.style.position = 'fixed';
  holder.style.left = '-9999px';
  holder.style.top = '0';
  holder.innerHTML = html;
  document.body.appendChild(holder);
  await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));

  const canvas = await html2canvas(holder.firstElementChild, { scale, backgroundColor: '#fffdf9', useCORS: true });
  document.body.removeChild(holder);

  const pxToMm = px => px * 0.264583;
  const wMm = pxToMm(canvas.width / scale);
  const hMm = pxToMm(canvas.height / scale);
  const doc = new jsPDF({ unit: 'mm', format: [wMm, hMm] });
  doc.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, wMm, hMm);
  return doc.output('blob');
}

export async function shareStatement(pirivuRecords, ledgerRecords) {
  const filename = 'Alumbil_Devaswom_Statement_' + new Date().toISOString().slice(0, 10) + '.pdf';
  const blob = await renderHTMLToPDF(buildStatementHTML(pirivuRecords, ledgerRecords), 2);
  return shareOrSaveFile({
    blob,
    filename,
    mimeType: 'application/pdf',
    title: 'ആലുമ്പിൽ ദേവസ്ഥാനം - സാമ്പത്തിക സ്റ്റേറ്റ്മെന്റ്',
    text: 'ആലുമ്പിൽ ദേവസ്ഥാനം യോഗത്തിനായുള്ള സാമ്പത്തിക സ്റ്റേറ്റ്മെന്റ്'
  });
}

/* ====== DETAILED FINANCIAL REPORT (MONTH / YEAR / DATE-WISE) ====== */
function buildDetailedReportHTML({
  periodTitle = 'വരവ് ചെലവ് കണക്ക് റിപ്പോർട്ട്',
  incomeList = [],
  expenseList = [],
  totalIncome = 0,
  totalExpense = 0,
  netBalance = 0,
  catExpenseSummary = []
}) {
  const esc = s => String(s || '').replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  const incomeRows = incomeList.map((r, i) => `
    <tr style="border-bottom:1px solid #f0e6d6;background:${i % 2 === 0 ? '#fff' : '#fcfaf6'};">
      <td style="padding:6px 8px;color:#8a7a68;font-size:11px;">${i + 1}</td>
      <td style="padding:6px 8px;font-weight:700;color:#2a1d12;">${esc(r.name || r.desc || '—')}</td>
      <td style="padding:6px 8px;color:#6b5d52;font-size:11.5px;">${esc(r.house || '—')}</td>
      <td style="padding:6px 8px;color:#8a7a68;font-size:11px;">${esc(r.receiptno || '—')}</td>
      <td style="padding:6px 8px;color:#8a7a68;font-size:11px;white-space:nowrap;">${esc(r.date || '—')}</td>
      <td style="padding:6px 8px;color:#7a1f2b;font-size:11.5px;">${esc(r.occasion || r.category || 'പണപ്പിരിവ്')}</td>
      <td style="padding:6px 8px;text-align:right;font-weight:700;color:#1f9d55;white-space:nowrap;">${fmt(r.amount || r.paid || 0)}</td>
    </tr>
  `).join('');

  const expenseRows = expenseList.map((r, i) => `
    <tr style="border-bottom:1px solid #f0e6d6;background:${i % 2 === 0 ? '#fff' : '#fcfaf6'};">
      <td style="padding:6px 8px;color:#8a7a68;font-size:11px;">${i + 1}</td>
      <td style="padding:6px 8px;color:#8a7a68;font-size:11px;white-space:nowrap;">${esc(r.date || '—')}</td>
      <td style="padding:6px 8px;font-weight:600;color:#7a1f2b;font-size:11.5px;">${esc(r.category || 'മറ്റുള്ളവ')}</td>
      <td style="padding:6px 8px;color:#2a1d12;font-weight:600;">${esc(r.desc || '—')}</td>
      <td style="padding:6px 8px;text-align:right;font-weight:700;color:#c0392b;white-space:nowrap;">${fmt(r.amount || 0)}</td>
    </tr>
  `).join('');

  const catRows = catExpenseSummary.map(c => `
    <tr>
      <td style="padding:5px 8px;color:#2a1d12;">${esc(c.category)}</td>
      <td style="padding:5px 8px;text-align:right;font-weight:700;color:#c0392b;">${fmt(c.amount)}</td>
      <td style="padding:5px 8px;text-align:right;color:#8a7a68;font-size:11px;width:55px;">${c.pct}%</td>
    </tr>
  `).join('');

  return `
  <div style="width:760px;background:#fffdf9;font-family:-apple-system,BlinkMacSystemFont,'Noto Sans Malayalam','Inter',sans-serif;color:#2a1d12;padding:34px 40px;">
    <!-- HEADER -->
    <div style="text-align:center;border-bottom:2.5px solid #7a1f2b;padding-bottom:16px;margin-bottom:22px;">
      <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:8px;">
        <img src="/icon.png" style="width:44px;height:44px;border-radius:10px;object-fit:cover;" />
        <div style="font-size:24px;font-weight:800;color:#7a1f2b;letter-spacing:-0.2px;">ആലുമ്പിൽ ദേവസ്ഥാനം</div>
      </div>
      <div style="font-size:16px;font-weight:700;color:#5c1620;margin-top:2px;">${esc(periodTitle)}</div>
      <div style="font-size:12px;color:#8a7a68;margin-top:4px;">തീയതി: ${today}</div>
    </div>

    <!-- SUMMARY KPI TILES -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:24px;">
      <div style="background:#ffffff;border:1.5px solid #d4edd9;border-radius:12px;padding:12px 14px;">
        <div style="font-size:11.5px;color:#15803d;font-weight:700;">ആകെ വരവ് (INCOME)</div>
        <div style="font-size:20px;font-weight:800;color:#15803d;margin-top:3px;">${fmt(totalIncome)}</div>
        <div style="font-size:11px;color:#8a7a68;margin-top:3px;">പൈസ തന്നവർ: ${incomeList.length}</div>
      </div>
      <div style="background:#ffffff;border:1.5px solid #fad2d2;border-radius:12px;padding:12px 14px;">
        <div style="font-size:11.5px;color:#b91c1c;font-weight:700;">ആകെ ചെലവ് (EXPENSE)</div>
        <div style="font-size:20px;font-weight:800;color:#b91c1c;margin-top:3px;">${fmt(totalExpense)}</div>
        <div style="font-size:11px;color:#8a7a68;margin-top:3px;">ഇടപാടുകൾ: ${expenseList.length}</div>
      </div>
      <div style="background:#ffffff;border:1.5px solid #ecdfca;border-radius:12px;padding:12px 14px;">
        <div style="font-size:11.5px;color:#b8860b;font-weight:700;">കൈവശമുള്ള ബാക്കി (BALANCE)</div>
        <div style="font-size:20px;font-weight:800;color:${netBalance >= 0 ? '#15803d' : '#b91c1c'};margin-top:3px;">${fmt(netBalance)}</div>
        <div style="font-size:11px;color:#8a7a68;margin-top:3px;">${netBalance >= 0 ? 'നീക്കിയിരിപ്പ് മിച്ചം' : 'കമ്മി'}</div>
      </div>
    </div>

    <!-- SECTION 1: INCOME / WHO GAVE MONEY -->
    <div style="margin-bottom:26px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="font-size:14px;font-weight:800;color:#15803d;display:flex;align-items:center;gap:6px;">
          <span>1. വരവ് — ആരൊക്കെ പൈസ തന്നു (${incomeList.length})</span>
        </div>
        <div style="font-size:13px;font-weight:800;color:#15803d;">ആകെ: ${fmt(totalIncome)}</div>
      </div>

      ${incomeList.length === 0 ? `
        <div style="padding:16px;text-align:center;background:#fff;border:1px dashed #ecdfca;border-radius:10px;color:#8a7a68;font-size:12px;">
          ഈ കാലയളവിൽ വരവുകളൊന്നും രേഖപ്പെടുത്തിയിട്ടില്ല
        </div>
      ` : `
        <table style="width:100%;font-size:12px;border-collapse:collapse;background:#fff;border:1px solid #ecdfca;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:#f5f0e6;font-weight:700;color:#5c1620;text-align:left;">
              <th style="padding:7px 8px;width:30px;">#</th>
              <th style="padding:7px 8px;">പേര്</th>
              <th style="padding:7px 8px;">വീട് / വിലാസം</th>
              <th style="padding:7px 8px;">രസീത് #</th>
              <th style="padding:7px 8px;">തീയതി</th>
              <th style="padding:7px 8px;">ഉത്സവം / വക</th>
              <th style="padding:7px 8px;text-align:right;">തുക (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${incomeRows}
          </tbody>
          <tfoot>
            <tr style="background:#fbf7f0;font-weight:800;border-top:1.5px solid #ecdfca;">
              <td colspan="6" style="padding:8px;text-align:right;">ആകെ ലഭിച്ച വരവ്:</td>
              <td style="padding:8px;text-align:right;color:#15803d;">${fmt(totalIncome)}</td>
            </tr>
          </tfoot>
        </table>
      `}
    </div>

    <!-- SECTION 2: EXPENSES / WHAT WAS SPENT ON -->
    <div style="margin-bottom:26px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="font-size:14px;font-weight:800;color:#b91c1c;display:flex;align-items:center;gap:6px;">
          <span>2. ചെലവ് — എന്തിനൊക്കെ ചെലവാക്കി (${expenseList.length})</span>
        </div>
        <div style="font-size:13px;font-weight:800;color:#b91c1c;">ആകെ: ${fmt(totalExpense)}</div>
      </div>

      ${expenseList.length === 0 ? `
        <div style="padding:16px;text-align:center;background:#fff;border:1px dashed #ecdfca;border-radius:10px;color:#8a7a68;font-size:12px;">
          ഈ കാലയളവിൽ ചെലവുകളൊന്നും രേഖപ്പെടുത്തിയിട്ടില്ല
        </div>
      ` : `
        <table style="width:100%;font-size:12px;border-collapse:collapse;background:#fff;border:1px solid #ecdfca;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:#fbf0d9;font-weight:700;color:#5c1620;text-align:left;">
              <th style="padding:7px 8px;width:30px;">#</th>
              <th style="padding:7px 8px;">തീയതി</th>
              <th style="padding:7px 8px;">ഇനം (Category)</th>
              <th style="padding:7px 8px;">വിവരണം</th>
              <th style="padding:7px 8px;text-align:right;">തുക (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${expenseRows}
          </tbody>
          <tfoot>
            <tr style="background:#fbf7f0;font-weight:800;border-top:1.5px solid #ecdfca;">
              <td colspan="4" style="padding:8px;text-align:right;">ആകെ ചെലവ്:</td>
              <td style="padding:8px;text-align:right;color:#b91c1c;">${fmt(totalExpense)}</td>
            </tr>
          </tfoot>
        </table>
      `}
    </div>

    <!-- SECTION 3: CATEGORY SUMMARY (If expenses exist) -->
    ${catExpenseSummary.length > 0 ? `
      <div style="margin-bottom:26px;">
        <div style="font-size:13.5px;font-weight:800;color:#5c1620;margin-bottom:8px;">3. ചെലവ് — ഇനം തിരിച്ച് സംഗ്രഹം</div>
        <table style="width:100%;font-size:12px;border-collapse:collapse;background:#fff;border:1px solid #ecdfca;">
          <tr style="background:#fbf0d9;font-weight:700;color:#5c1620;">
            <th style="padding:6px 10px;text-align:left;">ഇനം</th>
            <th style="padding:6px 10px;text-align:right;">തുക</th>
            <th style="padding:6px 10px;text-align:right;">ശതമാനം</th>
          </tr>
          ${catRows}
        </table>
      </div>
    ` : ''}

    <!-- SIGNATURES -->
    <div style="border-top:1.5px solid #ecdfca;padding-top:28px;margin-top:28px;display:flex;justify-content:space-between;color:#6b5d52;font-size:11.5px;font-weight:600;">
      <div>പ്രസിഡന്റ്: ___________________</div>
      <div>സെക്രട്ടറി: ___________________</div>
      <div>ട്രഷറർ: ___________________</div>
    </div>
  </div>`;
}

export async function shareDetailedReport(params) {
  const cleanTitle = (params.periodTitle || 'Report').replace(/[^\w\d\u0D00-\u0D7F]/g, '_').slice(0, 30);
  const filename = `Alumbil_Devaswom_Report_${cleanTitle}_${new Date().toISOString().slice(0, 10)}.pdf`;
  const blob = await renderHTMLToPDF(buildDetailedReportHTML(params), 2);
  return shareOrSaveFile({
    blob,
    filename,
    mimeType: 'application/pdf',
    title: `ആലുമ്പിൽ ദേവസ്ഥാനം - ${params.periodTitle || 'റിപ്പോർട്ട്'}`,
    text: `ആലുമ്പിൽ ദേവസ്ഥാനം ${params.periodTitle || 'വരവ് ചെലവ് റിപ്പോർട്ട്'} ഇതോടൊപ്പം അയക്കുന്നു.`
  });
}

