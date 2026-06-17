import type { Settlement, Person } from '../types';

interface Props {
  settlement: Settlement[];
  people: Person[];
  onBack: () => void;
}

export default function SettlementResult({ settlement, people, onBack }: Props) {
  const getName = (id: string) => people.find(p => p.id === id)?.name || id;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white">🧾 Settlement</h2>
      {settlement.length === 0 ? (
        <div className="bg-green-900/30 border border-green-700 p-4 rounded-lg text-center text-green-300">
          ✅ All balances are settled! No one owes anyone.
        </div>
      ) : (
        <ul className="space-y-2">
          {settlement.map((s, idx) => (
            <li key={idx} className="bg-[#0f1f3a] border border-[#2a3d6a] p-3 rounded-lg flex items-center gap-2">
              <span className="font-medium text-white">{getName(s.from)}</span>
              <span className="text-gray-400">→</span>
              <span className="font-medium text-white">{getName(s.to)}</span>
              <span className="ml-auto bg-blue-900/40 text-blue-300 px-3 py-1 rounded-full text-sm">
                {s.amount.toFixed(2)} HKD
              </span>
            </li>
          ))}
        </ul>
      )}
      <button onClick={onBack} className="btn-secondary">
        ← Back to Logs
      </button>
    </div>
  );
}