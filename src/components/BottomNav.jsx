export default function BottomNav({ activeTab, onChangeTab, searchCount = 0, historyCount = 0 }) {
  const tabs = [
    { id: 'pirivu_entry', label: 'പിരിവ്', icon: '🪙' },
    { id: 'pirivu_search', label: 'തിരയുക', icon: '🔍', badge: searchCount > 0 ? searchCount : null },
    { id: 'ledger_entry', label: 'വരവ്-ചെലവ്', icon: '📒' },
    { id: 'ledger_history', label: 'ഹിസ്റ്ററി', icon: '📜' }
  ];

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        {tabs.map(t => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              className={'nav-item' + (isActive ? ' active' : '')}
              onClick={() => onChangeTab(t.id)}
            >
              <div className="nav-icon-wrap">
                <span className="nav-icon">{t.icon}</span>
                {t.badge != null && <span className="nav-badge">{t.badge}</span>}
              </div>
              <span className="nav-label">{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
