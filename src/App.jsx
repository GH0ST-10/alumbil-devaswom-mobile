import { useState } from 'react';
import { loadLS, saveLS, LS_PIRIVU, LS_LEDGER } from './utils';
import { shareStatement } from './pdf';
import Header from './components/Header';
import PirivuSection from './components/PirivuSection';
import LedgerSection from './components/LedgerSection';

export default function App() {
  const [activeTab, setActiveTab] = useState('pirivu');
  const [pirivuRecords, setPirivuRecords] = useState(() => loadLS(LS_PIRIVU));
  const [ledgerRecords, setLedgerRecords] = useState(() => loadLS(LS_LEDGER));
  const [statementLoading, setStatementLoading] = useState(false);

  const handleStatement = async () => {
    setStatementLoading(true);
    try { await shareStatement(pirivuRecords, ledgerRecords); }
    catch { alert('സ്റ്റേറ്റ്മെന്റ് തയ്യാറാക്കാനായില്ല.'); }
    setStatementLoading(false);
  };

  return (
    <>
      <Header
        pirivuRecords={pirivuRecords}
        ledgerRecords={ledgerRecords}
        onStatement={handleStatement}
        statementLoading={statementLoading}
      />

      <div className="wrap">
        {/* TABS */}
        <div className="tabs">
          <div id="tab-pirivu" className={'tab' + (activeTab === 'pirivu' ? ' active' : '')} onClick={() => setActiveTab('pirivu')}>
            🪙 പണപ്പിരിവ്
          </div>
          <div id="tab-ledger" className={'tab' + (activeTab === 'ledger' ? ' active' : '')} onClick={() => setActiveTab('ledger')}>
            📒 വരവ്-ചെലവ്
          </div>
        </div>

        {/* SECTIONS */}
        {activeTab === 'pirivu' && (
          <PirivuSection
            pirivuRecords={pirivuRecords}
            setPirivuRecords={setPirivuRecords}
            ledgerRecords={ledgerRecords}
            setLedgerRecords={setLedgerRecords}
          />
        )}
        {activeTab === 'ledger' && (
          <LedgerSection
            ledgerRecords={ledgerRecords}
            setLedgerRecords={setLedgerRecords}
          />
        )}
      </div>
    </>
  );
}
