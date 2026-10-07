import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Navbar from '../components/Navbar.jsx';
import { Package, AlertTriangle, ShieldAlert, Clock, TrendingUp, ArrowRight } from 'lucide-react';

const defaultInventory = [
  { sku: 'SKU-8821', name: 'Inverter Generator 3kVA', onHand: 18, status: 'In Stock' },
  { sku: 'SKU-4102', name: 'Solar Charge Controller 60A', onHand: 3, status: 'Low Stock' },
  { sku: 'SKU-9011', name: 'LiFePO4 100Ah Battery Pack', onHand: 0, status: 'Out of Stock' },
  { sku: 'SKU-1044', name: 'Automatic Transfer Switch 100A', onHand: 25, status: 'In Stock' },
  { sku: 'SKU-3092', name: 'Monocrystalline Solar Panel 450W', onHand: 42, status: 'In Stock' },
  { sku: 'SKU-5201', name: 'Deep Cycle Gel Battery 200Ah', onHand: 5, status: 'Low Stock' },
];

const defaultAlerts = [
  { id: 'ALT-1004', type: 'Out of Stock', item: 'LiFePO4 100Ah Battery Pack', sku: 'SKU-9011', details: 'Out of Stock • SKU-9011', priority: 'Critical', status: 'Active' },
  { id: 'ALT-1005', type: 'Low Stock', item: 'Solar Charge Controller 60A', sku: 'SKU-4102', details: 'Low Stock (2 left) • SKU-4102', priority: 'Warning', status: 'Active' },
  { id: 'ALT-1006', type: 'Low Stock', item: 'Deep Cycle Gel Battery 200Ah', sku: 'SKU-5201', details: 'Low Stock (4 left) • SKU-5201', priority: 'Warning', status: 'Active' },
  { id: 'ALT-1007', type: 'Reorder Pending', item: 'Automatic Transfer Switch 100A', sku: 'SKU-1044', details: 'Reorder Pending • SKU-1044', priority: 'Pending', status: 'Active' },
];

const salesData = [
  { month: 'Jan', value: 35 },
  { month: 'Feb', value: 45 },
  { month: 'Mar', value: 75 },
  { month: 'Apr', value: 90 },
  { month: 'May', value: 98 },
  { month: 'Jun', value: 65 },
  { month: 'Jul', value: 55 },
  { month: 'Aug', value: 100 },
];

const tones = {
  sky: { tile: 'bg-linear-to-br from-sky-500 to-sky-600 shadow-sky-500/30', value: 'text-slate-900', hint: 'text-sky-700 bg-sky-50' },
  amber: { tile: 'bg-linear-to-br from-amber-400 to-orange-500 shadow-amber-500/30', value: 'text-amber-600', hint: 'text-amber-700 bg-amber-50' },
  rose: { tile: 'bg-linear-to-br from-rose-500 to-pink-600 shadow-rose-500/30', value: 'text-rose-600', hint: 'text-rose-700 bg-rose-50' },
  indigo: { tile: 'bg-linear-to-br from-indigo-500 to-violet-600 shadow-indigo-500/30', value: 'text-slate-900', hint: 'text-indigo-700 bg-indigo-50' },
};

