import { useState, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Navbar from '../components/Navbar.jsx';
import {
  ShieldAlert, CheckCircle2, XCircle, Clock, PackageCheck, Search,
  ChevronLeft, ChevronRight, X, ArrowDownToLine,
} from 'lucide-react';
import {
  formatDate,
  formatTxDate,
  getATP,
  getBatchesDb,
  getCurrentUser,
  getInventory,
  getStatus,
  readJSON,
  statusBadge,
} from '../utils/inventory.js';

// Roles allowed to open this page and approve / decline purchase orders.
// IMPORTANT: these strings must match the `role` values stored in your users table.
export const ORDER_APPROVER_ROLES = ['Administrator', 'Inventory Manager'];

const STATUS_STYLES = {
  'Pending Approval': 'bg-amber-50 text-amber-800 border-amber-300',
  Approved: 'bg-sky-50 text-sky-800 border-sky-300',
  Declined: 'bg-rose-50 text-rose-800 border-rose-300',
  Completed: 'bg-emerald-50 text-emerald-800 border-emerald-300',
};

const FILTERS = ['All', 'Pending Approval', 'Approved', 'Declined', 'Completed'];

const formatDateTime = (d = new Date()) =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function loadOrders() {
  try {
    const parsed = JSON.parse(localStorage.getItem('purchase_orders_db'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Finds the inventory item a PO belongs to (new POs store the SKU, old ones only the name). */
function findItemForPo(po, inventory) {
  if (po.sku) {
    const bySku = inventory.find((i) => i.sku === po.sku);
    if (bySku) return bySku;
  }
  const name = String(po.item || '').trim().toLowerCase();
  return inventory.find(
    (i) => String(i.name || '').trim().toLowerCase() === name || String(i.fullName || '').trim().toLowerCase() === name
  ) || null;
}

/** Same starting batch the FIFO page creates, so batch totals stay equal to the physical count. */
function ensureBatches(item, list) {
  if (Array.isArray(list) && list.length > 0) return list;
  const onHand = Number(item.onHand) || 0;
  return [
    {
      batchNo: `BAT-${item.sku.replace(/[^a-zA-Z0-9]/g, '')}-01`,
      receivedDate: formatDate(item.receivedDate),
      expiryDate: formatDate(item.expiryDate),
      initialQty: onHand > 0 ? onHand : 25,
      remainingQty: onHand,
      location: item.location || 'Warehouse Main',
      status: onHand === 0 ? 'Depleted' : 'Full Batch',
    },
  ];
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const nextYearISO = () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

export default function Orders() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [currentUser] = useState(getCurrentUser);
  const canReview = ORDER_APPROVER_ROLES.includes(currentUser.role);

  // Same storage key the Reorder Planner writes to, so both pages stay in sync.
  const [orders, setOrders] = useState(loadOrders);
  const [filter, setFilter] = useState('Pending Approval');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState(null); // { type: 'approve' | 'decline', po }
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [toast, setToast] = useState('');
  const [receiveDates, setReceiveDates] = useState({ receivedDate: todayISO(), expiryDate: nextYearISO() });

  useEffect(() => {
    localStorage.setItem('purchase_orders_db', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const counts = useMemo(() => {
    const c = { 'Pending Approval': 0, Approved: 0, Declined: 0, Completed: 0 };
    orders.forEach((o) => { if (c[o.status] !== undefined) c[o.status] += 1; });
    return c;
  }, [orders]);

  const pendingUnits = useMemo(
    () => orders.filter((o) => o.status === 'Pending Approval').reduce((s, o) => s + (Number(o.qty) || 0), 0),
    [orders]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (filter !== 'All' && o.status !== filter) return false;
      if (!q) return true;
      return [o.id, o.item, o.supplier].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [orders, filter, search]);

  const itemsPerPage = 5;
  const totalPages = Math.max(Math.ceil(filtered.length / itemsPerPage), 1);
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const rows = filtered.slice(startIndex, startIndex + itemsPerPage);

  if (!canReview) {
    return <Navigate to="/dashboard" replace />;
  }

  const openDialog = (type, po) => {
    setDialog({ type, po });
    setReason('');
    setReasonError('');
    setReceiveDates({ receivedDate: todayISO(), expiryDate: nextYearISO() });
  };

  const closeDialog = () => setDialog(null);

  // Adds the delivered units to inventory as a new FIFO batch, logs a Stock In transaction, completes the PO.
  const receiveOrder = (po) => {
    const inventory = getInventory();
    const item = findItemForPo(po, inventory);
    if (!item) {
      setReasonError(`Could not find "${po.item}" in Inventory. Add the product first, then receive this order.`);
      return;
    }
    const qty = Number(po.qty) || 0;
    if (qty <= 0) {
      setReasonError('This order has no quantity to receive.');
      return;
    }
    if (!receiveDates.receivedDate || !receiveDates.expiryDate) {
      setReasonError('Enter both the received date and the expiry date.');
      return;
    }

    // Batches (keep existing ones, create the default first batch if this SKU has none yet)
    const db = getBatchesDb();
    const batches = ensureBatches(item, db[item.sku]);
    const prefix = `BAT-${item.sku.replace(/[^a-zA-Z0-9]/g, '')}`;
    let n = batches.length + 1;
    while (batches.some((b) => b.batchNo === `${prefix}-${String(n).padStart(2, '0')}`)) n += 1;
    const batchNo = `${prefix}-${String(n).padStart(2, '0')}`;
    const newBatch = {
      batchNo,
      receivedDate: formatDate(receiveDates.receivedDate),
      expiryDate: formatDate(receiveDates.expiryDate),
      initialQty: qty,
      remainingQty: qty,
      location: item.location || 'Warehouse Main',
      status: 'Full Batch',
      poRef: po.id,
    };

    // Inventory
    const nextInventory = inventory.map((i) => {
      if (i.sku !== item.sku) return i;
      const next = { ...i, onHand: (Number(i.onHand) || 0) + qty };
      next.available = getATP(next);
      next.status = getStatus(next);
      next.badgeClass = statusBadge(next.status);
      return next;
    });

    localStorage.setItem('inventory_db', JSON.stringify(nextInventory));
    localStorage.setItem('fifo_batches_db', JSON.stringify({ ...db, [item.sku]: [...batches, newBatch] }));

    // Transaction record (same shape the FIFO page writes)
    const log = readJSON('transaction_records_db', []);
    const entry = {
      id: `TRX-${Math.floor(1000 + Math.random() * 9000)}`,
      sku: item.sku,
      name: item.name,
      type: 'Stock In (Restock)',
      qty,
      user: currentUser.name || 'System User',
      date: formatTxDate(),
      status: 'Completed',
    };
    localStorage.setItem('transaction_records_db', JSON.stringify([entry, ...(Array.isArray(log) ? log : [])]));

    setOrders((prev) =>
      prev.map((o) =>
        o.id === po.id
          ? { ...o, sku: item.sku, status: 'Completed', receivedBy: currentUser.name, receivedAt: new Date().toISOString(), batchNo }
          : o
      )
    );
    setToast(`${po.id} received. ${qty} units added as batch ${batchNo}.`);
    closeDialog();
  };

  const confirmDialog = () => {
    if (!dialog) return;
    const { type, po } = dialog;

    if (type === 'receive') {
      receiveOrder(po);
      return;
    }

    if (type === 'decline' && !reason.trim()) {
      setReasonError('Enter a reason so the requester knows why this order was declined.');
      return;
    }

    const reviewed = {
      reviewedBy: currentUser.name,
      reviewedRole: currentUser.role,
      reviewedAt: new Date().toISOString(),
      reviewNote: reason.trim(),
    };

    setOrders((prev) =>
      prev.map((o) =>
        o.id === po.id
          ? { ...o, status: type === 'approve' ? 'Approved' : 'Declined', ...reviewed }
          : o
      )
    );
    setToast(type === 'approve' ? `${po.id} approved.` : `${po.id} declined.`);
    closeDialog();
  };

  const summaryCards = [
    { label: 'Pending approval', value: counts['Pending Approval'], sub: `${pendingUnits} units waiting`, icon: Clock, tone: 'text-amber-700 bg-amber-50 border-amber-200' },
    { label: 'Approved', value: counts.Approved, sub: 'Waiting for delivery', icon: CheckCircle2, tone: 'text-sky-700 bg-sky-50 border-sky-200' },
    { label: 'Declined', value: counts.Declined, sub: 'Rejected by a reviewer', icon: XCircle, tone: 'text-rose-700 bg-rose-50 border-rose-200' },
    { label: 'Completed', value: counts.Completed, sub: 'Received into inventory', icon: PackageCheck, tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  ];

  return (
    <div className="bg-slate-100 text-slate-900 font-sans antialiased min-h-screen flex flex-col overflow-x-hidden w-full">
      <Navbar isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} />
      <Header title="Purchase Order Approvals" onMenuOpen={() => setIsNavOpen(true)} />

      <main className="w-full max-w-full px-4 sm:px-6 lg:px-10 py-6 space-y-6 flex-1">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map(({ label, value, sub, icon: Icon, tone }) => (
            <div key={label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{value}</p>
                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{sub}</p>
              </div>
              <span className={`w-9 h-9 rounded-xl border flex items-center justify-center ${tone}`}>
                <Icon className="w-4 h-4" />
              </span>
            </div>
          ))}
        </div>

        {/* Orders table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">PURCHASE ORDERS</h2>
              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                Review orders triggered from the Reorder Planner.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search PO, item or supplier"
                  className="w-full sm:w-64 pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => { setFilter(f); setPage(1); }}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold border transition cursor-pointer ${
                      filter === f
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {f === 'Pending Approval' ? 'Pending' : f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase text-[10px] font-black tracking-wider">
                  <th className="py-3.5 px-4">PO Reference</th>
                  <th className="py-3.5 px-4">Item Description</th>
                  <th className="py-3.5 px-4 text-center">Order Qty</th>
                  <th className="py-3.5 px-4">Supplier</th>
                  <th className="py-3.5 px-4">Date Triggered</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4">Reviewed By</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                {rows.length > 0 ? (
                  rows.map((po) => (
                    <tr key={po.id} className="hover:bg-sky-50/40 transition">
                      <td className="py-3.5 px-4 font-mono font-black text-slate-900">{po.id}</td>
                      <td className="py-3.5 px-4 font-black text-slate-900">{po.item}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-black">{po.qty} Units</td>
                      <td className="py-3.5 px-4 text-slate-600">{po.supplier}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">{po.date}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border ${STATUS_STYLES[po.status] || STATUS_STYLES['Pending Approval']}`}>
                          {po.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {po.reviewedBy ? (
                          <div className="leading-tight">
                            <p className="font-bold text-slate-800">{po.reviewedBy}</p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {formatDateTime(new Date(po.reviewedAt))}
                            </p>
                            {po.batchNo && (
                              <p className="text-[10px] text-sky-700 font-mono mt-0.5">Received as {po.batchNo}</p>
                            )}
                            {po.reviewNote && (
                              <p className="text-[10px] text-slate-500 font-medium mt-0.5 max-w-[200px] truncate" title={po.reviewNote}>
                                {po.reviewNote}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {po.status === 'Pending Approval' ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => openDialog('approve', po)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] rounded-lg shadow-xs transition cursor-pointer active:scale-95"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => openDialog('decline', po)}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold text-[11px] rounded-lg transition cursor-pointer active:scale-95"
                            >
                              Decline
                            </button>
                          </div>
                        ) : po.status === 'Approved' ? (
                          <button
                            onClick={() => openDialog('receive', po)}
                            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-[11px] rounded-lg shadow-xs transition cursor-pointer active:scale-95 inline-flex items-center gap-1"
                          >
                            <ArrowDownToLine className="w-3.5 h-3.5" /> Mark received
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-bold">No action needed</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="py-10 text-center text-xs font-bold text-slate-400">
                      {orders.length === 0
                        ? 'No purchase orders yet. Trigger a reorder from the Reorder Planner to see it here.'
                        : 'No orders match this filter.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <p className="text-xs text-slate-600 font-bold">
              Showing <span className="text-slate-900">{filtered.length > 0 ? startIndex + 1 : 0}–{Math.min(startIndex + itemsPerPage, filtered.length)}</span> of <span className="text-slate-900">{filtered.length}</span> order records
            </p>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={safePage === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white disabled:opacity-40 cursor-pointer"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="px-3 py-1 text-xs font-black rounded-lg bg-sky-600 text-white">{safePage}</button>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={safePage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white disabled:opacity-40 cursor-pointer"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Approve / decline dialog */}
      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={closeDialog}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {dialog.type === 'approve' ? 'Approve purchase order' : dialog.type === 'decline' ? 'Decline purchase order' : 'Receive purchase order'}
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-0.5 font-mono">{dialog.po.id}</p>
              </div>
              <button onClick={closeDialog} className="text-slate-400 hover:text-slate-700 cursor-pointer" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1 text-xs">
              <p className="font-black text-slate-900">{dialog.po.item}</p>
              <p className="font-bold text-slate-600">{dialog.po.qty} units from {dialog.po.supplier}</p>
              <p className="font-mono text-slate-500">Triggered {dialog.po.date}</p>
            </div>

            {dialog.type === 'receive' && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-600">
                  This adds {dialog.po.qty} units to inventory as a new FIFO batch and logs a Stock In transaction.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-[10px] font-black uppercase text-slate-400">Received date
                    <input type="date" value={receiveDates.receivedDate}
                      onChange={(e) => { setReceiveDates({ ...receiveDates, receivedDate: e.target.value }); setReasonError(''); }}
                      className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 normal-case focus:outline-none focus:ring-2 focus:ring-sky-500" />
                  </label>
                  <label className="block text-[10px] font-black uppercase text-slate-400">Expiry date
                    <input type="date" value={receiveDates.expiryDate}
                      onChange={(e) => { setReceiveDates({ ...receiveDates, expiryDate: e.target.value }); setReasonError(''); }}
                      className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 normal-case focus:outline-none focus:ring-2 focus:ring-sky-500" />
                  </label>
                </div>
                {reasonError && (
                  <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" /> {reasonError}
                  </p>
                )}
              </div>
            )}

            {dialog.type !== 'receive' && (
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase text-slate-400">
                {dialog.type === 'approve' ? 'Note (optional)' : 'Reason for declining'}
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => { setReason(e.target.value); setReasonError(''); }}
                placeholder={dialog.type === 'approve' ? 'e.g., Approved, send to supplier today' : 'e.g., Quantity too high, reduce to 20 units'}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              {reasonError && (
                <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> {reasonError}
                </p>
              )}
            </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={closeDialog}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs rounded-xl border border-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog}
                className={`px-4 py-2 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer active:scale-95 ${
                  dialog.type === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : dialog.type === 'decline' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-sky-600 hover:bg-sky-700'
                }`}
              >
                {dialog.type === 'approve' ? 'Approve order' : dialog.type === 'decline' ? 'Decline order' : 'Add to inventory'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  );
}
