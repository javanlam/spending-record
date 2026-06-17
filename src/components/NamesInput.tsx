import { useState } from 'react';
import type { Person } from '../types';

interface Props {
  people: Person[];
  onAddPerson: (name: string) => void;
  onRemovePerson: (id: string) => void;
  onImportCSV: (csv: string) => void;
  onProceed: () => void;
}

export default function NamesInput({ people, onAddPerson, onRemovePerson, onImportCSV, onProceed }: Props) {
  const [name, setName] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const handleAdd = () => {
    if (name.trim() && !people.some(p => p.name === name.trim())) {
      onAddPerson(name.trim());
      setName('');
    }
  };

  const handleImport = () => {
    if (!csvFile) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      onImportCSV(text);
    };
    reader.readAsText(csvFile);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Step 1: Add People</h2>

      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter name"
          className="dark-input flex-1"
        />
        <button onClick={handleAdd} className="btn-primary">
          Add
        </button>
      </div>

      {people.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {people.map(p => (
            <li key={p.id} className="flex items-center bg-[#0f1f3a] px-3 py-1 rounded-full">
              <span className="text-gray-300 mr-2">{p.name}</span>
              <button
                onClick={() => onRemovePerson(p.id)}
                className="text-gray-500 hover:text-red-400 transition"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-gray-700 pt-4">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Or import from CSV</h3>
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
            className="text-sm text-gray-400 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:bg-[#2a3d6a] file:text-gray-300 hover:file:bg-[#3a4d7a]"
          />
          <button
            onClick={handleImport}
            disabled={!csvFile}
            className="btn-secondary disabled:opacity-50"
          >
            Import
          </button>
        </div>
      </div>

      <div className="pt-4">
        <button
          onClick={onProceed}
          disabled={people.length < 2}
          className="w-full btn-success disabled:opacity-50"
        >
          Proceed to Logs ({people.length} people)
        </button>
      </div>
    </div>
  );
}