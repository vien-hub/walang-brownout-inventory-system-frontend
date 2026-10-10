import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, CheckCircle2, Clock, Layers, RefreshCw } from 'lucide-react';
import Header from '../components/Header.jsx';
import Navbar from '../components/Navbar.jsx';
import {
  EXPIRY_WINDOW_DAYS,
  batchTotal,
  daysUntil,
  fifoOrder,
  formatDate,
  formatTxDate,
  getATP,
  getBatchesDb,
  getCurrentUser,
  getInventory,
  getStatus,
  issueFifo,
  readJSON,
  statusBadge,
} from '../utils/inventory.js';

const inputClass =
  'w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500';

/** Makes sure every SKU has at least one batch so FIFO can always be applied. */
function withDefaultBatches(inventory, db) {
  const result = { ...db };
  inventory.forEach((item) => {
    if (!result[item.sku]) {
      const onHand = Number(item.onHand) || 0;
      result[item.sku] = [
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
  });
  return result;
}

function expiryLabel(days) {
  if (days === null) return { text: 'No date', cls: 'text-slate-500' };
  if (days < 0) return { text: `Expired ${Math.abs(days)}d ago`, cls: 'text-rose-700 font-bold' };
  if (days <= EXPIRY_WINDOW_DAYS) return { text: `${days} days left`, cls: 'text-amber-700 font-bold' };
  return { text: `${days} days left`, cls: 'text-slate-700' };
}

export default function FifoBacktracking() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [user] = useState(getCurrentUser);
  const isWarehouseStaff = user.role === 'Warehouse Staff';

  const [inventory, setInventory] = useState(getInventory);
  const [batchesDb, setBatchesDb] = useState(() => withDefaultBatches(getInventory(), getBatchesDb()));
  const [selectedSku, setSelectedSku] = useState(() => getInventory()[0]?.sku || '');
  const [issueQty, setIssueQty] = useState('');
  const [receive, setReceive] = useState(() => ({
    qty: '',
    receivedDate: new Date().toISOString().slice(0, 10),
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  }));
  const [notice, setNotice] = useState(null); // { type: 'ok' | 'error', text }

  const item = inventory.find((i) => i.sku === selectedSku) || null;
  const batches = useMemo(() => (item ? batchesDb[item.sku] || [] : []), [item, batchesDb]);
  const pickOrder = useMemo(() => fifoOrder(batches), [batches]);
  const issuePreview = useMemo(() => (issueQty > 0 ? issueFifo(batches, Number(issueQty)) : null), [batches, issueQty]);

  /* ----- overview numbers for every SKU ----- */
  const overview = useMemo(
    () =>
      inventory.map((i) => {
        const list = batchesDb[i.sku] || [];
        const active = fifoOrder(list);
        const nearest = active.map((b) => daysUntil(b.expiryDate)).filter((d) => d !== null).sort((a, b) => a - b)[0];
        const total = batchTotal(list);
        return {
          item: i,
          activeBatches: active.length,
          total,
          variance: (Number(i.onHand) || 0) - total,
          oldest: active[0]?.receivedDate,
          nearestExpiry: nearest ?? null,
        };
      }),
    [inventory, batchesDb]
  );

  const stats = {
    batches: overview.reduce((s, o) => s + o.activeBatches, 0),
    expiring: overview.filter((o) => o.nearestExpiry !== null && o.nearestExpiry <= EXPIRY_WINDOW_DAYS && o.total > 0).length,
    variances: overview.filter((o) => o.variance !== 0).length,
  };
  const selectedOverview = overview.find((o) => o.item.sku === selectedSku);

  /* ----- saving ----- */
  const saveAll = (nextInventory, nextBatches, tx) => {
    setInventory(nextInventory);
    setBatchesDb(nextBatches);
    localStorage.setItem('inventory_db', JSON.stringify(nextInventory));
    localStorage.setItem('fifo_batches_db', JSON.stringify(nextBatches));

    const log = readJSON('transaction_records_db', []);
    const entry = {
      id: `TRX-${Math.floor(1000 + Math.random() * 9000)}`,
      sku: tx.sku,
      name: tx.name,
      type: tx.type,
      qty: tx.qty,
      user: user.name || 'System User',
      date: formatTxDate(),
      status: 'Completed',
    };
    localStorage.setItem('transaction_records_db', JSON.stringify([entry, ...(Array.isArray(log) ? log : [])]));
  };

  const applyStock = (list, sku, newOnHand) =>
    list.map((i) => {
      if (i.sku !== sku) return i;
      const next = { ...i, onHand: newOnHand };
      next.available = getATP(next);
      next.status = getStatus(next);
      next.badgeClass = statusBadge(next.status);
      return next;
    });

  const handleIssue = (e) => {
    e.preventDefault();
    const qty = Number(issueQty);
    if (!item || !(qty > 0)) {
      setNotice({ type: 'error', text: 'Enter a quantity greater than zero.' });
      return;
    }
    if (qty > batchTotal(batches)) {
      setNotice({ type: 'error', text: `Only ${batchTotal(batches)} units are in the batches of ${item.sku}.` });
      return;
    }
    const { batches: updated, picks } = issueFifo(batches, qty);
    const newOnHand = Math.max((Number(item.onHand) || 0) - qty, 0);
    saveAll(
      applyStock(inventory, item.sku, newOnHand),
      { ...batchesDb, [item.sku]: updated },
      { sku: item.sku, name: item.name, type: 'Stock Out (FIFO Dispatch)', qty: -qty }
    );
    setIssueQty('');
    setNotice({ type: 'ok', text: `Issued ${qty} units: ${picks.map((p) => `${p.qty} from ${p.batchNo}`).join(', ')}.` });
  };

  const handleReceive = (e) => {
    e.preventDefault();
    const qty = Number(receive.qty);
    if (!item || !(qty > 0)) {
      setNotice({ type: 'error', text: 'Enter a received quantity greater than zero.' });
      return;
    }
    const prefix = `BAT-${item.sku.replace(/[^a-zA-Z0-9]/g, '')}`;
    let n = batches.length + 1;
    while (batches.some((b) => b.batchNo === `${prefix}-${String(n).padStart(2, '0')}`)) n += 1;
    const batchNo = `${prefix}-${String(n).padStart(2, '0')}`;

    const newBatch = {
      batchNo,
      receivedDate: formatDate(receive.receivedDate),
      expiryDate: formatDate(receive.expiryDate),
      initialQty: qty,
      remainingQty: qty,
      location: item.location || 'Warehouse Main',
      status: 'Full Batch',
    };
    saveAll(
      applyStock(inventory, item.sku, (Number(item.onHand) || 0) + qty),
      { ...batchesDb, [item.sku]: [...batches, newBatch] },
      { sku: item.sku, name: item.name, type: 'Stock In (Restock)', qty }
    );
    setReceive({ ...receive, qty: '' });
    setNotice({ type: 'ok', text: `Received ${qty} units as batch ${batchNo}.` });
  };

  const handleReconcile = () => {
    if (!item || !selectedOverview) return;
    if (isWarehouseStaff) {
      setNotice({ type: 'error', text: 'Only Administrators and Inventory Managers can reconcile stock.' });
      return;
    }
    const variance = selectedOverview.variance; // physical count minus batch total
    if (variance === 0) return;

    let nextBatches;
    if (variance < 0) {
      nextBatches = issueFifo(batches, -variance).batches; // physical is lower: write off the oldest stock
    } else {
      const prefix = `BAT-${item.sku.replace(/[^a-zA-Z0-9]/g, '')}-ADJ`;
      nextBatches = [
        ...batches,
        {
          batchNo: `${prefix}-${batches.length + 1}`,
          receivedDate: formatDate(new Date()),
          expiryDate: formatDate(item.expiryDate),
          initialQty: variance,
          remainingQty: variance,
          location: item.location || 'Warehouse Main',
          status: 'Adjustment',
        },
      ];
    }
    saveAll(inventory, { ...batchesDb, [item.sku]: nextBatches }, {
      sku: item.sku,
      name: item.name,
      type: 'Stock Adjusted (Batch Reconciliation)',
      qty: variance,
    });
    setNotice({ type: 'ok', text: `Batches now match the physical count of ${item.onHand} units.` });
  };

  return (
    <div className="bg-slate-100 text-slate-900 font-sans antialiased min-h-screen flex flex-col w-full">
      <Navbar isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} />
      <Header title="FIFO Tracking" onMenuOpen={() => setIsNavOpen(true)} />

      <main className="w-full max-w-full px-4 sm:px-6 lg:px-10 py-4 space-y-5 flex-1">
        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">FIFO Tracking & Batches</h1>
          <p className="text-xs font-medium text-slate-600 mt-0.5">
            Oldest stock leaves first. Every issue is taken from the earliest received batch and logged as a transaction.
          </p>
        </div>

        {/* Summary */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-sky-100 text-sky-800"><Layers className="w-5 h-5" /></div>
            <div>
              <p className="text-xs font-medium text-slate-600">Batches in storage</p>
              <p className="text-2xl font-bold">{stats.batches}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-100 text-amber-800"><Clock className="w-5 h-5" /></div>
            <div>
              <p className="text-xs font-medium text-slate-600">Products with batches expiring within {EXPIRY_WINDOW_DAYS} days</p>
              <p className="text-2xl font-bold">{stats.expiring}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${stats.variances ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
              {stats.variances ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
            <div>
              <p className="text-xs font-medium text-slate-600">Stock discrepancies (count vs. batches)</p>
              <p className="text-2xl font-bold">{stats.variances}</p>
            </div>
          </div>
        </section>

        {/* All products */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="p-5 pb-3">
            <h2 className="text-base font-bold">All products</h2>
            <p className="text-xs text-slate-600">Select a product to see its batches in pick order.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-slate-700 uppercase text-[10px] font-bold tracking-wider">
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4 text-center">Active batches</th>
                  <th className="py-3 px-4 text-center">Batch total</th>
                  <th className="py-3 px-4 text-center">Physical count</th>
                  <th className="py-3 px-4">Oldest batch</th>
                  <th className="py-3 px-4">Nearest expiry</th>
                  <th className="py-3 px-4">Check</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {overview.map((o) => {
                  const exp = expiryLabel(o.total > 0 ? o.nearestExpiry : null);
                  return (
                    <tr
                      key={o.item.sku}
                      onClick={() => { setSelectedSku(o.item.sku); setNotice(null); }}
                      className={`cursor-pointer ${o.item.sku === selectedSku ? 'bg-sky-50/70' : ''}`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{o.item.name}</div>
                        <span className="text-[11px] font-mono text-sky-700">{o.item.sku}</span>
                      </td>
                      <td className="py-3 px-4 text-center">{o.activeBatches}</td>
                      <td className="py-3 px-4 text-center">{o.total}</td>
                      <td className="py-3 px-4 text-center font-semibold">{o.item.onHand}</td>
                      <td className="py-3 px-4 text-slate-700">{o.oldest || '—'}</td>
                      <td className={`py-3 px-4 ${exp.cls}`}>{o.total > 0 ? exp.text : '—'}</td>
                      <td className="py-3 px-4">
                        {o.variance === 0 ? (
                          <span className="inline-block border px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border-emerald-300">Matches</span>
                        ) : (
                          <span className="inline-block border px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border-rose-300">
                            {o.variance > 0 ? `+${o.variance}` : o.variance} difference
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {overview.length === 0 && (
                  <tr><td colSpan="7" className="py-8 text-center text-xs font-semibold text-slate-500">No products yet. Add one in Inventory first.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Selected product */}
        {item && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="p-5 pb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold">{item.name}</h2>
                  <p className="text-xs text-slate-600">
                    <span className="font-mono">{item.sku}</span> · {item.onHand} on hand · {getATP(item)} available to promise
                  </p>
                </div>
                <span className={`inline-block border font-bold px-2.5 py-0.5 rounded-full text-[10px] ${statusBadge(getStatus(item))}`}>{getStatus(item)}</span>
              </div>

              {selectedOverview && selectedOverview.variance !== 0 && (
                <div className="mx-5 mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 flex flex-wrap items-center justify-between gap-3 text-xs font-medium text-rose-900">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Physical count is {item.onHand} but the batches add up to {selectedOverview.total}.
                  </span>
                  <button onClick={handleReconcile} className="px-3 py-1.5 rounded-lg bg-white border border-rose-300 font-bold text-rose-800 hover:bg-rose-100 cursor-pointer flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" /> Match batches to count
                  </button>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[640px]">
                  <thead>
                    <tr className="bg-slate-50 border-y border-slate-200 text-slate-700 uppercase text-[10px] font-bold tracking-wider">
                      <th className="py-3 px-4">Pick order</th>
                      <th className="py-3 px-4">Batch</th>
                      <th className="py-3 px-4">Received</th>
                      <th className="py-3 px-4">Expiry</th>
                      <th className="py-3 px-4 text-center">Remaining</th>
                      <th className="py-3 px-4">Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium">
                    {pickOrder.map((b, idx) => {
                      const exp = expiryLabel(daysUntil(b.expiryDate));
                      return (
                        <tr key={b.batchNo}>
                          <td className="py-3 px-4">
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${idx === 0 ? 'bg-teal-50 text-teal-800 border-teal-300' : 'bg-slate-100 text-slate-700 border-slate-300'}`}>
                              {idx === 0 ? 'Next out' : `#${idx + 1}`}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-sky-700">{b.batchNo}</td>
                          <td className="py-3 px-4">{b.receivedDate}</td>
                          <td className="py-3 px-4">
                            <div>{b.expiryDate}</div>
                            <div className={`text-[11px] ${exp.cls}`}>{exp.text}</div>
                          </td>
                          <td className="py-3 px-4 text-center font-semibold">{b.remainingQty} <span className="text-slate-400">/ {b.initialQty}</span></td>
                          <td className="py-3 px-4 text-slate-700">{b.location}</td>
                        </tr>
                      );
                    })}
                    {pickOrder.length === 0 && (
                      <tr><td colSpan="6" className="py-8 text-center text-xs font-semibold text-slate-500">No stock left in any batch. Receive stock to start a new batch.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-5">
              {notice && (
                <div className={`p-3 rounded-xl border text-xs font-medium ${notice.type === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
                  {notice.text}
                </div>
              )}

              <form onSubmit={handleIssue} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2"><ArrowUpFromLine className="w-4 h-4 text-amber-700" /> Issue stock (FIFO)</h3>
                <input type="number" min="1" value={issueQty} onChange={(e) => setIssueQty(e.target.value)} placeholder="Quantity to issue" className={inputClass} />
                {issuePreview && (
                  <p className="text-[11px] text-slate-600">
                    {issuePreview.picks.length > 0
                      ? `Will take ${issuePreview.picks.map((p) => `${p.qty} from ${p.batchNo}`).join(', ')}.`
                      : 'No stock to take.'}
                    {issuePreview.shortfall > 0 && <span className="text-rose-700 font-bold"> Short by {issuePreview.shortfall}.</span>}
                  </p>
                )}
                <button type="submit" className="w-full bg-sky-600 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer">Issue from oldest batch</button>
              </form>

              <form onSubmit={handleReceive} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2"><ArrowDownToLine className="w-4 h-4 text-sky-700" /> Receive stock</h3>
                <input type="number" min="1" value={receive.qty} onChange={(e) => setReceive({ ...receive, qty: e.target.value })} placeholder="Quantity received" className={inputClass} />
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[11px] font-semibold text-slate-600">Received
                    <input type="date" value={receive.receivedDate} onChange={(e) => setReceive({ ...receive, receivedDate: e.target.value })} className={`${inputClass} mt-1`} />
                  </label>
                  <label className="text-[11px] font-semibold text-slate-600">Expires
                    <input type="date" value={receive.expiryDate} onChange={(e) => setReceive({ ...receive, expiryDate: e.target.value })} className={`${inputClass} mt-1`} />
                  </label>
                </div>
                <button type="submit" className="w-full bg-white border border-slate-300 text-slate-800 text-xs font-bold py-2.5 rounded-xl hover:bg-slate-50 cursor-pointer">Add as new batch</button>
              </form>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
