import { useReducer } from 'react';
import './styles/App.css';
import type { Person, Currency, SpendingLog, Settlement } from './types';
import { exportLogsToCSV, importLogsFromCSV } from './utils/csv';
import { computeSettlement } from './utils/settlement';
import NamesInput from './components/NamesInput';
import CurrenciesInput from './components/CurrenciesInput';
import LogsList from './components/LogsList';
import SettlementResult from './components/SettlementResult';

// --- State and reducer (same as before, but add PROCEED_TO_LOGS) ---
interface AppState {
  people: Person[];
  currencies: Currency[];
  logs: SpendingLog[];
  stage: 'names' | 'logs' | 'settlement';
  settlement: Settlement[] | null;
}

type Action =
  | { type: 'SET_PEOPLE'; payload: Person[] }
  | { type: 'ADD_PERSON'; payload: Person }
  | { type: 'REMOVE_PERSON'; payload: string }
  | { type: 'SET_CURRENCIES'; payload: Currency[] }
  | { type: 'ADD_CURRENCY'; payload: Currency }
  | { type: 'REMOVE_CURRENCY'; payload: string }
  | { type: 'ADD_LOG'; payload: Omit<SpendingLog, 'id'> }
  | { type: 'EDIT_LOG'; payload: SpendingLog }
  | { type: 'DELETE_LOG'; payload: string }
  | { type: 'COMPUTE_SETTLEMENT' }
  | { type: 'RESET_SETTLEMENT' }
  | { type: 'PROCEED_TO_LOGS' }
  | { type: 'IMPORT_LOGS'; payload: { logs: Omit<SpendingLog, 'id'>[]; people: Person[]; currencies: Currency[] } };

const initialState: AppState = {
  people: [],
  currencies: [{ code: 'HKD', rateToHKD: 1 }],
  logs: [],
  stage: 'names',
  settlement: null,
};

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_PEOPLE':
      return { ...state, people: action.payload };
    case 'ADD_PERSON':
      return { ...state, people: [...state.people, action.payload] };
    case 'REMOVE_PERSON':
      return { ...state, people: state.people.filter(p => p.id !== action.payload) };
    case 'SET_CURRENCIES':
      return { ...state, currencies: action.payload };
    case 'ADD_CURRENCY':
      return { ...state, currencies: [...state.currencies, action.payload] };
    case 'REMOVE_CURRENCY':
      return { ...state, currencies: state.currencies.filter(c => c.code !== action.payload) };
    case 'ADD_LOG':
      return {
        ...state,
        logs: [...state.logs, { ...action.payload, id: crypto.randomUUID() }],
        stage: 'logs',
        settlement: null,
      };
    case 'EDIT_LOG': {
      const idx = state.logs.findIndex(l => l.id === action.payload.id);
      if (idx === -1) return state;
      const newLogs = [...state.logs];
      newLogs[idx] = action.payload;
      return { ...state, logs: newLogs, settlement: null };
    }
    case 'DELETE_LOG':
      return { ...state, logs: state.logs.filter(l => l.id !== action.payload), settlement: null };
    case 'IMPORT_LOGS':
      return {
        ...state,
        people: action.payload.people,
        logs: action.payload.logs.map(l => ({ ...l, id: crypto.randomUUID() })),
        currencies: action.payload.currencies,
        stage: 'logs',
        settlement: null,
      };
    case 'COMPUTE_SETTLEMENT': {
      const settlement = computeSettlement(state.logs, state.people, state.currencies);
      return { ...state, settlement, stage: 'settlement' };
    }
    case 'RESET_SETTLEMENT':
      return { ...state, settlement: null, stage: 'logs' };
    case 'PROCEED_TO_LOGS':
      return { ...state, stage: 'logs' };
    default:
      return state;
  }
}

function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const handleExportCSV = () => {
    if (state.logs.length === 0) return;
    const csv = exportLogsToCSV(state.logs, state.people, state.currencies);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spending_logs.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = (csvString: string) => {
    const { logs, people, currencies } = importLogsFromCSV(
      csvString,
      state.people,
      state.currencies
    );
    dispatch({ type: 'IMPORT_LOGS', payload: { logs, people, currencies } });
  };

  const renderStage = () => {
    switch (state.stage) {
      case 'names':
        return (
          <NamesInput
            people={state.people}
            onAddPerson={(name) => {
              const newPerson = { id: crypto.randomUUID(), name };
              dispatch({ type: 'ADD_PERSON', payload: newPerson });
            }}
            onRemovePerson={(id) => dispatch({ type: 'REMOVE_PERSON', payload: id })}
            onImportCSV={handleImportCSV}
            onProceed={() => {
              if (state.people.length >= 2) {
                dispatch({ type: 'PROCEED_TO_LOGS' });
              } else {
                alert('Please add at least 2 people.');
              }
            }}
          />
        );
      case 'logs':
        return (
          <div className="flex flex-col flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <CurrenciesInput
                currencies={state.currencies}
                onAddCurrency={(code, rate) => {
                  if (state.currencies.some(c => c.code === code)) {
                    alert('Currency already exists.');
                    return;
                  }
                  dispatch({ type: 'ADD_CURRENCY', payload: { code, rateToHKD: rate } });
                }}
                onRemoveCurrency={(code) => dispatch({ type: 'REMOVE_CURRENCY', payload: code })}
              />
              <span className="text-sm text-gray-400">
                {state.currencies.length} currencies
              </span>
            </div>
            <LogsList
              logs={state.logs}
              people={state.people}
              currencies={state.currencies}
              onAddLog={(log) => dispatch({ type: 'ADD_LOG', payload: log })}
              onEditLog={(log) => dispatch({ type: 'EDIT_LOG', payload: log })}
              onDeleteLog={(id) => dispatch({ type: 'DELETE_LOG', payload: id })}
              onExportCSV={handleExportCSV}
              onComputeSettlement={() => dispatch({ type: 'COMPUTE_SETTLEMENT' })}
            />
          </div>
        );
      case 'settlement':
        return (
          <SettlementResult
            settlement={state.settlement!}
            people={state.people}
            onBack={() => dispatch({ type: 'RESET_SETTLEMENT' })}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col py-8 px-4">
      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col">
        <h1 className="text-3xl font-bold text-white text-center mb-8">
          💰 Spending Tracker
        </h1>
        <div className="bg-[#0f1f3a]/80 backdrop-blur-sm rounded-2xl shadow-2xl p-6 md:p-8 border border-white/5 flex-1 flex flex-col">
          {renderStage()}
        </div>
      </div>
    </div>
  );
}

export default App;