function KpiCard({ label, value, hint, icon: Icon, tone }) {
  const t = tones[tone];
  return (
    <div className="group relative overflow-hidden rounded-3xl bg-white/90 backdrop-blur border border-slate-200/70 p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <p className={`mt-2 text-4xl font-extrabold tracking-tight ${t.value}`}>{value}</p>
        </div>
        <div className={`p-3 rounded-2xl text-white shadow-lg ${t.tile}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <span className={`mt-4 inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${t.hint}`}>{hint}</span>
    </div>
  );
}

// Turn points into a smooth curved line
function smoothPath(points) {
  if (points.length < 2) return '';
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

function SalesChart() {
  const [hover, setHover] = useState(null);
  const W = 560, H = 260, left = 40, right = 20, top = 20, bottom = 36;
  const min = 20, max = 100;
  const xStep = (W - left - right) / (salesData.length - 1);
  const yFor = (v) => top + (1 - (v - min) / (max - min)) * (H - top - bottom);
  const pts = salesData.map((d, i) => ({ x: left + i * xStep, y: yFor(d.value), ...d }));
  const line = smoothPath(pts);
  const area = `${line} L ${pts[pts.length - 1].x},${H - bottom} L ${pts[0].x},${H - bottom} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto overflow-visible">
      <defs>
        <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="salesLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>

      {[20, 40, 60, 80, 100].map((g) => (
        <g key={g}>
          <line x1={left} x2={W - right} y1={yFor(g)} y2={yFor(g)} stroke="#e2e8f0" strokeDasharray="4 6" />
          <text x={left - 10} y={yFor(g) + 4} textAnchor="end" className="fill-slate-400" fontSize="11" fontWeight="600">{g}k</text>
        </g>
      ))}

      <path d={area} fill="url(#salesFill)" />
      <path d={line} fill="none" stroke="url(#salesLine)" strokeWidth="4" strokeLinecap="round" />

      {pts.map((p, i) => (
        <g key={p.month} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
          <rect x={p.x - xStep / 2} y={top} width={xStep} height={H - top - bottom} fill="transparent" />
          <circle cx={p.x} cy={p.y} r={hover === i ? 7 : 5} fill="#fff" stroke="#0ea5e9" strokeWidth="3" />
          <text x={p.x} y={H - 12} textAnchor="middle" className="fill-slate-500" fontSize="12" fontWeight="600">{p.month}</text>
          {hover === i && (
            <g>
              <rect x={p.x - 28} y={p.y - 38} width="56" height="24" rx="8" fill="#0f172a" />
              <text x={p.x} y={p.y - 22} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700">{p.value}k</text>
            </g>
          )}
        </g>
      ))}
    </svg>
  );
}

const priorityStyle = {
  Critical: 'bg-rose-50 text-rose-700 ring-rose-200',
  Warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  Pending: 'bg-sky-50 text-sky-700 ring-sky-200',
};

const dotStyle = {
  Critical: 'bg-rose-500',
  Warning: 'bg-amber-500',
  Pending: 'bg-sky-500',
};

export default function Dashboard() {
  const [isNavOpen, setIsNavOpen] = useState(false);

  const [inventory, setInventory] = useState(() => {
    const saved = localStorage.getItem('inventory_db');
    return saved ? JSON.parse(saved) : defaultInventory;
  });

  const [alerts, setAlerts] = useState(() => {
    const saved = localStorage.getItem('alerts_db');
    return saved ? JSON.parse(saved) : defaultAlerts;
  });

  const [firstName] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem('current_user'));
      return user?.name ? user.name.trim().split(' ')[0] : 'there';
    } catch {
      return 'there';
    }
  });

  // Refresh when other pages change the data
  useEffect(() => {
    const syncDatabase = () => {
      const savedInv = localStorage.getItem('inventory_db');
      if (savedInv) setInventory(JSON.parse(savedInv));
      const savedAlerts = localStorage.getItem('alerts_db');
      if (savedAlerts) setAlerts(JSON.parse(savedAlerts));
    };
    window.addEventListener('storage', syncDatabase);
    window.addEventListener('focus', syncDatabase);
    return () => {
      window.removeEventListener('storage', syncDatabase);
      window.removeEventListener('focus', syncDatabase);
    };
  }, []);

  const activeAlertsList = useMemo(() => alerts.filter((a) => a.status !== 'Resolved'), [alerts]);

  const kpiStats = useMemo(() => {
    const active = alerts.filter((a) => a.status !== 'Resolved');
    const text = (a) => (a.details || '').toLowerCase();
    return {
      totalProducts: inventory.length,
      lowStockCount: active.filter((a) => a.type === 'Low Stock' || a.priority === 'Warning' || text(a).includes('low stock')).length,
      outOfStockCount: active.filter((a) => a.type === 'Out of Stock' || a.priority === 'Critical' || text(a).includes('out of stock')).length,
      expiringCount: active.filter((a) => a.type === 'Expiring Soon' || text(a).includes('expire')).length,
    };
  }, [inventory, alerts]);

  const stockHealth = useMemo(() => {
    const total = inventory.length || 1;
    const out = inventory.filter((i) => i.status === 'Out of Stock').length;
    const low = inventory.filter((i) => i.status === 'Low Stock').length;
    const good = Math.max(inventory.length - out - low, 0);
    return {
      good, low, out,
      goodPct: Math.round((good / total) * 100),
      lowPct: Math.round((low / total) * 100),
      outPct: Math.round((out / total) * 100),
    };
  }, [inventory]);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="bg-slate-100 text-slate-900 font-sans antialiased min-h-screen flex flex-col overflow-x-hidden w-full">
      <Navbar isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} />
      <Header title="Dashboard" onMenuOpen={() => setIsNavOpen(true)} />

      <main className="w-full max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-10 py-6 space-y-6 flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-sky-600 via-sky-600 to-indigo-600 p-6 sm:p-8 text-white shadow-xl shadow-sky-600/20">
          <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute right-28 -bottom-24 h-52 w-52 rounded-full bg-indigo-300/25 blur-2xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
            <div>
              <p className="text-xs font-semibold text-sky-100">{today}</p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight">Welcome back, {firstName}</h1>
              <p className="mt-1.5 text-sm text-sky-100">Real-time inventory stock monitoring & demand analytics</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white/15 border border-white/20 backdrop-blur px-3.5 py-1.5 text-xs font-bold">
                {kpiStats.totalProducts} products
              </span>
              <span className="rounded-full bg-white/15 border border-white/20 backdrop-blur px-3.5 py-1.5 text-xs font-bold">
                {activeAlertsList.length} active alerts
              </span>
            </div>
          </div>
        </section>

        {/* KPIs */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard label="Total Products" value={kpiStats.totalProducts} hint="Active SKUs cataloged" icon={Package} tone="sky" />
          <KpiCard label="Low Stock Alert" value={kpiStats.lowStockCount} hint="Below minimum safety level" icon={AlertTriangle} tone="amber" />
          <KpiCard label="Out of Stock" value={kpiStats.outOfStockCount} hint="Urgent replenishment required" icon={ShieldAlert} tone="rose" />
          <KpiCard label="Expiring Items" value={kpiStats.expiringCount} hint="Warranty limits near expiry" icon={Clock} tone="indigo" />
        </section>

        {/* Chart + alerts */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-3xl bg-white/90 backdrop-blur border border-slate-200/70 p-6 shadow-sm space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold tracking-tight">Sales Revenue Trend</h2>
                <p className="text-xs font-medium text-slate-500 mt-0.5">Seasonal demand & recovery (2026)</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 px-3 py-1.5 text-xs font-bold">
                <TrendingUp className="w-3.5 h-3.5" />
                +18.5% YoY Recovery
              </span>
            </div>
            <SalesChart />
          </div>

          <div className="lg:col-span-5 rounded-3xl bg-white/90 backdrop-blur border border-slate-200/70 p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-50 text-sky-700">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <h2 className="text-base font-extrabold tracking-tight">System Alerts</h2>
              </div>
              <Link to="/alerts" className="inline-flex items-center gap-1 rounded-full bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold px-3 py-1.5">
                {activeAlertsList.length} Active <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="mt-5 space-y-2.5 flex-1">
              {activeAlertsList.length > 0 ? (
                activeAlertsList.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-white hover:shadow-sm p-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${dotStyle[alert.priority] || 'bg-slate-400'}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{alert.item}</p>
                        <p className="text-xs font-medium text-slate-500 truncate">{alert.details || alert.type}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${priorityStyle[alert.priority] || 'bg-slate-100 text-slate-700 ring-slate-200'}`}>
                      {alert.priority}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-sm font-semibold text-slate-400">All system alerts resolved! No active warnings.</div>
              )}
            </div>

            <Link to="/alerts" className="mt-5 pt-4 border-t border-slate-100 text-center text-sm font-bold text-sky-700 hover:text-sky-900">
              Manage System Alerts →
            </Link>
          </div>
        </section>

        {/* Stock health */}
        <section className="rounded-3xl bg-white/90 backdrop-blur border border-slate-200/70 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold tracking-tight">Stock Health</h2>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Share of products by stock level</p>
            </div>
            <Link to="/inventory" className="text-xs font-bold text-sky-700 hover:text-sky-900">View inventory →</Link>
          </div>

          <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="bg-emerald-500" style={{ width: `${stockHealth.goodPct}%` }} />
            <div className="bg-amber-400" style={{ width: `${stockHealth.lowPct}%` }} />
            <div className="bg-rose-500" style={{ width: `${stockHealth.outPct}%` }} />
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-slate-600">
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />In stock · {stockHealth.good}</span>
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />Low stock · {stockHealth.low}</span>
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" />Out of stock · {stockHealth.out}</span>
          </div>
        </section>
      </main>
    </div>
  );
}
