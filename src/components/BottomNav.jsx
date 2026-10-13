import { IconCoins, IconSearch, IconLedger, IconHistory } from './Icons';

export default function BottomNav({ activeTab, onChangeTab, searchCount = 0, historyCount = 0 }) {
  const tabs = [
    { id: 'pirivu_entry', label: 'പിരിവ്', Icon: IconCoins },
    { id: 'pirivu_search', label: 'തിരയുക', Icon: IconSearch, badge: searchCount > 0 ? searchCount : null },
    { id: 'ledger_entry', label: 'വരവ്-ചെലവ്', Icon: IconLedger },
    { id: 'ledger_history', label: 'ഹിസ്റ്ററി', Icon: IconHistory }
  ];

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        {tabs.map(t => {
          const isActive = activeTab === t.id;
          const Icon = t.Icon;
          return (
            <button
              key={t.id}
              className={'nav-item' + (isActive ? ' active' : '')}
              onClick={() => onChangeTab(t.id)}
            >
              <div className="nav-icon-wrap">
                <Icon size={22} className="nav-icon" />
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
