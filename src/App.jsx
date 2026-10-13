import { useState } from 'react';
import { loadLS, LS_PIRIVU, LS_LEDGER } from './utils';
import { shareStatement } from './pdf';
import Header from './components/Header';
import PirivuEntry from './components/PirivuEntry';
import SearchPeople from './components/SearchPeople';
import LedgerEntry from './components/LedgerEntry';
import LedgerHistory from './components/LedgerHistory';
import BottomNav from './components/BottomNav';

export default function App() {
  const [activeTab, setActiveTab] = useState('pirivu_entry');
  const [pirivuRecords, setPirivuRecords] = useState(() => loadLS(LS_PIRIVU));
  const [ledgerRecords, setLedgerRecords] = useState(() => loadLS(LS_LEDGER));
  const [editingPerson, setEditingPerson] = useState(null);
  const [editingLedger, setEditingLedger] = useState(null);
  const [statementLoading, setStatementLoading] = useState(false);

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
      />

      <main className="wrap content-area">
        {/* TOP SEGMENTED SWITCHER (Quick Page Group) */}
        <div className="tabs">
          <div
            className={'tab' + (activeTab.startsWith('pirivu') ? ' active' : '')}
            onClick={() => setActiveTab(activeTab === 'pirivu_search' ? 'pirivu_search' : 'pirivu_entry')}
          >
            🪙 പണപ്പിരിവ്
          </div>
          <div
            className={'tab' + (activeTab.startsWith('ledger') ? ' active' : '')}
            onClick={() => setActiveTab(activeTab === 'ledger_history' ? 'ledger_history' : 'ledger_entry')}
          >
            📒 വരവ്-ചെലവ്
          </div>
        </div>

        {/* SUB-TABS (Entry vs Search/History) */}
        <div className="sub-tabs">
          {activeTab.startsWith('pirivu') ? (
            <>
              <button
                className={'sub-tab' + (activeTab === 'pirivu_entry' ? ' active' : '')}
                onClick={() => setActiveTab('pirivu_entry')}
              >
                ➕ ചേർക്കുക (Entry)
              </button>
              <button
                className={'sub-tab' + (activeTab === 'pirivu_search' ? ' active' : '')}
                onClick={() => setActiveTab('pirivu_search')}
              >
                🔍 ആളുകളെ തിരയുക ({pirivuRecords.length})
              </button>
            </>
          ) : (
            <>
              <button
                className={'sub-tab' + (activeTab === 'ledger_entry' ? ' active' : '')}
                onClick={() => setActiveTab('ledger_entry')}
              >
                ➕ ഇടപാട് ചേർക്കുക
              </button>
              <button
                className={'sub-tab' + (activeTab === 'ledger_history' ? ' active' : '')}
                onClick={() => setActiveTab('ledger_history')}
              >
                📜 ഹിസ്റ്ററി ({ledgerRecords.length})
              </button>
            </>
          )}
        </div>

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
          />
        )}

        {activeTab === 'ledger_entry' && (
          <LedgerEntry
            ledgerRecords={ledgerRecords}
            setLedgerRecords={setLedgerRecords}
            editingLedger={editingLedger}
            onClearEditing={() => setEditingLedger(null)}
            onGoToHistory={() => setActiveTab('ledger_history')}
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
          />
        )}
      </main>

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
    </div>
  );
}
