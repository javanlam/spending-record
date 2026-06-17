import React, { useState } from 'react';
import type { Currency } from '../types';
import Modal from './Modal';

interface Props {
  currencies: Currency[];
  onAddCurrency: (code: string, rate: number) => void;
  onRemoveCurrency: (code: string) => void;
}

export default function CurrenciesInput({ currencies, onAddCurrency, onRemoveCurrency }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [code, setCode] = useState('');
  const [rate, setRate] = useState('');

  const handleAdd = () => {
    const trimmedCode = code.trim().toUpperCase();
    const parsedRate = parseFloat(rate);
    if (trimmedCode && !isNaN(parsedRate) && parsedRate > 0) {
      onAddCurrency(trimmedCode, parsedRate);
      setCode('');
      setRate('');
    } else {
      alert('Please enter a valid currency code and positive rate.');
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="btn-secondary text-sm"
      >
        💱 Manage Currencies
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Currencies & Exchange Rates">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Code (e.g. USD)"
              className="dark-input flex-1 min-w-[100px]"
            />
            <input
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="Rate to HKD"
              step="any"
              className="dark-input w-32"
            />
            <button onClick={handleAdd} className="btn-primary">
              Add
            </button>
          </div>

          <ul className="flex flex-wrap gap-2">
            {currencies.map(c => (
              <li key={c.code} className="flex items-center bg-[#0f1f3a] px-3 py-1 rounded-full">
                <span className="text-sm text-gray-300 mr-2">
                  {c.code} → {c.rateToHKD} HKD
                </span>
                {c.code !== 'HKD' && (
                  <button
                    onClick={() => onRemoveCurrency(c.code)}
                    className="text-gray-500 hover:text-red-400 transition"
                  >
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </Modal>
    </>
  );
}