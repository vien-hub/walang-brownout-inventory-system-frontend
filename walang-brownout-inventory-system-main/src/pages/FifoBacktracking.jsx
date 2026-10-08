import React, { useState } from 'react';
import { RefreshCw, Search, ArrowRight, ShieldCheck, Clock, Layers } from 'lucide-react';

export default function FifoBacktracking() {
  const [searchTerm, setSearchTerm] = useState('');

  // Sample FIFO batch tracking records
  const fifoBatches = [
    { batchId: 'BATCH-801', itemName: 'Diesel Fuel Reserve', receivedDate: '2026-02-10', expiryOrRotation: '2026-08-10', quantity: '200 Liters', status: 'Active (First Out)' },
    { batchId: 'BATCH-802', itemName: 'Inverter Battery Pack 12V', receivedDate: '2026-03-01', expiryOrRotation: '2028-03-01', quantity: '12 Units', status: 'Queued Next' },
    { batchId: 'BATCH-795', itemName: 'Generator Lubricant Oil', receivedDate: '2025-11-15', expiryOrRotation: '2026-05-15', quantity: '45 Liters', status: 'Priority Dispatch' },
    { batchId: 'BATCH-804', itemName: 'Solar Controller Unit', receivedDate: '2026-03-12', expiryOrRotation: '2029-03-12', quantity: '8 Units', status: 'In Storage' },
  ];

  return (
    <div className="bg-slate-100 min-h-screen p-8">
      {/* Page Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">FIFO Tracking & Backtracking</h1>
          <p className="text-sm text-slate-500 mt-1">Ensure oldest stock items are prioritized and dispatched first to prevent spoilage or expiration.</p>
        </div>
        <button className="bg-sky-600 hover:bg-sky-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-sm transition-all">
          <RefreshCw className="w-4 h-4" />
          Run FIFO Audit
        </button>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <main className="bg-white rounded-2xl border p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-slate-500 text-xs font-medium uppercase tracking-wider">Active Queue Mode</h3>
          </div>
          <p className="text-xl font-bold text-slate-900">Strict First-In, First-Out</p>
        </main>
        <main className="bg-white rounded-2xl border p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-slate-500 text-xs font-medium uppercase tracking-wider">Traceability Compliance</h3>
          </div>
          <p className="text-xl font-bold text-slate-900">100% Verified Batches</p>
        </main>
        <main className="bg-white rounded-2xl border p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-slate-500 text-xs font-medium uppercase tracking-wider">Tracked Batches</h3>
          </div>
          <p className="text-xl font-bold text-slate-900">24 Active Lines</p>
        </main>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search batches or items..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                <th className="py-4 px-6">Batch ID & Item</th>
                <th className="py-4 px-6">Received Date</th>
                <th className="py-4 px-6">Rotation / Expiry Target</th>
                <th className="py-4 px-6">Quantity</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {fifoBatches.map((batch, idx) => (
                <tr key={idx} className="transition-colors">
                  <td className="py-4 px-6">
                    <div className="font-semibold text-slate-900">{batch.itemName}</div>
                    <span className="text-xs text-sky-600 font-mono font-medium">{batch.batchId}</span>
                  </td>
                  <td className="py-4 px-6 text-slate-600">{batch.receivedDate}</td>
                  <td className="py-4 px-6 text-slate-600 font-medium">{batch.expiryOrRotation}</td>
                  <td className="py-4 px-6 text-slate-800 font-semibold">{batch.quantity}</td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200/60">
                      {batch.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button className="text-sky-600 hover:text-sky-700 font-medium text-xs flex items-center justify-end gap-1 ml-auto">
                      Trace Line <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}