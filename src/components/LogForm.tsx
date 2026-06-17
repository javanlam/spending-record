import React, { useState, useEffect } from 'react';
import type { Person, Currency, SpendingLog } from '../types';

interface Props {
  people: Person[];
  currencies: Currency[];
  initialLog?: SpendingLog | Omit<SpendingLog, 'id'>;
  onSubmit: (log: Omit<SpendingLog, 'id'>) => void;
  submitLabel: string;
  onCancel?: () => void;
}

export default function LogForm({ people, currencies, initialLog, onSubmit, submitLabel, onCancel }: Props) {
  const [item, setItem] = useState(initialLog?.item || '');
  const [amount, setAmount] = useState(initialLog?.amount?.toString() || '');
  const [currency, setCurrency] = useState(initialLog?.currency || 'HKD');
  const [paidBy, setPaidBy] = useState(initialLog?.paidBy || (people[0]?.id || ''));
  const [channel, setChannel] = useState(initialLog?.channel || '');
  const [involvedMode, setInvolvedMode] = useState<'all' | 'manual'>(
    initialLog?.involved?.length === 0 ? 'all' : 'manual'
  );
  const [selectedInvolved, setSelectedInvolved] = useState<string[]>(
    initialLog?.involved || []
  );
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>(
    initialLog?.shares ? 'custom' : 'equal'
  );
  const [customShares, setCustomShares] = useState<Record<string, string>>(() => {
    if (initialLog?.shares) {
      const obj: Record<string, string> = {};
      for (const [id, val] of Object.entries(initialLog.shares)) {
        obj[id] = val.toString();
      }
      return obj;
    }
    return {};
  });

  // When people change, ensure selectedInvolved remains valid
  useEffect(() => {
    setSelectedInvolved(prev => prev.filter(id => people.some(p => p.id === id)));
    setCustomShares(prev => {
      const newShares: Record<string, string> = {};
      for (const id of people.map(p => p.id)) {
        if (prev[id] !== undefined) newShares[id] = prev[id];
      }
      return newShares;
    });
  }, [people]);

  const getInvolvedIds = (): string[] => {
    if (involvedMode === 'all') return people.map(p => p.id);
    return selectedInvolved;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!item.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please fill in item and a positive amount.');
      return;
    }
    if (!paidBy) {
      alert('Please select who paid.');
      return;
    }
    const involvedIds = getInvolvedIds();
    if (involvedIds.length === 0) {
      alert('Please select at least one involved person or choose "All".');
      return;
    }

    let shares: Record<string, number> | undefined;
    if (splitMode === 'custom') {
      shares = {};
      let total = 0;
      for (const id of involvedIds) {
        const val = parseFloat(customShares[id] || '0');
        if (isNaN(val) || val < 0) {
          alert('Please enter valid positive numbers for all shares.');
          return;
        }
        shares[id] = val;
        total += val;
      }
      if (Math.abs(total - parsedAmount) > 0.001) {
        alert(`Total shares (${total.toFixed(2)}) must equal the total amount (${parsedAmount.toFixed(2)}).`);
        return;
      }
    }

    onSubmit({
      item: item.trim(),
      amount: parsedAmount,
      currency,
      paidBy,
      channel: channel.trim(),
      involved: involvedMode === 'all' ? [] : selectedInvolved,
      shares,
    });

    if (!initialLog) {
      setItem('');
      setAmount('');
      setCurrency('HKD');
      setPaidBy(people[0]?.id || '');
      setChannel('');
      setInvolvedMode('all');
      setSelectedInvolved([]);
      setSplitMode('equal');
      setCustomShares({});
    }
  };

  const toggleInvolved = (id: string) => {
    setSelectedInvolved(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleShareChange = (id: string, value: string) => {
    setCustomShares(prev => ({ ...prev, [id]: value }));
  };

  const involvedIds = getInvolvedIds();

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Item Name</label>
        <input
          type="text"
          placeholder="e.g. Dinner"
          value={item}
          onChange={(e) => setItem(e.target.value)}
          className="dark-input w-full"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Amount</label>
          <input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="any"
            className="dark-input w-full"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="dark-input w-full"
          >
            {currencies.map(c => (
              <option key={c.code} value={c.code}>{c.code}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Paid By</label>
        <select
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
          className="dark-input w-full"
        >
          {people.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Payment Channel</label>
        <input
          type="text"
          placeholder="e.g. Cash, PayMe, Bank Transfer"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="dark-input w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Involved</label>
        <div className="flex items-center gap-4 mb-2">
          <label className="flex items-center gap-1 text-sm text-gray-300">
            <input
              type="radio"
              value="all"
              checked={involvedMode === 'all'}
              onChange={() => setInvolvedMode('all')}
            /> All
          </label>
          <label className="flex items-center gap-1 text-sm text-gray-300">
            <input
              type="radio"
              value="manual"
              checked={involvedMode === 'manual'}
              onChange={() => setInvolvedMode('manual')}
            /> Select
          </label>
        </div>
        {involvedMode === 'manual' && (
          <div className="flex flex-wrap gap-2">
            {people.map(p => (
              <label key={p.id} className="flex items-center gap-1 text-sm bg-[#0f1f3a] px-3 py-1 rounded-full text-gray-300">
                <input
                  type="checkbox"
                  checked={selectedInvolved.includes(p.id)}
                  onChange={() => toggleInvolved(p.id)}
                />
                {p.name}
              </label>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Split</label>
        <div className="flex items-center gap-4 mb-2">
          <label className="flex items-center gap-1 text-sm text-gray-300">
            <input
              type="radio"
              value="equal"
              checked={splitMode === 'equal'}
              onChange={() => setSplitMode('equal')}
            /> Equal split
          </label>
          <label className="flex items-center gap-1 text-sm text-gray-300">
            <input
              type="radio"
              value="custom"
              checked={splitMode === 'custom'}
              onChange={() => {
                setSplitMode('custom');
                // Initialize shares for involved people with equal distribution
                const ids = getInvolvedIds();
                const equalShare = parseFloat(amount) / ids.length || 0;
                const sharesObj: Record<string, string> = {};
                for (const id of ids) {
                  sharesObj[id] = equalShare.toFixed(2);
                }
                setCustomShares(sharesObj);
              }}
            /> Custom shares
          </label>
        </div>
        {splitMode === 'custom' && (
          <div className="grid grid-cols-2 gap-2">
            {involvedIds.map(id => {
              const person = people.find(p => p.id === id);
              return (
                <div key={id} className="flex items-center gap-2">
                  <span className="text-sm text-gray-400 w-16">{person?.name}</span>
                  <input
                    type="number"
                    step="any"
                    value={customShares[id] || ''}
                    onChange={(e) => handleShareChange(id, e.target.value)}
                    className="dark-input w-full"
                    placeholder="0.00"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn-primary">
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}