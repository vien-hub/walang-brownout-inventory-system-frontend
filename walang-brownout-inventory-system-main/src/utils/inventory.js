/**
 * Inventory control logic shared by every page.
 *
 * The pages keep their data in localStorage (which api/sync.js also saves to the
 * Laravel database), so everything here is a plain function that reads that data
 * and calculates results. Nothing in this file talks to the server directly.
 *
 *  - Stock status ........ getStatus()
 *  - ABC classification .. classifyABC()      (annual usage value, 80 / 15 / 5 rule)
 *  - Reorder point ....... getPlanning()      ROP = (daily demand x lead time) + safety stock
 *  - Available to promise  getATP()           ATP = physical stock - allocated stock
 *  - FIFO ................ fifoOrder(), issueFifo()
 *  - Expiration .......... getExpiryInfo()
 *  - Alerts .............. buildAlerts()
 */

export const EXPIRY_WINDOW_DAYS = 90; // items expiring within this many days raise an alert
export const DEFAULT_DAILY_DEMAND = 2;
export const DEFAULT_LEAD_TIME = 7;
export const DEFAULT_SAFETY_STOCK = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

/* ---------- starting data (used until the database has saved inventory) ---------- */

export const DEFAULT_INVENTORY = [
  { sku: 'SKU-8821', name: 'Inverter Generator 3kVA', fullName: 'Inverter Generator 3kVA (Silent Series)', category: 'Generators', price: '₱ 24,500.00', supplier: 'PowerPro Heavy Industries Inc.', desc: 'High-efficiency 3000W portable inverter generator.', onHand: 18, available: 15, reserved: 3, threshold: '5 Units', location: 'Warehouse A', status: 'In Stock', receivedDate: '2026-08-01', expiryDate: '2028-08-01', dailyUsage: 2, leadTime: 7, safetyStock: 5 },
  { sku: 'SKU-4102', name: 'Solar Charge Controller 60A', fullName: 'MPPT Solar Charge Controller 60A 12V/24V/48V', category: 'Solar Systems', price: '₱ 8,200.00', supplier: 'SolarTech Energy Supplies', desc: 'Advanced MPPT controller with 99% tracking efficiency.', onHand: 3, available: 2, reserved: 1, threshold: '5 Units', location: 'Shelf B-3', status: 'Low Stock', receivedDate: '2026-08-05', expiryDate: '2028-08-05', dailyUsage: 1, leadTime: 5, safetyStock: 3 },
  { sku: 'SKU-9011', name: 'LiFePO4 100Ah Battery Pack', fullName: 'Lithium Iron Phosphate Battery 12.8V 100Ah', category: 'Batteries', price: '₱ 19,800.00', supplier: 'Voltaic Power Corp.', desc: 'Deep cycle lithium battery with integrated Smart BMS.', onHand: 0, available: 0, reserved: 0, threshold: '10 Units', location: 'Warehouse B', status: 'Out of Stock', receivedDate: '2026-08-10', expiryDate: '2028-08-10', dailyUsage: 1, leadTime: 10, safetyStock: 3 },
  { sku: 'SKU-1044', name: 'Automatic Transfer Switch 100A', fullName: 'Dual Power Automatic Transfer Switch 100A 220V', category: 'Switches', price: '₱ 4,500.00', supplier: 'GridGuard Switchgears', desc: 'Seamless automatic transfer switch.', onHand: 25, available: 22, reserved: 3, threshold: '8 Units', location: 'Shelf A-1', status: 'In Stock', receivedDate: '2026-08-12', expiryDate: '2028-08-12', dailyUsage: 1, leadTime: 6, safetyStock: 3 },
  { sku: 'SKU-3092', name: 'Monocrystalline Solar Panel 450W', fullName: 'High-Efficiency Monocrystalline Solar Panel 450W', category: 'Solar Systems', price: '₱ 7,400.00', supplier: 'SolarTech Energy Supplies', desc: 'PERC half-cut cell solar module.', onHand: 42, available: 40, reserved: 2, threshold: '15 Units', location: 'Yard Storage', status: 'In Stock', receivedDate: '2026-08-15', expiryDate: '2028-08-15', dailyUsage: 3, leadTime: 8, safetyStock: 6 },
  { sku: 'SKU-5201', name: 'Deep Cycle Gel Battery 200Ah', fullName: 'Sealed Lead Acid Gel Deep Cycle Battery 12V 200Ah', category: 'Batteries', price: '₱ 14,200.00', supplier: 'Voltaic Power Corp.', desc: 'Maintenance-free gel battery.', onHand: 5, available: 4, reserved: 1, threshold: '6 Units', location: 'Shelf B-1', status: 'Low Stock', receivedDate: '2026-08-18', expiryDate: '2028-08-18', dailyUsage: 1, leadTime: 6, safetyStock: 2 },
];

