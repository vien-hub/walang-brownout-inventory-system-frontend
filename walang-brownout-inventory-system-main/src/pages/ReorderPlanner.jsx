import { useState, useEffect, useMemo } from 'react';
import Header from '../components/Header.jsx';
import Navbar from '../components/Navbar.jsx';
import { 
  ShieldAlert, Printer, PackageCheck, Trash2, 
  ChevronLeft, ChevronRight, AlertCircle 
} from 'lucide-react';
import {
  SEASONS,
  abcBadge,
  classifyABC,
  formatPeso,
  getATP,
  getCurrentUser,
  getInventory,
  getPlanning,
  parsePrice,
} from '../utils/inventory.js';

export default function ReorderPlanner() {
  const [isNavOpen, setIsNavOpen] = useState(false);

  const [currentUser] = useState(getCurrentUser);

  const isWarehouseStaff = currentUser.role === 'Warehouse Staff';

  // Inventory comes from the saved list; each item carries its own demand, lead time and safety stock.
  const [inventoryList] = useState(getInventory);
  const [selectedSku, setSelectedSku] = useState(() => getInventory()[0]?.sku || '');
  const abcMap = useMemo(() => classifyABC(inventoryList), [inventoryList]);

  // Purchase Order History Database in localStorage
  const [purchaseOrders, setPurchaseOrders] = useState(() => {
    const saved = localStorage.getItem('purchase_orders_db');
    if (saved) {
      try {
        const parsedPo = JSON.parse(saved);
        if (Array.isArray(parsedPo)) return parsedPo;
      } catch (e) {
        console.error(e);
      }
    }
    return [
      { id: 'PO-2026-0098', item: 'Solar Charge Controller 60A', qty: 150, supplier: 'SolarTech Energy Supplies', status: 'Pending Approval', date: 'Aug 29, 2026' },
      { id: 'PO-2026-0032', item: 'Monocrystalline Solar Panel 450W', qty: 150, supplier: 'SolarTech Energy Supplies', status: 'Pending Approval', date: 'Aug 29, 2026' },
      { id: 'PO-2026-0058', item: 'Inverter Generator 3kVA (Silent Series)', qty: 148, supplier: 'PowerPro Heavy Industries Inc.', status: 'Pending Approval', date: 'Aug 29, 2026' },
      { id: 'PO-2026-0008', item: 'Solar Charge Controller 60A', qty: 60, supplier: 'Solaris Corp', status: 'Completed', date: 'Aug 15, 2026' },
      { id: 'PO-2026-0007', item: 'Monocrystalline Solar Panel 450W', qty: 50, supplier: 'EcoPower Inc.', status: 'Completed', date: 'Aug 02, 2026' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('purchase_orders_db', JSON.stringify(purchaseOrders));
  }, [purchaseOrders]);

  const currentItem = (Array.isArray(inventoryList) && inventoryList.length > 0)
    ? (inventoryList.find(i => i && i.sku === selectedSku) || inventoryList[0])
    : null;

  // Reorder point = (daily demand x lead time) + safety stock
  const planning = currentItem
    ? getPlanning(currentItem)
    : { baseDailyUsage: 0, dailyUsage: 0, leadTime: 0, safetyStock: 0, reorderPoint: 0, maxStockLevel: 0, season: 'none', seasonMultiplier: 1, isPeak: false };
  const { dailyUsage, leadTime, safetyStock, reorderPoint: computedROP, maxStockLevel, baseDailyUsage, isPeak, seasonMultiplier, season } = planning;
  const onHand = Number(currentItem?.onHand) || 0;
  const isBelowROP = onHand <= computedROP;
  // Order up to the maximum stock level (reorder point + one more lead-time cycle of demand)
  const suggestedOrderQty = Math.max(maxStockLevel - onHand, 1);
  const unitPrice = parsePrice(currentItem?.price);
  const totalEstimatedCost = suggestedOrderQty * unitPrice;
  const itemClass = currentItem ? abcMap[currentItem.sku]?.class || 'C' : 'C';
  const [today] = useState(() => new Date());
  const deliveryDate = new Date(today.getTime() + leadTime * 24 * 60 * 60 * 1000);
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Pagination state (Showing 5 per page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(purchaseOrders.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentTableData = purchaseOrders.slice(startIndex, startIndex + itemsPerPage);

  // Handlers for Trigger / Generate Purchase Orders
  const handleGeneratePurchaseOrder = () => {
    if (isWarehouseStaff) {
      alert('Access Denied: Warehouse Staff cannot generate or authorize purchase orders.');
      return;
    }

    if (!currentItem) {
      alert('Error: No active product selected or available in inventory.');
      return;
    }

    const newPO = {
      id: `PO-2026-00${Math.floor(10 + Math.random() * 90)}`,
      item: currentItem.name,
      qty: suggestedOrderQty,
      supplier: currentItem.supplier || 'PowerTech Energy Solutions Corp.',
      status: 'Pending Approval',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };

    const updatedPOs = [newPO, ...purchaseOrders];
    setPurchaseOrders(updatedPOs);
    setCurrentPage(1); 
    alert(`Purchase Order ${newPO.id} successfully generated for ${suggestedOrderQty} units of ${currentItem.name}!`);
  };

  const handleDeleteSinglePo = (id) => {
    if (isWarehouseStaff) {
      alert('Access Denied: Warehouse Staff cannot delete purchase order records.');
      return;
    }
    if (confirm(`Are you sure you want to delete purchase order ${id}?`)) {
      const filtered = purchaseOrders.filter(po => po.id !== id);
      setPurchaseOrders(filtered);
      if ((currentPage - 1) * itemsPerPage >= filtered.length && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    }
  };

  const handleDeleteAllPo = () => {
    if (isWarehouseStaff) {
      alert('Access Denied: Warehouse Staff cannot clear purchase order logs.');
      return;
    }
    if (confirm('Are you sure you want to clear all purchase order history?')) {
      setPurchaseOrders([]);
      setCurrentPage(1);
      localStorage.removeItem('purchase_orders_db');
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="bg-slate-100 text-slate-900 font-sans antialiased min-h-screen flex flex-col overflow-x-hidden w-full">
      <Navbar isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} />
      <Header title="Inventory Planning & Automation" onMenuOpen={() => setIsNavOpen(true)} />

      <main className="w-full max-w-full px-4 sm:px-6 lg:px-10 py-6 space-y-6 flex-1">
        
        {isWarehouseStaff && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center space-x-2 text-xs font-bold text-amber-900 shadow-xs">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Warehouse Staff Account ({currentUser.name}): View-Only mode enabled. Purchase order creation is restricted to Managers and Administrators.</span>
          </div>
        )}

        {/* Top Header Selector & Action Buttons */}
        {!Array.isArray(inventoryList) || inventoryList.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center text-amber-600 mx-auto shadow-xs">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-black text-slate-900">No Products Available in Master Inventory</h2>
              <p className="text-xs text-slate-500 font-medium">All products have been deleted. Reorder planning and demand projections are currently empty.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 space-y-1">
                <label className="block text-[10px] font-black uppercase text-slate-400">SELECT TARGET SKU FOR ROP & DEMAND PLANNING</label>
                <select
                  value={selectedSku}
                  onChange={(e) => setSelectedSku(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer text-xs"
                >
                  {inventoryList.map((item) => item && (
                    <option key={item.sku} value={item.sku}>
                      {item.sku} - {item.name} (On Hand: {item.onHand})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2.5 shrink-0 pt-2 md:pt-5">
                <button 
                  onClick={handlePrintReport}
                  className="bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs py-2.5 px-4 rounded-xl border border-slate-200 shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Report</span>
                </button>

                {!isWarehouseStaff && (
                  <button 
                    onClick={handleGeneratePurchaseOrder}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer active:scale-95"
                  >
                    <PackageCheck className="w-4 h-4" />
                    <span>Generate Purchase Order</span>
                  </button>
                )}
              </div>
            </div>

            {currentItem && (
              <>
                {/* Main 2-Column Grid Workspace */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* LEFT COLUMN: SALES TREND ANALYSIS */}
                  <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-3">
                      DEMAND ANALYSIS ({currentItem.sku})
                    </h2>

                    <div className="space-y-3">
                      <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">DEMAND</p>
                        <p className="text-sm font-black text-slate-900 mt-1">Average Daily Demand: <span className="text-emerald-700">{dailyUsage} Units / Day</span>
                          {isPeak && (
                            <span className="block text-[11px] font-bold text-amber-700 mt-0.5">
                              Peak season: normal {baseDailyUsage}/day x {seasonMultiplier} ({SEASONS[season].label})
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">SUPPLIER LEAD TIME</p>
                          <p className="text-sm font-black text-slate-900 mt-1">{leadTime} Days</p>
                        </div>

                        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">SAFETY STOCK</p>
                          <p className="text-sm font-black text-slate-900 mt-1">{safetyStock} Units</p>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ABC CLASS &amp; AVAILABILITY</p>
                        <p className="text-xs text-slate-700 font-medium leading-relaxed mt-1">
                          <span className={`inline-block border font-black px-2 py-0.5 rounded-full text-[10px] mr-2 ${abcBadge(itemClass)}`}>Class {itemClass}</span>
                          {Math.round((abcMap[currentItem.sku]?.share || 0) * 100)}% of yearly usage value. {onHand} on hand, {Number(currentItem.reserved) || 0} allocated, <span className="font-bold text-slate-900">{getATP(currentItem)} available to promise</span>.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: REORDER RECOMMENDATION */}
                  <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-3">
                      REORDER RECOMMENDATION
                    </h2>

                    <div className="space-y-3">
                      <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">RECOMMENDED REPLENISHMENT ORDER</p>
                        <p className="text-sm font-black text-slate-900 mt-1">Suggested Order Quantity: <span className="text-emerald-700">{suggestedOrderQty} Units</span> <span className="text-[11px] font-normal text-slate-500">(up to max level of {maxStockLevel})</span></p>
                      </div>

                      <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">PRIMARY SUPPLIER DETAILS</p>
                        <p className="text-sm font-black text-slate-900 mt-1">{currentItem.supplier || 'PowerTech Energy Solutions Corp.'}</p>
                        <p className="text-xs font-bold text-slate-600 mt-0.5">
                          Unit Price: {formatPeso(unitPrice)} | Total Estimated Cost: <span className="text-slate-900 font-mono">{formatPeso(totalEstimatedCost)}</span>
                        </p>
                      </div>

                      <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ESTIMATED FULFILLMENT WINDOW</p>
                        <p className="text-xs font-bold text-slate-800 mt-1">Order Date: {fmt(today)} — Estimated Delivery: {fmt(deliveryDate)}</p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Lower Grid: Real ROP Calculation & Current Stock Status */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* ROP Calculation Formula Card */}
                  <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-3">
                      REORDER POINT (ROP) CALCULATION FOR {currentItem.sku}
                    </h2>

                    <div className="space-y-3 text-xs font-bold text-slate-700">
                      <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase">ROP FORMULA: (DAILY USAGE × LEAD TIME) + SAFETY STOCK</p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="font-mono font-black text-slate-900">({dailyUsage} units/day × {leadTime} days) + {safetyStock} units Safety Stock</span>
                          <span className="font-mono font-black text-emerald-700 text-base">{computedROP} Units</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Current Stock Status Banner */}
                  <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-3">
                      CURRENT STOCK STATUS
                    </h2>

                    {isBelowROP ? (
                      <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between shadow-2xs">
                        <div>
                          <p className="text-[10px] font-black text-rose-600 uppercase">ON-HAND STOCK VS ROP THRESHOLD</p>
                          <p className="text-xs font-black text-rose-900 mt-0.5">Action Required: Current Stock ({onHand}) is BELOW ROP ({computedROP})</p>
                        </div>
                        {!isWarehouseStaff && (
                          <button
                            onClick={handleGeneratePurchaseOrder}
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer shrink-0 active:scale-95"
                          >
                            Trigger Reorder
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between shadow-2xs">
                        <div>
                          <p className="text-[10px] font-black text-emerald-600 uppercase">ON-HAND STOCK VS ROP THRESHOLD</p>
                          <p className="text-xs font-black text-emerald-900 mt-0.5">Stock Optimal: Current Stock ({onHand}) is above ROP ({computedROP})</p>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </>
            )}
          </>
        )}

        {/* Purchase Order History Table (Limited to 5 per page) */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden space-y-4">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">PURCHASE ORDER HISTORY</h2>
              <p className="text-[11px] font-semibold text-slate-500 mt-0.5"></p>
            </div>

            {purchaseOrders.length > 0 && !isWarehouseStaff && (
              <button
                onClick={handleDeleteAllPo}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-extrabold transition flex items-center space-x-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All History</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase text-[10px] font-black tracking-wider">
                  <th className="py-3.5 px-4">PO Reference</th>
                  <th className="py-3.5 px-4">Item Description</th>
                  <th className="py-3.5 px-4 text-center">Order Qty</th>
                  <th className="py-3.5 px-4">Supplier</th>
                  <th className="py-3.5 px-4">Date Triggered</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  {!isWarehouseStaff && <th className="py-3.5 px-4 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                {currentTableData.length > 0 ? (
                  currentTableData.map((po) => (
                    <tr key={po.id} className="hover:bg-sky-50/40 transition">
                      <td className="py-3.5 px-4 font-mono font-black text-slate-900">{po.id}</td>
                      <td className="py-3.5 px-4 font-black text-slate-900">{po.item}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-black">{po.qty} Units</td>
                      <td className="py-3.5 px-4 text-slate-600">{po.supplier}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">{po.date}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                          po.status === 'Completed' 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}>
                          {po.status}
                        </span>
                      </td>
                      {!isWarehouseStaff && (
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleDeleteSinglePo(po.id)}
                            className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-300 transition cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={isWarehouseStaff ? "6" : "7"} className="py-8 text-center text-xs font-bold text-slate-400">
                      No purchase orders recorded in history.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <p className="text-xs text-slate-600 font-bold">
              Showing <span className="text-slate-900">{purchaseOrders.length > 0 ? startIndex + 1 : 0}–{Math.min(startIndex + itemsPerPage, purchaseOrders.length)}</span> of <span className="text-slate-900">{purchaseOrders.length}</span> order records
            </p>
            <div className="flex items-center space-x-1">
              <button 
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="px-3 py-1 text-xs font-black rounded-lg bg-sky-600 text-white">{currentPage}</button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}