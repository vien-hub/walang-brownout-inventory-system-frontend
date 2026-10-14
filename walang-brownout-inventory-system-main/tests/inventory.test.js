// Run with: npm test  (uses Node's built-in test runner, no extra packages)
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getStatus, getATP, getPlanning, needsReorder, isOverstocked,
  classifyABC, fifoOrder, issueFifo, getExpiryInfo, buildAlerts,
} from '../src/utils/inventory.js';

const day = 24 * 60 * 60 * 1000;
const iso = (offsetDays) => new Date(Date.now() + offsetDays * day).toISOString().slice(0, 10);

test('stock status follows on-hand vs threshold', () => {
  assert.equal(getStatus({ onHand: 0, threshold: '5 Units' }), 'Out of Stock');
  assert.equal(getStatus({ onHand: 5, threshold: '5 Units' }), 'Low Stock');
  assert.equal(getStatus({ onHand: 6, threshold: '5 Units' }), 'In Stock');
});

test('available-to-promise = physical - allocated, never negative', () => {
  assert.equal(getATP({ onHand: 18, reserved: 3 }), 15);
  assert.equal(getATP({ onHand: 2, reserved: 5 }), 0);
});

test('reorder point = demand x lead time + safety stock', () => {
  const p = getPlanning({ dailyUsage: 2, leadTime: 7, safetyStock: 5 }, new Date('2026-01-15'));
  assert.equal(p.reorderPoint, 19);
  assert.equal(needsReorder({ onHand: 19, dailyUsage: 2, leadTime: 7, safetyStock: 5 }), true);
  assert.equal(needsReorder({ onHand: 40, dailyUsage: 2, leadTime: 7, safetyStock: 5 }), false);
});

test('seasonal peak multiplies demand only inside the season', () => {
  const item = { dailyUsage: 2, leadTime: 7, safetyStock: 5, seasonPeak: 'rainy', seasonMultiplier: 1.5 };
  assert.equal(getPlanning(item, new Date('2026-08-10')).dailyUsage, 3); // August = rainy
  assert.equal(getPlanning(item, new Date('2026-01-10')).dailyUsage, 2); // January = normal
});

test('overstock is detected above the maximum level', () => {
  const item = { dailyUsage: 2, leadTime: 7, safetyStock: 5, onHand: 500 };
  assert.equal(isOverstocked(item), true);
  assert.equal(isOverstocked({ ...item, onHand: 20 }), false);
});

test('ABC classification: highest annual value is class A, lowest is C', () => {
  const items = [
    { sku: 'A1', dailyUsage: 10, price: '₱ 10,000.00' },
    { sku: 'B1', dailyUsage: 1, price: '₱ 5,000.00' },
    { sku: 'C1', dailyUsage: 1, price: '₱ 100.00' },
  ];
  const abc = classifyABC(items);
  assert.equal(abc.A1.class, 'A');
  assert.equal(abc.C1.class, 'C');
});

test('FIFO issues the oldest batch first and reports shortfall', () => {
  const batches = [
    { batchNo: 'NEW', receivedDate: '2026-09-01', expiryDate: '2028-01-01', remainingQty: 10 },
    { batchNo: 'OLD', receivedDate: '2026-07-01', expiryDate: '2028-01-01', remainingQty: 4 },
  ];
  assert.deepEqual(fifoOrder(batches).map((b) => b.batchNo), ['OLD', 'NEW']);
  const out = issueFifo(batches, 6);
  assert.deepEqual(out.picks, [{ batchNo: 'OLD', qty: 4 }, { batchNo: 'NEW', qty: 2 }]);
  assert.equal(out.shortfall, 0);
  assert.equal(issueFifo(batches, 20).shortfall, 6);
});

test('expiry monitoring flags expired and expiring-soon stock', () => {
  assert.equal(getExpiryInfo({ onHand: 5, expiryDate: iso(-3) }).state, 'expired');
  assert.equal(getExpiryInfo({ onHand: 5, expiryDate: iso(30) }).state, 'expiring');
  assert.equal(getExpiryInfo({ onHand: 5, expiryDate: iso(400) }).state, 'ok');
});

test('alerts are raised for stockout, expiry and overstock', () => {
  const inv = [
    { sku: 'S1', name: 'Out', onHand: 0, threshold: '5 Units', expiryDate: iso(400) },
    { sku: 'S2', name: 'Exp', onHand: 50, threshold: '5 Units', dailyUsage: 5, leadTime: 5, safetyStock: 5, expiryDate: iso(20) },
    { sku: 'S3', name: 'Over', onHand: 900, threshold: '5 Units', dailyUsage: 1, leadTime: 5, safetyStock: 2, expiryDate: iso(400) },
  ];
  const types = buildAlerts(inv).map((a) => `${a.sku}:${a.type}`);
  assert.ok(types.includes('S1:Out of Stock'));
  assert.ok(types.includes('S2:Expiring Soon'));
  assert.ok(types.includes('S3:Overstock'));
});
