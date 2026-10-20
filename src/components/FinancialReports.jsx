import { useState, useMemo, useCallback } from 'react';
import {
  fmt,
  formatMLMonth,
  formatDisplayDate,
  getDistinctMonths,
  getDistinctYears
} from '../utils';
import { shareDetailedReport } from '../pdf';
import { exportCustomReport } from '../excel';
import {
  IconChartBar,
  IconCalendar,
  IconTrendingUp,
  IconTrendingDown,
  IconSearch,
  IconFileSpreadsheet,
  IconFileText,
  IconSpinner,
  IconWhatsApp,
  IconCopy,
  IconCheck,
  IconUsers,
  IconInbox
} from './Icons';

export default function FinancialReports({
  pirivuRecords = [],
  ledgerRecords = []
}) {
  const distinctMonths = useMemo(() => getDistinctMonths(pirivuRecords, ledgerRecords), [pirivuRecords, ledgerRecords]);
  const distinctYears = useMemo(() => getDistinctYears(pirivuRecords, ledgerRecords), [pirivuRecords, ledgerRecords]);

  // Default to latest month/year or current
  const [filterMode, setFilterMode] = useState('month'); // 'month' | 'year' | 'date' | 'all'
  const [selectedMonth, setSelectedMonth] = useState(distinctMonths[0] || new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(distinctYears[0] || String(new Date().getFullYear()));
  const [datePreset, setDatePreset] = useState('30days'); // 'today' | '7days' | '30days' | '90days' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Active view inside reports: 'overview' | 'income' | 'expense' | 'monthly'
  const [reportView, setReportView] = useState('overview');
  const [incomeSearch, setIncomeSearch] = useState('');
  const [expenseSearch, setExpenseSearch] = useState('');

  // Action status
  const [pdfLoading, setPdfLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Compute date match condition
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const dateFilterBounds = useMemo(() => {
    const getPastDateStr = days => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      return d.toISOString().slice(0, 10);
    };

    if (filterMode === 'date') {
      if (datePreset === 'today') return { start: todayStr, end: todayStr };
      if (datePreset === '7days') return { start: getPastDateStr(7), end: todayStr };
      if (datePreset === '30days') return { start: getPastDateStr(30), end: todayStr };
      if (datePreset === '90days') return { start: getPastDateStr(90), end: todayStr };
      if (datePreset === 'custom') return { start: startDate, end: endDate };
    }
    return null;
  }, [filterMode, datePreset, startDate, endDate, todayStr]);

  const isDateMatch = useCallback((dateStr) => {
    if (!dateStr) return false;
    if (filterMode === 'all') return true;
    if (filterMode === 'month') return dateStr.startsWith(selectedMonth);
    if (filterMode === 'year') return dateStr.startsWith(selectedYear);
    if (filterMode === 'date' && dateFilterBounds) {
      if (dateFilterBounds.start && dateStr < dateFilterBounds.start) return false;
      if (dateFilterBounds.end && dateStr > dateFilterBounds.end) return false;
      return true;
    }
    return true;
  }, [filterMode, selectedMonth, selectedYear, dateFilterBounds]);

  // Compute Period Title Label
  const periodTitle = useMemo(() => {
    if (filterMode === 'month') {
      return `${formatMLMonth(selectedMonth)} മാസത്തെ വരവ് ചെലവ് കണക്ക്`;
    }
    if (filterMode === 'year') {
      return `${selectedYear} വാർഷിക വരവ് ചെലവ് കണക്ക്`;
    }
    if (filterMode === 'all') {
      return 'ആകെ സമഗ്ര വരവ് ചെലവ് കണക്ക് (ALL TIME)';
    }
    if (filterMode === 'date') {
      if (datePreset === 'today') return `ഇന്നത്തെ വരവ് ചെലവ് കണക്ക് (${formatDisplayDate(todayStr)})`;
      if (datePreset === '7days') return 'കഴിഞ്ഞ 7 ദിവസത്തെ വരവ് ചെലവ് കണക്ക്';
      if (datePreset === '30days') return 'കഴിഞ്ഞ 30 ദിവസത്തെ വരവ് ചെലവ് കണക്ക്';
      if (datePreset === '90days') return 'കഴിഞ്ഞ 90 ദിവസത്തെ വരവ് ചെലവ് കണക്ക്';
      if (datePreset === 'custom') {
        const s = startDate ? formatDisplayDate(startDate) : 'തുടക്കം';
        const e = endDate ? formatDisplayDate(endDate) : 'ഇതുവരെ';
        return `${s} മുതൽ ${e} വരെയുള്ള വരവ് ചെലവ് കണക്ക്`;
      }
    }
    return 'വരവ് ചെലവ് കണക്ക്';
  }, [filterMode, selectedMonth, selectedYear, datePreset, startDate, endDate, todayStr]);

  // Extract Income Items (Who gave money)
  const incomeList = useMemo(() => {
    const list = [];

    // 1. Contributors from Panapirivu who paid
    pirivuRecords.forEach(r => {
      const paid = Number(r.paid) || 0;
      if (paid > 0 && isDateMatch(r.date)) {
        list.push({
          id: 'pirivu_' + r.id,
          name: r.name || 'പേരില്ലാത്ത ദാതാവ്',
          house: r.house || '',
          receiptno: r.receiptno || '',
          phone: r.phone || '',
          date: r.date || '',
          occasion: r.occasion || 'പണപ്പിരിവ്',
          amount: paid,
          targetReceipt: Number(r.receipt) || 0,
          isPirivu: true,
          raw: r
        });
      }
    });

    // 2. Direct ledger income entries (which aren't linked pirivu)
    ledgerRecords.forEach(r => {
      if (r.type === 'income' && !r.id.startsWith('pirivu_') && !r.linkedPirivu && isDateMatch(r.date)) {
        list.push({
          id: r.id,
          name: r.desc || 'മറ്റ് വരവ്',
          house: '—',
          receiptno: '—',
          phone: '—',
          date: r.date || '',
          occasion: r.category || 'വരവ്',
          amount: Number(r.amount) || 0,
          targetReceipt: Number(r.amount) || 0,
          isPirivu: false,
          raw: r
        });
      }
    });

    // Sort descending by date
    return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [pirivuRecords, ledgerRecords, isDateMatch]);

  // Extract Expense Items (What was spent on)
  const expenseList = useMemo(() => {
    return ledgerRecords
      .filter(r => r.type === 'expense' && isDateMatch(r.date))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [ledgerRecords, isDateMatch]);


  // Totals
  const totalIncome = useMemo(() => incomeList.reduce((s, r) => s + (Number(r.amount) || 0), 0), [incomeList]);
  const totalExpense = useMemo(() => expenseList.reduce((s, r) => s + (Number(r.amount) || 0), 0), [expenseList]);
  const netBalance = totalIncome - totalExpense;

  // Expense Category Breakdown
  const catExpenseSummary = useMemo(() => {
    const map = {};
    expenseList.forEach(r => {
      const c = r.category || 'മറ്റുള്ളവ';
      map[c] = (map[c] || 0) + (Number(r.amount) || 0);
    });
    return Object.entries(map)
      .map(([category, amount]) => ({
        category,
        amount,
        pct: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenseList, totalExpense]);

  // Month-by-Month Summary Table (For Year-wise or All-time)
  const monthlySummary = useMemo(() => {
    const monthKeys = new Set();
    pirivuRecords.forEach(r => {
      if (r.date && r.date.length >= 7) {
        if (filterMode === 'year' && !r.date.startsWith(selectedYear)) return;
        monthKeys.add(r.date.slice(0, 7));
      }
    });
    ledgerRecords.forEach(r => {
      if (r.date && r.date.length >= 7) {
        if (filterMode === 'year' && !r.date.startsWith(selectedYear)) return;
        monthKeys.add(r.date.slice(0, 7));
      }
    });

    const sortedMonths = Array.from(monthKeys).sort().reverse();
    return sortedMonths.map(ym => {
      const mIncome = ledgerRecords
        .filter(r => r.type === 'income' && (r.date || '').startsWith(ym))
        .reduce((s, r) => s + (Number(r.amount) || 0), 0);

      const mExpense = ledgerRecords
        .filter(r => r.type === 'expense' && (r.date || '').startsWith(ym))
        .reduce((s, r) => s + (Number(r.amount) || 0), 0);

      return {
        monthKey: ym,
        monthLabel: formatMLMonth(ym),
        income: mIncome,
        expense: mExpense,
        balance: mIncome - mExpense
      };
    });
  }, [pirivuRecords, ledgerRecords, filterMode, selectedYear]);

  // Filtered lists for in-page search
  const displayedIncome = useMemo(() => {
    if (!incomeSearch.trim()) return incomeList;
    const q = incomeSearch.toLowerCase();
    return incomeList.filter(r =>
      [r.name, r.house, r.receiptno, r.phone, r.occasion, r.date, String(r.amount)]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [incomeList, incomeSearch]);

  const displayedExpenses = useMemo(() => {
    if (!expenseSearch.trim()) return expenseList;
    const q = expenseSearch.toLowerCase();
    return expenseList.filter(r =>
      [r.desc, r.category, r.date, String(r.amount)].join(' ').toLowerCase().includes(q)
    );
  }, [expenseList, expenseSearch]);

  // Handler: Previous/Next Month Navigation
  const handleShiftMonth = delta => {
    const idx = distinctMonths.indexOf(selectedMonth);
    if (idx !== -1) {
      const nextIdx = idx - delta; // reverse sorted
      if (nextIdx >= 0 && nextIdx < distinctMonths.length) {
        setSelectedMonth(distinctMonths[nextIdx]);
      }
    }
  };

  // Handler: Export PDF
  const handleExportPDF = async () => {
    setPdfLoading(true);
    try {
      await shareDetailedReport({
        periodTitle,
        incomeList,
        expenseList,
        totalIncome,
        totalExpense,
        netBalance,
        catExpenseSummary
      });
    } catch (err) {
      alert('PDF തയ്യാറാക്കുന്നതിൽ തടസ്സമുണ്ടായി: ' + err.message);
    } finally {
      setPdfLoading(false);
    }
  };

  // Handler: Export Excel
  const handleExportExcel = async () => {
    setExcelLoading(true);
    try {
      await exportCustomReport({
        periodTitle,
        incomeList,
        expenseList,
        totalIncome,
        totalExpense,
        netBalance,
        monthlySummary
      });
    } catch (err) {
      alert('എക്സൽ തയ്യാറാക്കുന്നതിൽ തടസ്സമുണ്ടായി: ' + err.message);
    } finally {
      setExcelLoading(false);
    }
  };

  // Handler: WhatsApp Summary Text
  const summaryText = useMemo(() => {
    const topCats = catExpenseSummary.slice(0, 4).map(c => `• ${c.category}: ${fmt(c.amount)} (${c.pct}%)`).join('\n');
    return `🏛️ *ആലുമ്പിൽ ദേവസ്ഥാനം*
📊 *${periodTitle}*
━━━━━━━━━━━━━━━━━━
💰 *ആകെ വരവ്:* ${fmt(totalIncome)} (${incomeList.length} ആളുകൾ)
💸 *ആകെ ചെലവ്:* ${fmt(totalExpense)} (${expenseList.length} ഇടപാടുകൾ)
⚖️ *കൈവശമുള്ള ബാക്കി:* ${fmt(netBalance)}
━━━━━━━━━━━━━━━━━━
${topCats ? `📌 *പ്രധാന ചെലവുകൾ:*\n${topCats}\n━━━━━━━━━━━━━━━━━━\n` : ''}ആലുമ്പിൽ ദേവസ്ഥാനം അക്കൗണ്ട്സ് ആപ്പിൽ നിന്നും തയ്യാറാക്കിയത് 🙏`;
  }, [periodTitle, totalIncome, totalExpense, netBalance, incomeList.length, expenseList.length, catExpenseSummary]);

  const handleShareWhatsApp = async () => {
    // Web Share or direct WA
    if (navigator.share) {
      try {
        await navigator.share({
          title: `ആലുമ്പിൽ ദേവസ്ഥാനം - ${periodTitle}`,
          text: summaryText
        });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    // Fallback: copy or open WhatsApp
    navigator.clipboard?.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(summaryText)}`, '_blank');
  };

  const handleCopyText = () => {
    navigator.clipboard?.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="page-reports">
      {/* ── TOP FILTER CARD ── */}
      <div className="panel report-filter-box" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconCalendar size={18} style={{ color: 'var(--maroon)' }} />
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--maroon)' }}>
              കണക്ക് കാലയളവ് തിരഞ്ഞെടുക്കുക
            </h2>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', background: 'var(--gold-bg)', padding: '2px 8px', borderRadius: 999 }}>
            FILTER
          </span>
        </div>

        {/* MODE CHIPS */}
        <div className="filter-mode-pills">
          <button
            type="button"
            className={'filter-pill' + (filterMode === 'month' ? ' active' : '')}
            onClick={() => setFilterMode('month')}
          >
            🗓️ മാസം തിരിച്ച്
          </button>
          <button
            type="button"
            className={'filter-pill' + (filterMode === 'year' ? ' active' : '')}
            onClick={() => setFilterMode('year')}
          >
            📅 വർഷം തിരിച്ച്
          </button>
          <button
            type="button"
            className={'filter-pill' + (filterMode === 'date' ? ' active' : '')}
            onClick={() => setFilterMode('date')}
          >
            ⏱️ തീയതി തിരിച്ച്
          </button>
          <button
            type="button"
            className={'filter-pill' + (filterMode === 'all' ? ' active' : '')}
            onClick={() => setFilterMode('all')}
          >
            🌐 എല്ലാം (ALL)
          </button>
        </div>

        {/* SUB CONTROLS BASED ON FILTER MODE */}
        {filterMode === 'month' && (
          <div className="filter-controls-sub" style={{ marginTop: 12 }}>
            <label style={{ fontSize: 11.5, fontWeight: 700 }}>മാസം തിരഞ്ഞെടുക്കുക:</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                type="button"
                className="btn-stepper"
                onClick={() => handleShiftMonth(-1)}
                title="അടുത്ത മാസം"
              >
                ◀
              </button>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                style={{ flex: 1, margin: 0, fontWeight: 700 }}
              >
                {distinctMonths.map(m => (
                  <option key={m} value={m}>
                    {formatMLMonth(m)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-stepper"
                onClick={() => handleShiftMonth(1)}
                title="കഴിഞ്ഞ മാസം"
              >
                ▶
              </button>
            </div>
          </div>
        )}

        {filterMode === 'year' && (
          <div className="filter-controls-sub" style={{ marginTop: 12 }}>
            <label style={{ fontSize: 11.5, fontWeight: 700 }}>വർഷം തിരഞ്ഞെടുക്കുക:</label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              style={{ width: '100%', margin: 0, fontWeight: 700 }}
            >
              {distinctYears.map(y => (
                <option key={y} value={y}>
                  {y} വർഷം (മുഴുവൻ)
                </option>
              ))}
            </select>
          </div>
        )}

        {filterMode === 'date' && (
          <div className="filter-controls-sub" style={{ marginTop: 12 }}>
            <div className="chips" style={{ margin: '0 0 10px' }}>
              {[
                ['today', 'ഇന്ന്'],
                ['7days', 'കഴിഞ്ഞ 7 ദിവസം'],
                ['30days', 'കഴിഞ്ഞ 30 ദിവസം'],
                ['90days', 'കഴിഞ്ഞ 90 ദിവസം'],
                ['custom', 'കസ്റ്റം തീയതി']
              ].map(([key, lbl]) => (
                <button
                  key={key}
                  type="button"
                  className={'chip' + (datePreset === key ? ' active' : '')}
                  onClick={() => setDatePreset(key)}
                >
                  {lbl}
                </button>
              ))}
            </div>

            {datePreset === 'custom' && (
              <div className="grid" style={{ marginTop: 8 }}>
                <div>
                  <label>തീയതി മുതൽ (From):</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label>തീയതി വരെ (To):</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── PERIOD BANNER ── */}
      <div className="report-period-banner">
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--maroon-dark)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            തിരഞ്ഞെടുത്ത റിപ്പോർട്ട്
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginTop: 2 }}>
            {periodTitle}
          </div>
        </div>
        <div className="report-badge-count">
          {incomeList.length + expenseList.length} ഇടപാടുകൾ
        </div>
      </div>

      {/* ── KPI METRIC CARDS ── */}
      <div className="report-kpi-grid">
        {/* Total Income */}
        <div
          className={'kpi-card income' + (reportView === 'income' ? ' active' : '')}
          onClick={() => setReportView('income')}
          style={{ cursor: 'pointer' }}
        >
          <div className="kpi-header">
            <span className="kpi-label">ആകെ വരവ്</span>
            <IconTrendingUp size={16} className="kpi-icon" />
          </div>
          <div className="kpi-amount">{fmt(totalIncome)}</div>
          <div className="kpi-sub">{incomeList.length} ആളുകൾ / വരവുകൾ ➔</div>
        </div>

        {/* Total Expense */}
        <div
          className={'kpi-card expense' + (reportView === 'expense' ? ' active' : '')}
          onClick={() => setReportView('expense')}
          style={{ cursor: 'pointer' }}
        >
          <div className="kpi-header">
            <span className="kpi-label">ആകെ ചെലവ്</span>
            <IconTrendingDown size={16} className="kpi-icon" />
          </div>
          <div className="kpi-amount">{fmt(totalExpense)}</div>
          <div className="kpi-sub">{expenseList.length} ചെലവ് ഇനങ്ങൾ ➔</div>
        </div>

        {/* Net Balance */}
        <div className={'kpi-card balance' + (reportView === 'overview' ? ' active' : '')} onClick={() => setReportView('overview')}>
          <div className="kpi-header">
            <span className="kpi-label">കൈവശമുള്ള ബാക്കി</span>
            <IconChartBar size={16} className="kpi-icon" />
          </div>
          <div className="kpi-amount" style={{ color: netBalance >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {fmt(netBalance)}
          </div>
          <div className="kpi-sub">{netBalance >= 0 ? 'നീക്കിയിരിപ്പ് മിച്ചം' : 'കമ്മി'}</div>
        </div>
      </div>

      {/* ── ACTION BUTTONS: PDF / EXCEL / WHATSAPP ── */}
      <div className="report-actions-row">
        <button
          type="button"
          className="btn-action-report pdf"
          onClick={handleExportPDF}
          disabled={pdfLoading}
        >
          {pdfLoading ? (
            <>
              <IconSpinner size={16} />
              <span>PDF തയ്യാറാക്കുന്നു...</span>
            </>
          ) : (
            <>
              <IconFileText size={17} />
              <span>PDF റിപ്പോർട്ട്</span>
            </>
          )}
        </button>

        <button
          type="button"
          className="btn-action-report excel"
          onClick={handleExportExcel}
          disabled={excelLoading}
        >
          {excelLoading ? (
            <>
              <IconSpinner size={16} />
              <span>തയ്യാറാക്കുന്നു...</span>
            </>
          ) : (
            <>
              <IconFileSpreadsheet size={17} />
              <span>എക്സൽ ഫയൽ</span>
            </>
          )}
        </button>

        <button
          type="button"
          className="btn-action-report wa"
          onClick={handleShareWhatsApp}
        >
          <IconWhatsApp size={17} />
          <span>വാട്സ്ആപ്പ്</span>
        </button>

        <button
          type="button"
          className="btn-action-report copy"
          onClick={handleCopyText}
          title="സംഗ്രഹം കോപ്പി ചെയ്യുക"
        >
          {copied ? <IconCheck size={16} style={{ color: 'var(--green)' }} /> : <IconCopy size={16} />}
          <span>{copied ? 'കോപ്പിയായി!' : 'കോപ്പി'}</span>
        </button>
      </div>

      {/* ── SUB-TABS (Overview vs Who Gave Money vs Expenses vs Monthly Summary) ── */}
      <div className="sub-tabs report-view-tabs" style={{ margin: '14px 0 16px' }}>
        <button
          type="button"
          className={'sub-tab' + (reportView === 'overview' ? ' active' : '')}
          onClick={() => setReportView('overview')}
        >
          <IconChartBar size={15} />
          <span>സംഗ്രഹം</span>
        </button>
        <button
          type="button"
          className={'sub-tab' + (reportView === 'income' ? ' active' : '')}
          onClick={() => setReportView('income')}
        >
          <IconTrendingUp size={15} style={{ color: 'var(--green)' }} />
          <span>ആരൊക്കെ തന്നു ({incomeList.length})</span>
        </button>
        <button
          type="button"
          className={'sub-tab' + (reportView === 'expense' ? ' active' : '')}
          onClick={() => setReportView('expense')}
        >
          <IconTrendingDown size={15} style={{ color: 'var(--red)' }} />
          <span>എന്തിനൊക്കെ ചെലവായി ({expenseList.length})</span>
        </button>
        {(filterMode === 'year' || filterMode === 'all') && monthlySummary.length > 0 && (
          <button
            type="button"
            className={'sub-tab' + (reportView === 'monthly' ? ' active' : '')}
            onClick={() => setReportView('monthly')}
          >
            <IconCalendar size={15} />
            <span>മാസ കണക്ക്</span>
          </button>
        )}
      </div>

      {/* ── VIEW 1: OVERVIEW ── */}
      {reportView === 'overview' && (
        <div className="report-overview-view">
          {/* COMPARATIVE PROGRESS BAR */}
          <div className="panel" style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 13.5, fontWeight: 800, margin: '0 0 10px', color: 'var(--ink)' }}>
              വരവ് — ചെലവ് അനുപാതം
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>
              <span style={{ color: 'var(--green)' }}>വരവ്: {fmt(totalIncome)}</span>
              <span style={{ color: 'var(--red)' }}>ചെലവ്: {fmt(totalExpense)}</span>
            </div>
            <div className="report-dual-progress">
              <div
                className="fill-income"
                style={{
                  width: totalIncome + totalExpense > 0
                    ? `${Math.round((totalIncome / (totalIncome + totalExpense)) * 100)}%`
                    : '50%'
                }}
              />
              <div
                className="fill-expense"
                style={{
                  width: totalIncome + totalExpense > 0
                    ? `${Math.round((totalExpense / (totalIncome + totalExpense)) * 100)}%`
                    : '50%'
                }}
              />
            </div>
            <div style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
              നീക്കിയിരിപ്പ് മിച്ചം: <b style={{ color: netBalance >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(netBalance)}</b>
            </div>
          </div>

          {/* EXPENSE CATEGORY BREAKDOWN */}
          <div className="panel" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 13.5, fontWeight: 800, margin: 0, color: 'var(--maroon)' }}>
                ചെലവുകൾ — ഇനം തിരിച്ച് (CATEGORY BREAKDOWN)
              </h3>
              <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>
                {catExpenseSummary.length} ഇനങ്ങൾ
              </span>
            </div>

            {catExpenseSummary.length === 0 ? (
              <div className="empty" style={{ padding: '24px 0' }}>
                ഈ കാലയളവിൽ ചെലവുകളൊന്നും രേഖപ്പെടുത്തിയിട്ടില്ല
              </div>
            ) : (
              catExpenseSummary.map(c => (
                <div key={c.category} className="cat-breakdown-row">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                    <span style={{ color: 'var(--ink)' }}>{c.category}</span>
                    <span style={{ color: 'var(--red)' }}>
                      {fmt(c.amount)} <span style={{ color: 'var(--muted)', fontSize: 11 }}>({c.pct}%)</span>
                    </span>
                  </div>
                  <div className="cat-bar-track">
                    <div className="cat-bar-fill" style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* QUICK LINKS TO DETAILED LISTS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <button
              type="button"
              className="btn secondary"
              style={{ padding: '12px 10px', fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              onClick={() => setReportView('income')}
            >
              <IconUsers size={16} style={{ color: 'var(--green)' }} />
              <span>പൈസ തന്നവർ ({incomeList.length})</span>
            </button>
            <button
              type="button"
              className="btn secondary"
              style={{ padding: '12px 10px', fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              onClick={() => setReportView('expense')}
            >
              <IconTrendingDown size={16} style={{ color: 'var(--red)' }} />
              <span>ചെലവുകൾ ({expenseList.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* ── VIEW 2: WHO GAVE MONEY (INCOME / CONTRIBUTORS) ── */}
      {reportView === 'income' && (
        <div className="report-income-view">
          {/* SEARCH BAR */}
          <div className="searchbar">
            <IconSearch size={18} style={{ color: 'var(--text3)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="പേര്, വീട്, രസീത് നമ്പർ തിരയുക..."
              value={incomeSearch}
              onChange={e => setIncomeSearch(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '6px 2px 12px' }}>
            <div className="count" style={{ margin: 0 }}>
              പൈസ തന്നവർ: <b>{displayedIncome.length}</b> / {incomeList.length}
            </div>
            <div style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--green)' }}>
              ആകെ: {fmt(totalIncome)}
            </div>
          </div>

          {displayedIncome.length === 0 ? (
            <div className="empty-box">
              <IconInbox size={36} style={{ color: 'var(--text3)', margin: '0 auto 8px', display: 'block' }} />
              <div>വരവുകളൊന്നും കണ്ടെത്തിയില്ല</div>
            </div>
          ) : (
            <div className="cards-list">
              {displayedIncome.map((r, i) => {
                const subParts = [
                  r.house,
                  r.receiptno ? `രസീത് #${r.receiptno}` : '',
                  r.date ? formatDisplayDate(r.date) : '',
                  r.occasion
                ].filter(Boolean);

                return (
                  <div key={r.id || i} className="card donor-card">
                    <div className="card-top">
                      <div>
                        <div className="card-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: 'var(--muted)', fontSize: 11.5, fontWeight: 600 }}>#{i + 1}</span>
                          <span>{r.name}</span>
                        </div>
                        <div className="card-sub">{subParts.join(' · ')}</div>
                      </div>
                      <div className="txn-amt income" style={{ fontSize: 16 }}>
                        + {fmt(r.amount)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── VIEW 3: WHAT WAS SPENT ON (EXPENSES) ── */}
      {reportView === 'expense' && (
        <div className="report-expense-view">
          {/* SEARCH BAR */}
          <div className="searchbar">
            <IconSearch size={18} style={{ color: 'var(--text3)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="വിവരണം, ഇനം തിരയുക..."
              value={expenseSearch}
              onChange={e => setExpenseSearch(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '6px 2px 12px' }}>
            <div className="count" style={{ margin: 0 }}>
              കണ്ടെത്തിയ ചെലവുകൾ: <b>{displayedExpenses.length}</b> / {expenseList.length}
            </div>
            <div style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--red)' }}>
              ആകെ: {fmt(totalExpense)}
            </div>
          </div>

          {displayedExpenses.length === 0 ? (
            <div className="empty-box">
              <IconInbox size={36} style={{ color: 'var(--text3)', margin: '0 auto 8px', display: 'block' }} />
              <div>ചെലവുകളൊന്നും കണ്ടെത്തിയില്ല</div>
            </div>
          ) : (
            <div className="cards-list">
              {displayedExpenses.map((r, i) => (
                <div key={r.id || i} className="card expense-card">
                  <div className="card-top">
                    <div>
                      <div className="card-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: 'var(--muted)', fontSize: 11.5, fontWeight: 600 }}>#{i + 1}</span>
                        <span>{r.desc}</span>
                      </div>
                      <div className="card-sub">
                        {r.date ? formatDisplayDate(r.date) : ''} {r.category ? `· ${r.category}` : ''}
                      </div>
                    </div>
                    <div className="txn-amt expense" style={{ fontSize: 16 }}>
                      - {fmt(r.amount)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── VIEW 4: MONTH-BY-MONTH COMPARISON TABLE ── */}
      {reportView === 'monthly' && (
        <div className="report-monthly-view">
          <div className="panel" style={{ padding: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--maroon)', marginBottom: 12 }}>
              മാസം തിരിച്ചുള്ള സാമ്പത്തിക സംഗ്രഹം (MONTHLY BREAKDOWN)
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="monthly-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--line)', color: 'var(--muted)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 6px' }}>മാസം</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>വരവ്</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>ചെലവ്</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>ബാക്കി</th>
                    <th style={{ padding: '8px 6px', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {monthlySummary.map(m => (
                    <tr key={m.monthKey} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '10px 6px', fontWeight: 700, color: 'var(--ink)' }}>
                        {m.monthLabel}
                      </td>
                      <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>
                        {fmt(m.income)}
                      </td>
                      <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700, color: 'var(--red)' }}>
                        {fmt(m.expense)}
                      </td>
                      <td
                        style={{
                          padding: '10px 6px',
                          textAlign: 'right',
                          fontWeight: 800,
                          color: m.balance >= 0 ? 'var(--green)' : 'var(--red)'
                        }}
                      >
                        {fmt(m.balance)}
                      </td>
                      <td style={{ padding: '10px 6px', textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-text"
                          style={{ fontSize: 11, padding: '2px 6px' }}
                          onClick={() => {
                            setFilterMode('month');
                            setSelectedMonth(m.monthKey);
                            setReportView('overview');
                          }}
                        >
                          കാണുക
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
