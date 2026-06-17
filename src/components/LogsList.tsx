import React, { useState } from 'react';
import type { Person, Currency, SpendingLog } from '../types';
import LogForm from './LogForm';
import Modal from './Modal';

interface Props {
  logs: SpendingLog[];
  people: Person[];
  currencies: Currency[];
  onAddLog: (log: Omit<SpendingLog, 'id'>) => void;
  onEditLog: (log: SpendingLog) => void;
  onDeleteLog: (id: string) => void;
  onExportCSV: () => void;
  onComputeSettlement: () => void;
}

export default function LogsList({
  logs,
  people,
  currencies,
  onAddLog,
  onEditLog,
  onDeleteLog,
  onExportCSV,
  onComputeSettlement,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  return (
    <div className="flex flex-col flex-1 min-h-[200px] space-y-4">
      {/* Header with actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold text-white">📋 Spending Logs</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setIsAddModalOpen(true)} className="btn-primary">
            ➕ Add Log
          </button>
          <button onClick={onExportCSV} className="btn-secondary">
            📥 Export CSV
          </button>
          <button onClick={onComputeSettlement} className="btn-success">
            🧮 Settle
          </button>
        </div>
      </div>

      {/* Modal for adding log */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Spending Log">
        <LogForm
          people={people}
          currencies={currencies}
          onSubmit={(log) => {
            onAddLog(log);
            setIsAddModalOpen(false);
          }}
          submitLabel="Add Log"
          onCancel={() => setIsAddModalOpen(false)}
        />
      </Modal>

      {/* Table of logs - expand to fill available space */}
      <div className="flex-1 overflow-x-auto">
        {logs.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No logs yet. Click "Add Log" to get started!</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="pb-2 pr-4">Item</th>
                <th className="pb-2 pr-4">Amount</th>
                <th className="pb-2 pr-4">Paid By</th>
                <th className="pb-2 pr-4">Channel</th>
                <th className="pb-2 pr-4">Involved / Shares</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b border-gray-700/50 hover:bg-[#1a2a4a]/50 transition">
                  {editingId === log.id ? (
                    <td colSpan={6} className="py-3">
                      <LogForm
                        people={people}
                        currencies={currencies}
                        initialLog={log}
                        onSubmit={(updated) => {
                          onEditLog({ ...updated, id: log.id });
                          setEditingId(null);
                        }}
                        submitLabel="Save"
                        onCancel={() => setEditingId(null)}
                      />
                    </td>
                  ) : (
                    <>
                      <td className="py-3 pr-4 text-white">{log.item}</td>
                      <td className="py-3 pr-4 text-blue-300 font-medium">
                        {log.amount} {log.currency}
                      </td>
                      <td className="py-3 pr-4 text-gray-300">
                        {people.find(p => p.id === log.paidBy)?.name || 'Unknown'}
                      </td>
                      <td className="py-3 pr-4 text-gray-400">{log.channel || '—'}</td>
                      <td className="py-3 pr-4 text-gray-400">
                        {log.involved.length === 0
                          ? 'All'
                          : log.involved.map(id => people.find(p => p.id === id)?.name || id).join(', ')}
                        {log.shares && (
                          <span className="ml-2 text-xs text-blue-400">
                            (custom shares)
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right space-x-1">
                        <button
                          onClick={() => setEditingId(log.id)}
                          className="text-blue-400 hover:text-blue-300 transition text-sm"
                        >
                          ✎ Edit
                        </button>
                        <button
                          onClick={() => onDeleteLog(log.id)}
                          className="text-red-400 hover:text-red-300 transition text-sm"
                        >
                          ✕ Delete
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}