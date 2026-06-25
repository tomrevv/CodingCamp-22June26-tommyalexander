/**
 * @file store.js
 * Central state manager for the Expense & Budget Visualizer.
 *
 * Holds the transaction list, coordinates persistence via `storageService`,
 * and notifies registered UI subscribers after every state mutation.
 *
 * @module store
 */

import { storageService } from './storageService.js';

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

/**
 * Generates a unique transaction ID.
 *
 * Uses `crypto.randomUUID()` when available (all modern browsers).
 * Falls back to a `Date.now` + `Math.random` string for older environments.
 *
 * @returns {string} A unique identifier string.
 */
function generateId() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  // Fallback: timestamp + random base-36 suffix
  return Date.now().toString() + '-' + Math.random().toString(36).slice(2);
}

// ---------------------------------------------------------------------------
// notificationBanner — lazy import guard
// ---------------------------------------------------------------------------

/**
 * Holds the resolved `notificationBanner` module reference once available.
 * Populated on first successful dynamic import.
 * @type {{ show: (message: string, type: string) => void, hide: () => void } | null}
 */
let _notificationBanner = null;

/**
 * Attempts to lazily import `notificationBanner` if it has not been loaded yet.
 * Silently ignores the error when the module does not exist yet (e.g., before
 * task 6.1 is implemented).
 *
 * @returns {Promise<void>}
 */
async function _ensureNotificationBanner() {
  if (_notificationBanner !== null) return;
  try {
    const mod = await import('./notificationBanner.js');
    _notificationBanner = mod.notificationBanner ?? mod.default ?? null;
  } catch (_err) {
    // notificationBanner.js not yet available — fall back to console.warn
  }
}

/**
 * Shows a notification using `notificationBanner` when available, or falls
 * back to `console.warn` for environments where the banner module is absent.
 *
 * @param {string} message - Human-readable notification text.
 * @param {'info'|'warning'|'error'} [type='info'] - Severity level.
 * @returns {void}
 */
function _showNotification(message, type = 'info') {
  if (_notificationBanner !== null) {
    _notificationBanner.show(message, type);
  } else {
    // Queue an async attempt so callers are never blocked
    _ensureNotificationBanner().then(() => {
      if (_notificationBanner !== null) {
        _notificationBanner.show(message, type);
      } else {
        console.warn(`[store] ${type.toUpperCase()}: ${message}`);
      }
    });
  }
}

// ---------------------------------------------------------------------------
// store
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} Transaction
 * @property {string} id
 * @property {string} itemName
 * @property {number} amount
 * @property {string} category
 * @property {number} timestamp
 */

/**
 * Central application store.
 *
 * All state mutations flow through this object. After every mutation the store
 * calls `_notify()` to invoke all registered subscriber callbacks, passing the
 * current transaction array so each UI section can re-render itself.
 *
 * @namespace store
 */
