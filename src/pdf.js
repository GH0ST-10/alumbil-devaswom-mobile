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
  <div style="width:380px;background:#fffdf9;font-family:'Noto Sans Malayalam','Inter',sans-serif;border:1px solid #ecdfca;">
    <div style="background:linear-gradient(135deg,#7a1f2b,#9c2b3a 60%,#b8860b 140%);padding:20px 18px;color:#fff;">
      <div style="font-weight:800;font-size:19px;">ആലുമ്പിൽ ദേവസ്ഥാനം</div>
      <div style="font-size:12.5px;opacity:0.85;margin-top:2px;">${r.occasion ? esc(r.occasion) : 'പണപ്പിരിവ് രസീത്'}</div>
    </div>
    <div style="padding:20px 18px;">
      <div style="text-align:center;font-weight:700;color:#7a1f2b;font-size:14px;margin-bottom:14px;letter-spacing:0.04em;">രസീത്</div>
      <table style="width:100%;font-size:13px;border-collapse:collapse;">
        <tr><td style="color:#8a7a68;padding:4px 0;width:110px;">രസീത് നമ്പർ</td><td style="color:#2a1d12;font-weight:600;">${esc(r.receiptno || '—')}</td></tr>
        <tr><td style="color:#8a7a68;padding:4px 0;">തീയതി</td><td style="color:#2a1d12;font-weight:600;">${esc(r.date || '—')}</td></tr>
        <tr><td style="color:#8a7a68;padding:4px 0;">പേര്</td><td style="color:#2a1d12;font-weight:600;">${esc(r.name || '—')}</td></tr>
        ${r.house ? `<tr><td style="color:#8a7a68;padding:4px 0;">വീട്/വിലാസം</td><td style="color:#2a1d12;font-weight:600;">${esc(r.house)}</td></tr>` : ''}
      </table>
      <div style="border-top:1px solid #ecdfca;margin:16px 0;"></div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;">
        <div style="color:#8a7a68;font-size:12.5px;font-weight:600;">ലഭിച്ച തുക</div>
        <div style="color:#7a1f2b;font-size:24px;font-weight:800;">${fmt(paid)}</div>
      </div>
      ${target > paid
        ? `<div style="color:#8a7a68;font-size:12px;margin-top:6px;">രസീത് തുക: ${fmt(target)} &nbsp;·&nbsp; ബാക്കി: ${fmt(balance)}</div>`
        : `<div style="color:#1f9d55;font-size:12px;margin-top:6px;font-weight:600;">പൂർണമായി അടച്ചു</div>`}
      ${r.remarks ? `<div style="color:#8a7a68;font-size:11.5px;margin-top:12px;font-style:italic;">കുറിപ്പ്: ${esc(r.remarks)}</div>` : ''}
    </div>
    <div style="text-align:center;color:#8a7a68;font-size:10px;padding:10px 0 16px;">ആലുമ്പിൽ ദേവസ്ഥാനം കണക്ക് രജിസ്റ്ററിൽ നിന്ന് തയ്യാറാക്കിയത്</div>
  </div>`;
}

async function renderHTMLToPDF(html, scale = 3) {
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

export async function makeReceiptPDF(r) {
  return renderHTMLToPDF(buildReceiptHTML(r), 3);
}

export async function shareReceipt(r) {
  const filename = 'Receipt_' + (r.name || 'contributor').replace(/\s+/g, '_') + '.pdf';
  const blob = await makeReceiptPDF(r);
  const file = new File([blob], filename, { type: 'application/pdf' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Receipt' }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }

  if (r.phone) {
    downloadBlob(blob, filename);
    const text = `നമസ്കാരം ${r.name}, നിങ്ങളുടെ പണപ്പിരിവ് രസീത് അയക്കുന്നു. ഡൗൺലോഡ് ആയ PDF ഇവിടെ അറ്റാച്ച് ചെയ്യുക 🙏`;
    window.open(waLinkFor(r.phone, text), '_blank');
    return;
  }
  downloadBlob(blob, filename);
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

  const otherIncome  = ledgerRecords.filter(r => r.type === 'income' && !r.linkedPirivu).reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const totalIncome  = pirivuCollected + otherIncome;
  const totalExpense = ledgerRecords.filter(r => r.type === 'expense').reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const balance      = totalIncome - totalExpense;

  const expByCat = {};
  ledgerRecords.filter(r => r.type === 'expense').forEach(r => {
    const c = r.category || 'മറ്റുള്ളവ';
    expByCat[c] = (expByCat[c] || 0) + (Number(r.amount) || 0);
  });
  const expRows = Object.entries(expByCat).sort((a, b) => b[1] - a[1]);

  const txns = [...ledgerRecords].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  let running = 0;
  const txnRows = txns.map(r => {
    const amt = Number(r.amount) || 0;
    running += r.type === 'income' ? amt : -amt;
    return `<tr>
      <td style="padding:5px 6px;border-bottom:1px solid #ecdfca;">${esc(r.date || '—')}</td>
      <td style="padding:5px 6px;border-bottom:1px solid #ecdfca;">${esc(r.desc)}</td>
      <td style="padding:5px 6px;border-bottom:1px solid #ecdfca;text-align:right;color:${r.type === 'income' ? '#1f9d55' : '#c0392b'};">${r.type === 'income' ? '+' : '−'}${fmt(amt)}</td>
      <td style="padding:5px 6px;border-bottom:1px solid #ecdfca;text-align:right;font-weight:600;">${fmt(running)}</td>
    </tr>`;
  }).join('');

  return `
  <div style="width:700px;background:#fffdf9;font-family:'Noto Sans Malayalam','Inter',sans-serif;">
    <div style="background:linear-gradient(135deg,#7a1f2b,#9c2b3a 60%,#b8860b 140%);padding:26px 28px;color:#fff;">
      <div style="font-weight:800;font-size:24px;">ആലുമ്പിൽ ദേവസ്ഥാനം</div>
      <div style="font-size:14px;opacity:0.9;margin-top:4px;">വരവ്-ചെലവ് സ്റ്റേറ്റ്മെന്റ് — ${today}</div>
    </div>
    <div style="padding:26px 28px;">
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:22px;">
        <div style="flex:1;min-width:140px;background:#fbf0d9;border-radius:10px;padding:12px 14px;">
          <div style="font-size:11px;color:#8a7a68;font-weight:600;">ആകെ വരവ്</div>
          <div style="font-size:19px;font-weight:800;color:#1f9d55;">${fmt(totalIncome)}</div>
        </div>
        <div style="flex:1;min-width:140px;background:#fbf0d9;border-radius:10px;padding:12px 14px;">
          <div style="font-size:11px;color:#8a7a68;font-weight:600;">ആകെ ചെലവ്</div>
          <div style="font-size:19px;font-weight:800;color:#c0392b;">${fmt(totalExpense)}</div>
        </div>
        <div style="flex:1;min-width:140px;background:#fbf0d9;border-radius:10px;padding:12px 14px;">
          <div style="font-size:11px;color:#8a7a68;font-weight:600;">കൈവശമുള്ള ബാക്കി</div>
          <div style="font-size:19px;font-weight:800;color:#7a1f2b;">${fmt(balance)}</div>
        </div>
      </div>

      <div style="font-weight:700;color:#7a1f2b;font-size:14px;margin-bottom:10px;border-bottom:2px solid #ecdfca;padding-bottom:6px;">പണപ്പിരിവ് സംഗ്രഹം</div>
      <table style="width:100%;font-size:12.5px;border-collapse:collapse;margin-bottom:22px;">
        <tr><td style="padding:4px 0;color:#8a7a68;">ആകെ രസീത് ലക്ഷ്യം</td><td style="padding:4px 0;text-align:right;font-weight:700;">${fmt(pirivuPledged)}</td></tr>
        <tr><td style="padding:4px 0;color:#8a7a68;">ആകെ പിരിഞ്ഞു കിട്ടിയത്</td><td style="padding:4px 0;text-align:right;font-weight:700;color:#1f9d55;">${fmt(pirivuCollected)}</td></tr>
        <tr><td style="padding:4px 0;color:#8a7a68;">ബാക്കി കിട്ടാനുള്ളത്</td><td style="padding:4px 0;text-align:right;font-weight:700;color:#c0392b;">${fmt(pirivuPledged - pirivuCollected)}</td></tr>
        <tr><td style="padding:4px 0;color:#8a7a68;">പൂർണമായി / ഭാഗികമായി / അടയ്ക്കാത്തവർ</td><td style="padding:4px 0;text-align:right;font-weight:700;">${fullCount} / ${partialCount} / ${unpaidCount}</td></tr>
      </table>

      ${expRows.length ? `
      <div style="font-weight:700;color:#7a1f2b;font-size:14px;margin-bottom:10px;border-bottom:2px solid #ecdfca;padding-bottom:6px;">ചെലവ് — ഇനം തിരിച്ച്</div>
      <table style="width:100%;font-size:12.5px;border-collapse:collapse;margin-bottom:22px;">
        ${expRows.map(([cat, amt]) => `<tr><td style="padding:4px 0;color:#8a7a68;">${esc(cat)}</td><td style="padding:4px 0;text-align:right;font-weight:600;">${fmt(amt)}</td></tr>`).join('')}
      </table>` : ''}

      <div style="font-weight:700;color:#7a1f2b;font-size:14px;margin-bottom:10px;border-bottom:2px solid #ecdfca;padding-bottom:6px;">എല്ലാ ഇടപാടുകളും</div>
      <table style="width:100%;font-size:12px;border-collapse:collapse;">
        <tr style="background:#fbf0d9;"><th style="padding:6px;text-align:left;">തീയതി</th><th style="padding:6px;text-align:left;">വിവരണം</th><th style="padding:6px;text-align:right;">തുക</th><th style="padding:6px;text-align:right;">ബാക്കി</th></tr>
        ${txnRows || '<tr><td colspan="4" style="padding:10px;color:#8a7a68;text-align:center;">ഇടപാടുകളൊന്നുമില്ല</td></tr>'}
      </table>
    </div>
    <div style="text-align:center;color:#8a7a68;font-size:10.5px;padding:14px 0 20px;">ആലുമ്പിൽ ദേവസ്ഥാനം കണക്ക് രജിസ്റ്ററിൽ നിന്ന് തയ്യാറാക്കിയത് — ${today}</div>
  </div>`;
}

export async function makeStatementPDF(pirivuRecords, ledgerRecords) {
  return renderHTMLToPDF(buildStatementHTML(pirivuRecords, ledgerRecords), 2.5);
}

export async function shareStatement(pirivuRecords, ledgerRecords) {
  const blob = await makeStatementPDF(pirivuRecords, ledgerRecords);
  const filename = 'Alumbil_Devaswom_Statement_' + new Date().toISOString().slice(0, 10) + '.pdf';
  const file = new File([blob], filename, { type: 'application/pdf' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'വരവ്-ചെലവ് സ്റ്റേറ്റ്മെന്റ്' }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  downloadBlob(blob, filename);
}
