import api from './axios';

// Data the pages keep in localStorage that is now also saved in the database.
export const SYNC_KEYS = [
  'inventory_db',
  'alerts_db',
  'transaction_records_db',
  'fifo_batches_db',
  'purchase_orders_db',
  'generated_reports_db',
];

// Keep the real browser functions so we can write without triggering a database save.
const nativeSet = Storage.prototype.setItem;
const nativeRemove = Storage.prototype.removeItem;

const timers = {};
let started = false;

const loggedIn = () => !!localStorage.getItem('auth_token');

function pushToServer(key, value) {
  clearTimeout(timers[key]);
  timers[key] = setTimeout(() => {
    api.put(`/data/${key}`, { value }).catch((e) => console.warn('Save failed for', key, e.message));
  }, 400);
}

function deleteOnServer(key) {
  clearTimeout(timers[key]);
  api.delete(`/data/${key}`).catch((e) => console.warn('Delete failed for', key, e.message));
}

/** Call once at startup. Every save to a synced key is also sent to the database. */
export function startAutoSync() {
  if (started) return;
  started = true;

  Storage.prototype.setItem = function (key, value) {
    nativeSet.call(this, key, value);
    if (this === window.localStorage && SYNC_KEYS.includes(key) && loggedIn()) {
      pushToServer(key, String(value));
    }
  };

  Storage.prototype.removeItem = function (key) {
    nativeRemove.call(this, key);
    if (this === window.localStorage && SYNC_KEYS.includes(key) && loggedIn()) {
      deleteOnServer(key);
    }
  };
}

/** After login: copy the saved database data into the browser so every page shows it. */
export async function hydrateFromServer() {
  const { data } = await api.get('/data');
  Object.entries(data.data || {}).forEach(([key, value]) => {
    if (SYNC_KEYS.includes(key) && typeof value === 'string') {
      nativeSet.call(window.localStorage, key, value);
    }
  });
}

/** Save the login session that the pages read. */
export function startSession({ token, user }) {
  nativeSet.call(window.localStorage, 'auth_token', token);
  nativeSet.call(window.localStorage, 'user_authenticated', 'true');
  nativeSet.call(window.localStorage, 'current_user', JSON.stringify(user));
}

/** Log out: remove the session and the local copies (the database keeps the data). */
export function clearSession() {
  ['auth_token', 'user_authenticated', 'current_user', ...SYNC_KEYS].forEach((k) =>
    nativeRemove.call(window.localStorage, k)
  );
}
