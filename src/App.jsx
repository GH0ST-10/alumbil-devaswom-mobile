import { useState, useEffect } from 'react';
import { loadLS, saveLS, LS_PIRIVU, LS_LEDGER } from './utils';
import { shareStatement } from './pdf';
import { subscribeToPirivu, subscribeToLedger, migrateLocalToCloud } from './services/db';
import Header from './components/Header';
import PirivuEntry from './components/PirivuEntry';
import SearchPeople from './components/SearchPeople';
import LedgerEntry from './components/LedgerEntry';
import LedgerHistory from './components/LedgerHistory';
import FinancialReports from './components/FinancialReports';
import BottomNav from './components/BottomNav';
import PinModal, { LS_ADMIN_AUTH } from './components/PinModal';
import UpdateBanner from './components/UpdateBanner';
import { useAppUpdate } from './useAppUpdate';

import { IconCoins, IconLedger, IconPlus, IconSearch, IconHistory, IconChartBar } from './components/Icons';

export default function App() {
  const [activeTab, setActiveTab] = useState('pirivu_entry');
  const [pirivuRecords, setPirivuRecords] = useState(() => loadLS(LS_PIRIVU));
  const [ledgerRecords, setLedgerRecords] = useState(() => loadLS(LS_LEDGER));
  const [editingPerson, setEditingPerson] = useState(null);
  const [editingLedger, setEditingLedger] = useState(null);
  const [statementLoading, setStatementLoading] = useState(false);

  // Cloud & Security state
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem(LS_ADMIN_AUTH) === 'true');
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pendingUnlockAction, setPendingUnlockAction] = useState(null);
  const [migrating, setMigrating] = useState(false);

  // Auto-update check
  const { updateAvailable, remoteInfo, dismiss } = useAppUpdate();

  // Network listener (Online / Offline status)
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Real-time Cloud Synchronization (Works offline via Firestore cache)
  useEffect(() => {
    const unsubPirivu = subscribeToPirivu(cloudList => {
      if (cloudList && cloudList.length > 0) {
        setPirivuRecords(cloudList);
        saveLS(LS_PIRIVU, cloudList);
      }
    });

    const unsubLedger = subscribeToLedger(cloudList => {
      if (cloudList && cloudList.length > 0) {
        setLedgerRecords(cloudList);
        saveLS(LS_LEDGER, cloudList);
      }
    });

    return () => {
      unsubPirivu();
      unsubLedger();
    };
  }, []);

  const handleToggleAdmin = () => {
    if (isAdmin) {
      setIsAdmin(false);
      localStorage.removeItem(LS_ADMIN_AUTH);
    } else {
      setPinModalOpen(true);
    }
  };

  const handleRequestUnlock = actionCallback => {
    if (isAdmin) {
      actionCallback();
    } else {
      setPendingUnlockAction(() => actionCallback);
      setPinModalOpen(true);
    }
  };

  const handleUnlockSuccess = () => {
    setIsAdmin(true);
    if (pendingUnlockAction) {
      pendingUnlockAction();
      setPendingUnlockAction(null);
    }
  };

  const handleMigrate = async () => {
    if (migrating) return;
    setMigrating(true);
    try {
      const count = await migrateLocalToCloud(pirivuRecords, ledgerRecords);
      alert(`വിവരങ്ങൾ (${count} എണ്ണം) ക്ലൗഡിലേക്ക് വിജയകരമായി സിങ്ക് ചെയ്തു!`);
    } catch {
      alert('ക്ലൗഡ് സിങ്ക് ചെയ്യുമ്പോൾ തടസ്സം നേരിട്ടു. ഇന്റർനെറ്റ് ഉണ്ടെന്ന് ഉറപ്പാക്കുക.');
    } finally {
      setMigrating(false);
    }
  };

  const handleStatement = async () => {
    setStatementLoading(true);
    try {
      await shareStatement(pirivuRecords, ledgerRecords);
    } catch {
      alert('സ്റ്റേറ്റ്മെന്റ് തയ്യാറാക്കാനായില്ല.');
    } finally {
      setStatementLoading(false);
    }
  };

  const handleEditPerson = person => {
    setEditingPerson(person);
    setActiveTab('pirivu_entry');
  };

  const handleEditLedger = ledger => {
    setEditingLedger(ledger);
    setActiveTab('ledger_entry');
  };

  return (
    <div className="app-container">
      <Header
        pirivuRecords={pirivuRecords}
        ledgerRecords={ledgerRecords}
        onStatement={handleStatement}
        statementLoading={statementLoading}
        onGoToReports={() => setActiveTab('reports')}
        isAdmin={isAdmin}
        isOnline={isOnline}
        onToggleAdmin={handleToggleAdmin}
        onMigrate={handleMigrate}
        canMigrate={pirivuRecords.length > 0 && !migrating}
      />

      <main className="wrap content-area">
        {/* TOP SEGMENTED SWITCHER (Quick Page Group) */}
        <div className="tabs">
          <div
            className={'tab' + (activeTab.startsWith('pirivu') ? ' active' : '')}
            onClick={() => setActiveTab(activeTab === 'pirivu_search' ? 'pirivu_search' : 'pirivu_entry')}
          >
            <IconCoins size={17} />
            <span>പണപ്പിരിവ്</span>
          </div>
          <div
            className={'tab' + (activeTab.startsWith('ledger') ? ' active' : '')}
            onClick={() => setActiveTab(activeTab === 'ledger_history' ? 'ledger_history' : 'ledger_entry')}
          >
            <IconLedger size={17} />
            <span>വരവ്-ചെലവ്</span>
          </div>
          <div
            className={'tab' + (activeTab === 'reports' ? ' active' : '')}
            onClick={() => setActiveTab('reports')}
          >
            <IconChartBar size={17} />
            <span>കണക്ക് റിപ്പോർട്ട്</span>
          </div>
        </div>

        {/* SUB-TABS (Entry vs Search/History) */}
        {!activeTab.startsWith('reports') && (
          <div className="sub-tabs">
            {activeTab.startsWith('pirivu') ? (
              <>
                <button
                  className={'sub-tab' + (activeTab === 'pirivu_entry' ? ' active' : '')}
                  onClick={() => setActiveTab('pirivu_entry')}
                >
                  <IconPlus size={16} />
                  <span>ചേർക്കുക</span>
                </button>
                <button
                  className={'sub-tab' + (activeTab === 'pirivu_search' ? ' active' : '')}
                  onClick={() => setActiveTab('pirivu_search')}
                >
                  <IconSearch size={16} />
                  <span>ആളുകളെ തിരയുക ({pirivuRecords.length})</span>
                </button>
              </>
            ) : (
              <>
                <button
                  className={'sub-tab' + (activeTab === 'ledger_entry' ? ' active' : '')}
                  onClick={() => setActiveTab('ledger_entry')}
                >
                  <IconPlus size={16} />
                  <span>ഇടപാട് ചേർക്കുക</span>
                </button>
                <button
                  className={'sub-tab' + (activeTab === 'ledger_history' ? ' active' : '')}
                  onClick={() => setActiveTab('ledger_history')}
                >
                  <IconHistory size={16} />
                  <span>ഹിസ്റ്ററി ({ledgerRecords.length})</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* PAGES */}
        {activeTab === 'pirivu_entry' && (
          <PirivuEntry
            pirivuRecords={pirivuRecords}
            setPirivuRecords={setPirivuRecords}
            ledgerRecords={ledgerRecords}
            setLedgerRecords={setLedgerRecords}
            editingPerson={editingPerson}
            onClearEditing={() => setEditingPerson(null)}
            onGoToSearch={() => setActiveTab('pirivu_search')}
            isAdmin={isAdmin}
            onRequestUnlock={handleRequestUnlock}
          />
        )}

        {activeTab === 'pirivu_search' && (
          <SearchPeople
            pirivuRecords={pirivuRecords}
            setPirivuRecords={setPirivuRecords}
            ledgerRecords={ledgerRecords}
            setLedgerRecords={setLedgerRecords}
            onEditPerson={handleEditPerson}
            onGoToEntry={() => {
              setEditingPerson(null);
              setActiveTab('pirivu_entry');
            }}
            isAdmin={isAdmin}
            onRequestUnlock={handleRequestUnlock}
          />
        )}

        {activeTab === 'ledger_entry' && (
          <LedgerEntry
            ledgerRecords={ledgerRecords}
            setLedgerRecords={setLedgerRecords}
            editingLedger={editingLedger}
            onClearEditing={() => setEditingLedger(null)}
            onGoToHistory={() => setActiveTab('ledger_history')}
            isAdmin={isAdmin}
            onRequestUnlock={handleRequestUnlock}
          />
        )}

        {activeTab === 'ledger_history' && (
          <LedgerHistory
            ledgerRecords={ledgerRecords}
            setLedgerRecords={setLedgerRecords}
            pirivuRecords={pirivuRecords}
            setPirivuRecords={setPirivuRecords}
            onEditLedger={handleEditLedger}
            onGoToLedgerEntry={() => {
              setEditingLedger(null);
              setActiveTab('ledger_entry');
            }}
            onStatement={handleStatement}
            statementLoading={statementLoading}
            onGoToReports={() => setActiveTab('reports')}
            isAdmin={isAdmin}
            onRequestUnlock={handleRequestUnlock}
          />
        )}

        {activeTab === 'reports' && (
          <FinancialReports
            pirivuRecords={pirivuRecords}
            ledgerRecords={ledgerRecords}
            onStatement={handleStatement}
            statementLoading={statementLoading}
          />
        )}
      </main>

      {/* AUTO-UPDATE BANNER */}
      {updateAvailable && (
        <UpdateBanner remoteInfo={remoteInfo} onLater={dismiss} />
      )}

      {/* APPLE iOS BOTTOM NAVIGATION BAR */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={id => {
          if (id === 'pirivu_entry') setEditingPerson(null);
          if (id === 'ledger_entry') setEditingLedger(null);
          setActiveTab(id);
        }}
        searchCount={pirivuRecords.length}
        historyCount={ledgerRecords.length}
      />

      {/* 4-DIGIT TEMPLE PIN DIALOG */}
      <PinModal
        isOpen={pinModalOpen}
        onClose={() => {
          setPinModalOpen(false);
          setPendingUnlockAction(null);
        }}
        onSuccess={handleUnlockSuccess}
      />
    </div>
  );
}
