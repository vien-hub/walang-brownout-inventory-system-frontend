import React, { useState } from 'react';
import { Package, Plus, Search, Filter, AlertTriangle, ArrowUpDown, MoreHorizontal } from 'lucide-react';

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState('');

  // Sample inventory items list matching your project scope
  const inventoryItems = [
    { id: 'INV-001', name: 'Backup Generator Fuel (Diesel)', category: 'Power Supply', stock: 420, unit: 'Liters', status: 'Optimal', location: 'Warehouse A' },
    { id: 'INV-002', name: 'Inverter Battery Pack 12V', category: 'Electrical', stock: 12, unit: 'Units', status: 'Low Stock', location: 'Warehouse B' },
    { id: 'INV-003', name: 'Automatic Transfer Switch (ATS)', category: 'Hardware', stock: 5, unit: 'Units', status: 'Optimal', location: 'Warehouse A' },
    { id: 'INV-004', name: 'Solar Panel Array Unit', category: 'Renewable', stock: 18, unit: 'Panels', status: 'Optimal', location: 'Warehouse C' },
    { id: 'INV-005', name: 'Heavy-duty Copper Cabling', category: 'Wiring', stock: 8, unit: 'Spools', status: 'Critical', location: 'Warehouse B' },
  ];

  return (
    <div className="bg-slate-100 min-h-screen p-8">
      {/* Page Title Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Inventory Management</h1>
          <p className="text-sm text-slate-500 mt-1">Track stocks, monitor backup generator components, and manage warehouse assets.</p>
        </div>
        <button className="bg-sky-600 hover:bg-sky-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-sm transition-all">
          <Plus className="w-4 h-4" />
          Add New Item
        </button>
      </div>

      {/* Main Content Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Search and Filters Bar */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search inventory items..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white transition-all"
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-all">
              <Filter className="w-4 h-4 text-slate-500" />
              Filter Status
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-all">
              <ArrowUpDown className="w-4 h-4 text-slate-500" />
              Sort By
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                <th className="py-4 px-6">Item Code & Name</th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6">Stock Level</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Location</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {inventoryItems.map((item) => (
                <tr key={item.id} className="transition-colors">
                  <td className="py-4 px-6">
                    <div className="font-semibold text-slate-900">{item.name}</div>
                    <span className="text-xs text-slate-400 font-mono">{item.id}</span>
                  </td>
                  <td className="py-4 px-6 text-slate-600">{item.category}</td>
                  <td className="py-4 px-6 font-medium text-slate-800">
                    {item.stock} <span className="text-xs text-slate-400 font-normal">{item.unit}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                      item.status === 'Optimal' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                        : item.status === 'Low Stock'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                        : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        item.status === 'Optimal' ? 'bg-emerald-500' : item.status === 'Low Stock' ? 'bg-amber-500' : 'bg-rose-500'
                      }`}></span>
                      {item.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-600">{item.location}</td>
                  <td className="py-4 px-6 text-right">
                    <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination Info */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Showing 1 to 5 of 24 entries</span>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 disabled:opacity-50">Previous</button>
            <button className="px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}