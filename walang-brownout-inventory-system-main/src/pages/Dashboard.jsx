import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, AlertTriangle, ShieldAlert, Clock, ArrowRight, Layers } from 'lucide-react';
import Header from '../components/Header.jsx';
import Navbar from '../components/Navbar.jsx';
import {
  classifyABC,
  abcBadge,
  getCurrentUser,
  getInventory,
  getPlanning,
  isActive,
  isOverstocked,
  loadAlerts,
  needsReorder,
} from '../utils/inventory.js';

const TONES = {
  teal: { tile: 'from-teal-500 to-cyan-700', value: 'text-slate-900', hint: 'bg-cyan-100 text-cyan-900' },
  amber: { tile: 'from-amber-400 to-orange-500', value: 'text-amber-700', hint: 'bg-amber-100 text-amber-900' },
  rose: { tile: 'from-rose-500 to-pink-600', value: 'text-rose-600', hint: 'bg-rose-100 text-rose-900' },
  slate: { tile: 'from-slate-500 to-slate-700', value: 'text-slate-900', hint: 'bg-slate-200 text-slate-800' },
};

const PRIORITY_BADGE = {
  Critical: 'bg-rose-50 text-rose-700 ring-rose-200',
  Warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  Pending: 'bg-sky-50 text-sky-700 ring-sky-200',
};
const PRIORITY_DOT = { Critical: 'bg-rose-500', Warning: 'bg-amber-500', Pending: 'bg-sky-500' };

function KpiCard({ label, value, hint, icon: Icon, tone }) {
  const t = TONES[tone];
  return (
    <div className="kpi-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700">{label}</p>
          <p className={`mt-2 text-4xl font-extrabold tracking-tight ${t.value}`}>{value}</p>
        </div>
        <div className={`rounded-xl bg-linear-to-br p-3 text-white shadow-md ${t.tile}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <span className={`mt-4 inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold ${t.hint}`}>{hint}</span>
    </div>
  );
}

// Everything on this page is calculated from the saved inventory, batches and alerts.
function readSnapshot() {
  const inventory = getInventory();
  return { inventory, alerts: loadAlerts() };
}

export default function Dashboard() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [snapshot, setSnapshot] = useState(readSnapshot);
  const [user] = useState(getCurrentUser);

  // Refresh when another tab or page changes the data.
  useEffect(() => {
    const refresh = () => setSnapshot(readSnapshot());
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const { inventory, alerts } = snapshot;
  const activeAlerts = useMemo(() => alerts.filter(isActive), [alerts]);

  const kpi = useMemo(() => {
    const count = (types) => activeAlerts.filter((a) => types.includes(a.type)).length;
    return {
      total: inventory.length,
      low: count(['Low Stock']),
      out: count(['Out of Stock']),
      expiring: count(['Expiring Soon', 'Expired']),
    };
  }, [inventory, activeAlerts]);

  const reorderList = useMemo(() => {
    const abc = classifyABC(inventory);
    return inventory
      .filter(needsReorder)
      .map((item) => ({ item, abc: abc[item.sku]?.class || 'C', rop: getPlanning(item).reorderPoint }))
      .sort((a, b) => a.abc.localeCompare(b.abc) || Number(a.item.onHand) - Number(b.item.onHand))
      .slice(0, 5);
  }, [inventory]);

  const overstockCount = useMemo(() => inventory.filter(isOverstocked).length, [inventory]);

  const firstName = (user.name || 'there').trim().split(' ')[0];
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="bg-slate-100 text-slate-900 font-sans antialiased min-h-screen flex flex-col w-full">
      <Navbar isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} />
      <Header title="Dashboard" onMenuOpen={() => setIsNavOpen(true)} />

      <main className="mx-auto w-full max-w-[1400px] flex-1 space-y-5 px-4 py-4 sm:px-6 lg:px-10">
        {/* Welcome banner */}
        <section className="hero-card p-6 sm:p-7 text-white">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs text-slate-300">{today}</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">Welcome back, {firstName}</h1>
              <p className="mt-1 text-sm text-slate-300">Stock levels, open alerts and demand at a glance.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/inventory" className="rounded-lg border border-cyan-400/30 bg-cyan-500/20 px-3.5 py-2 text-sm font-semibold text-cyan-50 hover:bg-cyan-500/30">
                {kpi.total} products
              </Link>
              <Link to="/alerts" className="rounded-lg border border-amber-300/40 bg-linear-to-r from-amber-500/60 to-orange-500/60 px-3.5 py-2 text-sm font-semibold text-white hover:brightness-110">
                {activeAlerts.length} open alerts
              </Link>
            </div>
          </div>
        </section>

        {/* Key numbers */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Total Products" value={kpi.total} hint="Active SKUs cataloged" icon={Package} tone="teal" />
          <KpiCard label="Low Stock Alert" value={kpi.low} hint="Below minimum safety level" icon={AlertTriangle} tone="amber" />
          <KpiCard label="Out of Stock" value={kpi.out} hint="Urgent replenishment required" icon={ShieldAlert} tone="rose" />
          <KpiCard label="Expiring Items" value={kpi.expiring} hint={`Batches expiring within 90 days`} icon={Clock} tone="slate" />
        </section>

        {/* Alerts + reorder watch */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="flex flex-col rounded-2xl bg-white p-5 lg:col-span-7">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <h2 className="text-base font-bold">System Alerts</h2>
              </div>
              <Link to="/alerts" className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200">
                {activeAlerts.length} Active <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="mt-4 flex-1 space-y-2.5">
              {activeAlerts.length > 0 ? (
                activeAlerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/70">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${PRIORITY_DOT[alert.priority] || 'bg-slate-400'}`} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{alert.item}</p>
                        <p className="truncate text-xs text-slate-600">{alert.details}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${PRIORITY_BADGE[alert.priority] || 'bg-slate-100 text-slate-700 ring-slate-200'}`}>
                      {alert.priority}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-sm font-medium text-slate-500">All alerts are resolved. Nothing needs attention.</div>
              )}
            </div>

            <Link to="/alerts" className="mt-4 border-t border-slate-200 pt-4 text-center text-sm font-semibold text-slate-800 hover:text-sky-700">
              Manage System Alerts →
            </Link>
          </div>

          <div className="flex flex-col rounded-2xl bg-white p-5 lg:col-span-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
                  <Layers className="h-4 w-4" />
                </div>
                <h2 className="text-base font-bold">Reorder Watch</h2>
              </div>
              <Link to="/reorder-planner" className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200">
                Open planner <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <p className="mt-1 text-xs text-slate-600">Items at or below their reorder point, most important class first.</p>

            <div className="mt-4 flex-1 space-y-2.5">
              {reorderList.length > 0 ? (
                reorderList.map(({ item, abc, rop }) => (
                  <div key={item.sku} className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/70">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-600">{item.onHand} on hand · reorder at {rop}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${abcBadge(abc)}`}>Class {abc}</span>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-sm font-medium text-slate-500">Every item is above its reorder point.</div>
              )}
            </div>

            <Link to="/alerts" className="mt-4 border-t border-slate-200 pt-4 text-center text-sm font-semibold text-slate-800 hover:text-sky-700">
              {overstockCount} overstocked {overstockCount === 1 ? 'item' : 'items'} →
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