/* ---------- small helpers ---------- */

export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function getInventory() {
  const data = readJSON('inventory_db', null);
  if (data === null) return DEFAULT_INVENTORY;
  return Array.isArray(data) ? data.filter((i) => i && i.sku) : [];
}

export function getBatchesDb() {
  const data = readJSON('fifo_batches_db', {});
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
}

/** "₱ 24,500.00" -> 24500 */
export function parsePrice(value) {
  if (typeof value === 'number') return value;
  const n = parseFloat(String(value ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** "5 Units" -> 5, 8 -> 8 */
export function parseThreshold(value, fallback = 5) {
  const n = parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

export function formatPeso(n) {
  return `₱ ${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value) {
  const d = parseDate(value);
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'N/A';
}

/** "Aug 22, 2026 - 02:15 PM", the format the Transactions page uses. */
export function formatTxDate(value = new Date()) {
  const d = parseDate(value) || new Date();
  const day = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${day} - ${time}`;
}

export function daysUntil(value, now = new Date()) {
  const d = parseDate(value);
  if (!d) return null;
  return Math.ceil((d.getTime() - now.getTime()) / DAY_MS);
}

/* ---------- stock status ---------- */

export function getStatus(item) {
  const onHand = Number(item.onHand) || 0;
  if (onHand <= 0) return 'Out of Stock';
  if (onHand <= parseThreshold(item.threshold)) return 'Low Stock';
  return 'In Stock';
}

export function statusBadge(status) {
  if (status === 'Out of Stock') return 'bg-rose-50 text-rose-800 border-rose-300';
  if (status === 'Low Stock') return 'bg-amber-50 text-amber-800 border-amber-300';
  return 'bg-sky-50 text-sky-800 border-sky-300';
}

/** Available-to-promise: what can still be promised to new customers. */
export function getATP(item) {
  const onHand = Number(item.onHand) || 0;
  const allocated = Number(item.reserved) || 0;
  return Math.max(onHand - allocated, 0);
}

/* ---------- reorder point ---------- */

export function getPlanning(item) {
  const dailyUsage = Number(item.dailyUsage) > 0 ? Number(item.dailyUsage) : DEFAULT_DAILY_DEMAND;
  const leadTime = Number(item.leadTime) > 0 ? Number(item.leadTime) : DEFAULT_LEAD_TIME;
  const hasSafety = item.safetyStock !== undefined && item.safetyStock !== null && item.safetyStock !== '' && Number(item.safetyStock) >= 0;
  const safetyStock = hasSafety ? Number(item.safetyStock) : DEFAULT_SAFETY_STOCK;
  const reorderPoint = Math.ceil(dailyUsage * leadTime + safetyStock);
  return { dailyUsage, leadTime, safetyStock, reorderPoint };
}

export function needsReorder(item) {
  return (Number(item.onHand) || 0) <= getPlanning(item).reorderPoint;
}

/* ---------- ABC classification ---------- */

/**
 * Ranks items by annual usage value (daily demand x 365 x unit price).
 * Items that make up the first 80% of the total value are class A,
 * the next 15% are class B and the remaining 5% are class C.
 * Returns { [sku]: { class, value, share } }.
 */
export function classifyABC(items) {
  const rows = items.map((item) => ({
    sku: item.sku,
    value: getPlanning(item).dailyUsage * 365 * parsePrice(item.price),
  }));
  const total = rows.reduce((sum, r) => sum + r.value, 0);
  rows.sort((a, b) => b.value - a.value);

  const result = {};
  let running = 0;
  rows.forEach((r) => {
    const before = total > 0 ? running / total : 1;
    result[r.sku] = {
      class: before < 0.8 ? 'A' : before < 0.95 ? 'B' : 'C',
      value: r.value,
      share: total > 0 ? r.value / total : 0,
    };
    running += r.value;
  });
  return result;
}

export function abcBadge(cls) {
  if (cls === 'A') return 'bg-teal-50 text-teal-800 border-teal-300';
  if (cls === 'B') return 'bg-indigo-50 text-indigo-800 border-indigo-300';
  return 'bg-slate-100 text-slate-700 border-slate-300';
}

/* ---------- FIFO batches ---------- */

/** Batches that still hold stock, oldest received first (first in, first out). */
export function fifoOrder(batches = []) {
  return batches
    .filter((b) => Number(b.remainingQty) > 0)
    .slice()
    .sort((a, b) => {
      const da = parseDate(a.receivedDate)?.getTime() ?? 0;
      const db = parseDate(b.receivedDate)?.getTime() ?? 0;
      if (da !== db) return da - db;
      return (parseDate(a.expiryDate)?.getTime() ?? Infinity) - (parseDate(b.expiryDate)?.getTime() ?? Infinity);
    });
}

/**
 * Takes `qty` units from the oldest batches first.
 * Returns the updated batch list, the picks made and any shortfall.
 */
export function issueFifo(batches = [], qty) {
  let left = Number(qty) || 0;
  const picks = [];
  const order = fifoOrder(batches).map((b) => b.batchNo);
  const updated = batches.map((b) => ({ ...b }));

  for (const batchNo of order) {
    if (left <= 0) break;
    const batch = updated.find((b) => b.batchNo === batchNo);
    const take = Math.min(left, Number(batch.remainingQty) || 0);
    if (take > 0) {
      batch.remainingQty = Number(batch.remainingQty) - take;
      batch.status = batch.remainingQty === 0 ? 'Depleted' : 'Partially Used';
      picks.push({ batchNo, qty: take });
      left -= take;
    }
  }
  return { batches: updated, picks, shortfall: left };
}

export function batchTotal(batches = []) {
  return batches.reduce((sum, b) => sum + (Number(b.remainingQty) || 0), 0);
}

/* ---------- expiration ---------- */

/**
 * Looks at the active FIFO batches of an item (or the item's own expiry date when
 * it has no batches) and reports the nearest expiry.
 */
export function getExpiryInfo(item, batchesDb = {}) {
  const active = (batchesDb[item.sku] || []).filter((b) => Number(b.remainingQty) > 0);
  const dates = active.length ? active.map((b) => b.expiryDate) : [item.expiryDate];
  const days = dates
    .map((d) => daysUntil(d))
    .filter((d) => d !== null)
    .sort((a, b) => a - b)[0];

  if (days === undefined) return { days: null, state: 'unknown' };
  if ((Number(item.onHand) || 0) <= 0) return { days, state: 'ok' };
  if (days < 0) return { days, state: 'expired' };
  if (days <= EXPIRY_WINDOW_DAYS) return { days, state: 'expiring' };
  return { days, state: 'ok' };
}

/* ---------- alerts ---------- */

const PRIORITY_RANK = { Critical: 0, Warning: 1, Pending: 2 };

/**
 * Builds the alert list from the live inventory.
 * `existing` is the saved alerts_db list, used to keep each alert's
 * Acknowledged / Resolved status and timestamp.
 */
export function buildAlerts(inventory, batchesDb = {}, existing = []) {
  const alerts = [];
  const stamp = () =>
    new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

  const push = (item, type, priority, details) => {
    const old = existing.find((a) => a.sku === item.sku && a.type === type);
    alerts.push({
      id: old?.id || `ALT-${type.replace(/[^A-Z]/g, '')}-${item.sku}`,
      type,
      item: item.name,
      sku: item.sku,
      details,
      priority,
      status: old?.status || 'Active',
      timestamp: old?.timestamp || stamp(),
    });
  };

  inventory.forEach((item) => {
    const onHand = Number(item.onHand) || 0;
    const status = getStatus(item);
    const { reorderPoint } = getPlanning(item);

    if (status === 'Out of Stock') {
      push(item, 'Out of Stock', 'Critical', `Inventory depleted to 0 units (${item.sku})`);
    } else if (status === 'Low Stock') {
      push(item, 'Low Stock', 'Warning', `Low Stock (${onHand} left) • ${item.sku}`);
    } else if (onHand <= reorderPoint) {
      push(item, 'Reorder Point', 'Warning', `${onHand} on hand, reorder point is ${reorderPoint} • ${item.sku}`);
    }

    const expiry = getExpiryInfo(item, batchesDb);
    if (expiry.state === 'expired') {
      push(item, 'Expired', 'Critical', `Batch expired ${Math.abs(expiry.days)} day(s) ago • ${item.sku}`);
    } else if (expiry.state === 'expiring') {
      push(item, 'Expiring Soon', 'Warning', `Expires in ${expiry.days} day(s) • ${item.sku}`);
    }
  });

  return alerts.sort((a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9));
}

/** Loads inventory + batches + saved alert states and returns the current alerts. */
export function loadAlerts() {
  return buildAlerts(getInventory(), getBatchesDb(), readJSON('alerts_db', []));
}

export function isActive(alert) {
  return alert.status !== 'Resolved';
}

/* ---------- session ---------- */

export function getCurrentUser() {
  const user = readJSON('current_user', null);
  return user && user.role ? user : { name: 'User', role: 'Warehouse Staff' };
}