export const store = {
  /**
   * The canonical, ordered list of transactions (most-recently-added first).
   * Do not mutate this array directly — use `addTransaction` / `deleteTransaction`.
   *
   * @type {Transaction[]}
   */
  transactions: [],

  /**
   * Registered listener callbacks. Each callback receives the current
   * transaction array as its only argument whenever state changes.
   *
   * @type {Array<(transactions: Transaction[]) => void>}
   * @private
   */
  _listeners: [],

  // -------------------------------------------------------------------------
  // subscribe / notify
  // -------------------------------------------------------------------------

  /**
   * Registers a callback that will be called after every state mutation.
   *
   * The callback signature is `(transactions: Transaction[]) => void`.
   * The same function reference can be added multiple times; it will be
   * called multiple times per notification if so (by design — callers are
   * responsible for deduplication if needed).
   *
   * @param {(transactions: Transaction[]) => void} fn - Subscriber callback.
   * @returns {void}
   *
   * Requirements: 1.2, 2.2
   */
  subscribe(fn) {
    this._listeners.push(fn);
  },

  /**
   * Invokes all registered subscriber callbacks with the current transaction
   * array. Errors thrown by individual callbacks are caught and logged so that
   * one broken subscriber cannot prevent others from receiving the update.
   *
   * @returns {void}
   *
   * Requirements: 1.2, 2.2
   */
  notify() {
    for (const fn of this._listeners) {
      try {
        fn(this.transactions);
      } catch (err) {
        console.error('[store] Subscriber threw an error:', err);
      }
    }
  },

  // -------------------------------------------------------------------------
  // load
  // -------------------------------------------------------------------------

  /**
   * Reads persisted transactions from `localStorage` via `storageService.load()`
   * and populates `store.transactions`.
   *
   * Side effects:
   * - If `skippedCount > 0`, shows a non-blocking notification informing the
   *   user that some records were skipped due to invalid data.
   * - If `storageError` is true (unparseable JSON or inaccessible storage),
   *   shows a notification that saved data could not be loaded.
   *
   * Does NOT call `notify()` — callers (app.js) are expected to call
   * `store.notify()` explicitly after `load()` to trigger the initial paint.
   *
   * @returns {void}
   *
   * Requirements: 2.4, 5.1, 5.2, 5.3
   */
  load() {
    const result = storageService.load();
    this.transactions = result.transactions;

    if (result.storageError) {
      _showNotification(
        'Saved data could not be loaded. The app is starting with no history.',
        'warning'
      );
    } else if (result.skippedCount > 0) {
      _showNotification(
        `${result.skippedCount} record${result.skippedCount === 1 ? ' was' : 's were'} skipped due to invalid data.`,
        'warning'
      );
    }
  },

  // -------------------------------------------------------------------------
  // addTransaction
  // -------------------------------------------------------------------------

  /**
   * Prepends `tx` to `store.transactions`, persists the updated list via
   * `storageService.save()`, and notifies subscribers.
   *
   * If `storageService.save()` returns `false` (quota exceeded, security
   * error, etc.), the prepend is rolled back so in-memory state remains
   * consistent with what is actually stored, and `false` is returned to the
   * caller so the form can be kept filled (Req 1.3).
   *
   * @param {Omit<Transaction, 'id'> & { id?: string }} tx
   *   The transaction to add. If `tx.id` is falsy a new ID is generated
   *   automatically, so callers may omit it.
   * @returns {boolean} `true` if the transaction was saved successfully;
   *   `false` if persistence failed (in-memory rollback is performed).
   *
   * Requirements: 1.2, 1.3, 2.2, 5.1
   */
  addTransaction(tx) {
    // Ensure the transaction has a unique ID
    const transaction = {
      ...tx,
      id: tx.id && tx.id.length > 0 ? tx.id : generateId(),
    };

    // Optimistically prepend
    this.transactions = [transaction, ...this.transactions];

    const saved = storageService.save(this.transactions);

    if (!saved) {
      // Rollback — restore the list to its previous state
      this.transactions = this.transactions.slice(1);
      return false;
    }

    this.notify();
    return true;
  },

  // -------------------------------------------------------------------------
  // deleteTransaction
  // -------------------------------------------------------------------------

  /**
   * Removes the transaction with the given `id` from `store.transactions`,
   * then attempts to persist the updated list.
   *
   * The in-memory removal always succeeds (best-effort persistence). If the
   * save fails, a non-blocking notification is shown but the list remains
   * updated in memory and subscribers are still notified so the UI stays
   * consistent with in-memory state.
   *
   * @param {string} id - The `id` of the transaction to remove.
   * @returns {void}
   *
   * Requirements: 5.1, 5.3
   */
  deleteTransaction(id) {
    this.transactions = this.transactions.filter((t) => t.id !== id);

    const saved = storageService.save(this.transactions); // best-effort

    if (!saved) {
      _showNotification(
        'Transaction removed, but the change could not be saved to storage.',
        'warning'
      );
    }

    this.notify();
  },
};
