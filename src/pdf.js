import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { fmt, downloadBlob, waLinkFor } from './utils';
import { directShareFile, shareOrSaveFile } from './nativeShare';

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
          : `<div style="color:#15803d;font-weight:700;">✓ പൂർണമായി അടച്ചു</div>`}
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
      <td style="padding:5px 8px;color:#2a1d12;font-size:12px;">${esc(c)}</td>
      <td style="padding:5px 8px;text-align:right;font-weight:600;color:#2a1d12;font-size:12px;white-space:nowrap;">${fmt(a)}</td>
      <td style="padding:5px 8px;text-align:right;color:#8a7a68;font-size:11px;width:40px;">${total > 0 ? Math.round(a / total * 100) : 0}%</td>
    </tr>
  `).join('');

  // NOTE: width is 390px — must fit within smallest Android viewport (360px+)
  // All multi-column grids are replaced with single-column stacks.
  return `
  <div style="width:390px;background:#fffdf9;font-family:'Noto Sans Malayalam','Inter',sans-serif;color:#2a1d12;padding:20px 18px;box-sizing:border-box;">

    <!-- HEADER -->
    <div style="text-align:center;border-bottom:2px solid #7a1f2b;padding-bottom:12px;margin-bottom:16px;">
      <div style="font-size:20px;font-weight:800;color:#7a1f2b;">ആലുമ്പിൽ ദേവസ്ഥാനം</div>
      <div style="font-size:13px;font-weight:700;color:#5c1620;margin-top:3px;">സാമ്പത്തിക സ്റ്റേറ്റ്മെന്റ് (യോഗം)</div>
      <div style="font-size:11px;color:#8a7a68;margin-top:3px;">തയ്യാറാക്കിയത്: ${today}</div>
    </div>

    <!-- KPI CARDS (stacked) -->
    <div style="margin-bottom:16px;display:flex;flex-direction:column;gap:8px;">
      <div style="background:#fff;border:1px solid #ecdfca;border-radius:10px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:10px;color:#8a7a68;font-weight:600;">ആകെ പിരിവ് രസീത്</div>
          <div style="font-size:10px;color:#8a7a68;margin-top:1px;">ലഭിച്ചത്: ${fmt(pirivuCollected)} (${pirivuPledged > 0 ? Math.round(pirivuCollected / pirivuPledged * 100) : 0}%)</div>
        </div>
        <div style="font-size:17px;font-weight:800;color:#7a1f2b;">${fmt(pirivuPledged)}</div>
      </div>
      <div style="background:#fff;border:1px solid #ecdfca;border-radius:10px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:10px;color:#8a7a68;font-weight:600;">കൈവശമുള്ള ബാക്കി</div>
          <div style="font-size:10px;color:#8a7a68;margin-top:1px;">വരവ്: ${fmt(ledgerIncome)} · ചെലവ്: ${fmt(ledgerExpense)}</div>
        </div>
        <div style="font-size:17px;font-weight:800;color:#1f9d55;">${fmt(balance)}</div>
      </div>
    </div>

    <!-- SECTION 1: COLLECTION SUMMARY -->
    <div style="font-size:12px;font-weight:700;color:#7a1f2b;margin-bottom:6px;">1. പണപ്പിരിവ് സംഗ്രഹം</div>
    <table style="width:100%;font-size:11.5px;border-collapse:collapse;margin-bottom:16px;background:#fff;border:1px solid #ecdfca;">
      <tr style="background:#fbf0d9;font-weight:700;color:#5c1620;">
        <th style="padding:5px 8px;text-align:left;">വിഭാഗം</th>
        <th style="padding:5px 8px;text-align:center;width:50px;">എണ്ണം</th>
        <th style="padding:5px 8px;text-align:right;width:50px;">%</th>
      </tr>
      <tr><td style="padding:5px 8px;border-top:1px solid #ecdfca;">പൂർണമായി അടച്ചവർ</td><td style="padding:5px 8px;text-align:center;border-top:1px solid #ecdfca;">${fullCount}</td><td style="padding:5px 8px;text-align:right;border-top:1px solid #ecdfca;">${pirivuRecords.length > 0 ? Math.round(fullCount / pirivuRecords.length * 100) : 0}%</td></tr>
      <tr><td style="padding:5px 8px;border-top:1px solid #ecdfca;">ഭാഗികമായി അടച്ചവർ</td><td style="padding:5px 8px;text-align:center;border-top:1px solid #ecdfca;">${partialCount}</td><td style="padding:5px 8px;text-align:right;border-top:1px solid #ecdfca;">${pirivuRecords.length > 0 ? Math.round(partialCount / pirivuRecords.length * 100) : 0}%</td></tr>
      <tr><td style="padding:5px 8px;border-top:1px solid #ecdfca;">അടയ്ക്കാത്തവർ</td><td style="padding:5px 8px;text-align:center;border-top:1px solid #ecdfca;">${unpaidCount}</td><td style="padding:5px 8px;text-align:right;border-top:1px solid #ecdfca;">${pirivuRecords.length > 0 ? Math.round(unpaidCount / pirivuRecords.length * 100) : 0}%</td></tr>
      <tr style="font-weight:700;background:#fbf7f0;"><td style="padding:5px 8px;border-top:1px solid #ecdfca;">ആകെ അംഗങ്ങൾ</td><td style="padding:5px 8px;text-align:center;border-top:1px solid #ecdfca;">${pirivuRecords.length}</td><td style="padding:5px 8px;text-align:right;border-top:1px solid #ecdfca;">100%</td></tr>
    </table>

    <!-- SECTION 2: INCOME BY CATEGORY -->
    <div style="font-size:12px;font-weight:700;color:#1f9d55;margin-bottom:6px;">2. വരവ് — ഇനം തിരിച്ച്</div>
    <table style="width:100%;font-size:11.5px;border-collapse:collapse;margin-bottom:16px;background:#fff;border:1px solid #ecdfca;">
      ${catRows(incomeByCategory, ledgerIncome)}
      <tr style="border-top:1.5px solid #ecdfca;font-weight:700;background:#f5faf6;">
        <td style="padding:6px 8px;">ആകെ വരവ്</td>
        <td style="padding:6px 8px;text-align:right;color:#1f9d55;">${fmt(ledgerIncome)}</td>
        <td></td>
      </tr>
    </table>

    <!-- SECTION 3: EXPENSE BY CATEGORY -->
    <div style="font-size:12px;font-weight:700;color:#c0392b;margin-bottom:6px;">3. ചെലവ് — ഇനം തിരിച്ച്</div>
    <table style="width:100%;font-size:11.5px;border-collapse:collapse;margin-bottom:16px;background:#fff;border:1px solid #ecdfca;">
      ${catRows(expenseByCategory, ledgerExpense)}
      <tr style="border-top:1.5px solid #ecdfca;font-weight:700;background:#fdf5f5;">
        <td style="padding:6px 8px;">ആകെ ചെലവ്</td>
        <td style="padding:6px 8px;text-align:right;color:#c0392b;">${fmt(ledgerExpense)}</td>
        <td></td>
      </tr>
    </table>

    <!-- SIGNATURES -->
    <div style="border-top:1px solid #ecdfca;padding-top:16px;margin-top:4px;">
      <div style="display:flex;justify-content:space-between;color:#8a7a68;font-size:10px;">
        <div>പ്രസിഡന്റ്: ____________</div>
        <div>സെക്രട്ടറി: ____________</div>
      </div>
      <div style="margin-top:10px;color:#8a7a68;font-size:10px;">
        <div>ട്രഷറർ: ____________</div>
      </div>
    </div>

  </div>`;
}

async function renderHTMLToPDF(html, scale = 2) {
  // HTML content is now designed to be 390px wide — fits any mobile viewport.
  // No viewport-hacking tricks needed anymore.
  const holder = document.createElement('div');
  holder.style.cssText = 'position:absolute;left:-9999px;top:0;width:390px;background:#fffdf9;overflow:visible;';
  holder.innerHTML = html;
  document.body.appendChild(holder);

  await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));

  const el = holder.firstElementChild;

  const canvas = await html2canvas(el, {
    scale,
    backgroundColor: '#fffdf9',
    useCORS: true,
    scrollX: 0,
    scrollY: 0,
  });
  document.body.removeChild(holder);

  const pxToMm = px => px * 0.264583;
  const wMm = pxToMm(canvas.width  / scale);
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

  // Income rows — compact 4 columns (no house/receiptno to save space)
  const incomeRows = incomeList.map((r, i) => `
    <tr style="border-bottom:1px solid #f0e6d6;background:${i % 2 === 0 ? '#fff' : '#fcfaf6'};">
      <td style="padding:5px 6px;color:#8a7a68;font-size:10px;">${i + 1}</td>
      <td style="padding:5px 6px;font-weight:700;color:#2a1d12;font-size:11px;">${esc(r.name || r.desc || '—')}</td>
      <td style="padding:5px 6px;color:#8a7a68;font-size:10px;white-space:nowrap;">${esc(r.date || '—')}</td>
      <td style="padding:5px 6px;text-align:right;font-weight:700;color:#1f9d55;white-space:nowrap;font-size:11px;">${fmt(r.amount || r.paid || 0)}</td>
    </tr>
  `).join('');

  // Expense rows — compact 3 columns
  const expenseRows = expenseList.map((r, i) => `
    <tr style="border-bottom:1px solid #f0e6d6;background:${i % 2 === 0 ? '#fff' : '#fcfaf6'};">
      <td style="padding:5px 6px;color:#8a7a68;font-size:10px;">${i + 1}</td>
      <td style="padding:5px 6px;color:#2a1d12;font-weight:600;font-size:11px;">${esc(r.desc || r.category || '—')}</td>
      <td style="padding:5px 6px;text-align:right;font-weight:700;color:#c0392b;white-space:nowrap;font-size:11px;">${fmt(r.amount || 0)}</td>
    </tr>
  `).join('');

  const catRows = catExpenseSummary.map(c => `
    <tr>
      <td style="padding:5px 8px;color:#2a1d12;font-size:11.5px;">${esc(c.category)}</td>
      <td style="padding:5px 8px;text-align:right;font-weight:700;color:#c0392b;font-size:11.5px;">${fmt(c.amount)}</td>
      <td style="padding:5px 8px;text-align:right;color:#8a7a68;font-size:11px;width:40px;">${c.pct}%</td>
    </tr>
  `).join('');

  // NOTE: width is 390px — must fit within smallest Android viewport
  return `
  <div style="width:390px;background:#fffdf9;font-family:-apple-system,BlinkMacSystemFont,'Noto Sans Malayalam','Inter',sans-serif;color:#2a1d12;padding:20px 16px;box-sizing:border-box;">

    <!-- HEADER -->
    <div style="text-align:center;border-bottom:2px solid #7a1f2b;padding-bottom:12px;margin-bottom:16px;">
      <div style="font-size:20px;font-weight:800;color:#7a1f2b;">ആലുമ്പിൽ ദേവസ്ഥാനം</div>
      <div style="font-size:13px;font-weight:700;color:#5c1620;margin-top:3px;">${esc(periodTitle)}</div>
      <div style="font-size:10px;color:#8a7a68;margin-top:3px;">തീയതി: ${today}</div>
    </div>

    <!-- KPI TILES (stacked) -->
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
      <div style="background:#fff;border:1.5px solid #d4edd9;border-radius:10px;padding:9px 12px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:10px;color:#15803d;font-weight:700;">ആകെ വരവ് (INCOME)</div>
          <div style="font-size:10px;color:#8a7a68;">പൈസ തന്നവർ: ${incomeList.length}</div>
        </div>
        <div style="font-size:17px;font-weight:800;color:#15803d;">${fmt(totalIncome)}</div>
      </div>
      <div style="background:#fff;border:1.5px solid #fad2d2;border-radius:10px;padding:9px 12px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:10px;color:#b91c1c;font-weight:700;">ആകെ ചെലവ് (EXPENSE)</div>
          <div style="font-size:10px;color:#8a7a68;">ഇടപാടുകൾ: ${expenseList.length}</div>
        </div>
        <div style="font-size:17px;font-weight:800;color:#b91c1c;">${fmt(totalExpense)}</div>
      </div>
      <div style="background:#fff;border:1.5px solid #ecdfca;border-radius:10px;padding:9px 12px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:10px;color:#b8860b;font-weight:700;">കൈവശമുള്ള ബാക്കി (BALANCE)</div>
          <div style="font-size:10px;color:#8a7a68;">${netBalance >= 0 ? 'നീക്കിയിരിപ്പ് മിച്ചം' : 'കമ്മി'}</div>
        </div>
        <div style="font-size:17px;font-weight:800;color:${netBalance >= 0 ? '#15803d' : '#b91c1c'};">${fmt(netBalance)}</div>
      </div>
    </div>

    <!-- SECTION 1: INCOME -->
    <div style="margin-bottom:18px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <div style="font-size:12px;font-weight:800;color:#15803d;">1. വരവ് — ആരൊക്കെ പൈസ തന്നു (${incomeList.length})</div>
        <div style="font-size:11px;font-weight:800;color:#15803d;">${fmt(totalIncome)}</div>
      </div>
      ${incomeList.length === 0 ? `
        <div style="padding:12px;text-align:center;background:#fff;border:1px dashed #ecdfca;border-radius:8px;color:#8a7a68;font-size:11px;">
          ഈ കാലയളവിൽ വരവുകളൊന്നും രേഖപ്പെടുത്തിയിട്ടില്ല
        </div>
      ` : `
        <table style="width:100%;font-size:11px;border-collapse:collapse;background:#fff;border:1px solid #ecdfca;">
          <thead>
            <tr style="background:#f5f0e6;font-weight:700;color:#5c1620;text-align:left;">
              <th style="padding:5px 6px;width:24px;">#</th>
              <th style="padding:5px 6px;">പേര്</th>
              <th style="padding:5px 6px;">തീയതി</th>
              <th style="padding:5px 6px;text-align:right;">തുക (₹)</th>
            </tr>
          </thead>
          <tbody>${incomeRows}</tbody>
          <tfoot>
            <tr style="background:#fbf7f0;font-weight:800;border-top:1.5px solid #ecdfca;">
              <td colspan="3" style="padding:6px;text-align:right;">ആകെ:</td>
              <td style="padding:6px;text-align:right;color:#15803d;">${fmt(totalIncome)}</td>
            </tr>
          </tfoot>
        </table>
      `}
    </div>

    <!-- SECTION 2: EXPENSES -->
    <div style="margin-bottom:18px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <div style="font-size:12px;font-weight:800;color:#b91c1c;">2. ചെലവ് — എന്തിനൊക്കെ (${expenseList.length})</div>
        <div style="font-size:11px;font-weight:800;color:#b91c1c;">${fmt(totalExpense)}</div>
      </div>
      ${expenseList.length === 0 ? `
        <div style="padding:12px;text-align:center;background:#fff;border:1px dashed #ecdfca;border-radius:8px;color:#8a7a68;font-size:11px;">
          ഈ കാലയളവിൽ ചെലവുകളൊന്നും രേഖപ്പെടുത്തിയിട്ടില്ല
        </div>
      ` : `
        <table style="width:100%;font-size:11px;border-collapse:collapse;background:#fff;border:1px solid #ecdfca;">
          <thead>
            <tr style="background:#fbf0d9;font-weight:700;color:#5c1620;text-align:left;">
              <th style="padding:5px 6px;width:24px;">#</th>
              <th style="padding:5px 6px;">വിവരണം / ഇനം</th>
              <th style="padding:5px 6px;text-align:right;">തുക (₹)</th>
            </tr>
          </thead>
          <tbody>${expenseRows}</tbody>
          <tfoot>
            <tr style="background:#fbf7f0;font-weight:800;border-top:1.5px solid #ecdfca;">
              <td colspan="2" style="padding:6px;text-align:right;">ആകെ:</td>
              <td style="padding:6px;text-align:right;color:#b91c1c;">${fmt(totalExpense)}</td>
            </tr>
          </tfoot>
        </table>
      `}
    </div>

    <!-- SECTION 3: CATEGORY SUMMARY -->
    ${catExpenseSummary.length > 0 ? `
      <div style="margin-bottom:18px;">
        <div style="font-size:12px;font-weight:800;color:#5c1620;margin-bottom:6px;">3. ചെലവ് — ഇനം തിരിച്ച് സംഗ്രഹം</div>
        <table style="width:100%;font-size:11.5px;border-collapse:collapse;background:#fff;border:1px solid #ecdfca;">
          <tr style="background:#fbf0d9;font-weight:700;color:#5c1620;">
            <th style="padding:5px 8px;text-align:left;">ഇനം</th>
            <th style="padding:5px 8px;text-align:right;">തുക</th>
            <th style="padding:5px 8px;text-align:right;">%</th>
          </tr>
          ${catRows}
        </table>
      </div>
    ` : ''}

    <!-- SIGNATURES -->
    <div style="border-top:1.5px solid #ecdfca;padding-top:16px;margin-top:4px;">
      <div style="display:flex;justify-content:space-between;color:#6b5d52;font-size:10px;font-weight:600;">
        <div>പ്രസിഡന്റ്: ____________</div>
        <div>സെക്രട്ടറി: ____________</div>
      </div>
      <div style="margin-top:10px;color:#6b5d52;font-size:10px;font-weight:600;">
        <div>ട്രഷറർ: ____________</div>
      </div>
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

