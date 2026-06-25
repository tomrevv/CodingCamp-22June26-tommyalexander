/**
 * @file app.js
 * Entry point for the Expense & Budget Visualizer.
 * Uses native ES Modules — no bundler or transpiler required.
 *
 * @module app
 */

// ---------------------------------------------------------------------------
// Data Model
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} Transaction
 * @property {string} id        - Unique identifier. Generated via
 *                                `crypto.randomUUID()` when available,
 *                                otherwise `Date.now().toString() + Math.random()`.
 * @property {string} itemName  - Description of the expense.
 *                                1–100 characters (trimmed whitespace).
 * @property {number} amount    - Positive monetary value in the range
 *                                [0.01, 9999999.99], stored at full float
 *                                precision (at most 2 decimal places).
 * @property {string} category  - Spending group. Must be one of:
 *                                `"Food"` | `"Transport"` | `"Fun"`.
 * @property {number} timestamp - Unix epoch milliseconds (`Date.now()`).
 *
 * @example
 * const tx = {
 *   id:        crypto.randomUUID(),
 *   itemName:  'Lunch',
 *   amount:    12.50,
 *   category:  'Food',
 *   timestamp: Date.now()
 * };
 */

// ---------------------------------------------------------------------------
// isValidTransaction — guard function for Transaction objects
// ---------------------------------------------------------------------------

/**
 * Returns `true` if `record` is a well-formed {@link Transaction} object.
 *
 * Used by `storageService.load()` to filter out corrupted localStorage records
 * (see Requirement 5.2) and by property tests to verify the data model.
 *
 * Validation rules:
 * - `record` must be a non-null object
 * - `id`        — non-empty string
 * - `itemName`  — string whose trimmed length is ≥ 1
 * - `amount`    — finite number ≥ 0.01
 * - `category`  — exactly one of "Food", "Transport", "Fun"
 * - `timestamp` — positive finite number
 *
 * @param {unknown} record - The value to validate.
 * @returns {boolean} `true` if `record` is a valid Transaction; `false` otherwise.
 */
export function isValidTransaction(record) {
  return (
    record !== null &&
    typeof record === 'object' &&
    typeof record.id === 'string' && record.id.length > 0 &&
    typeof record.itemName === 'string' && record.itemName.trim().length > 0 &&
    typeof record.amount === 'number' && isFinite(record.amount) &&
    record.amount >= 0.01 &&
    ['Food', 'Transport', 'Fun'].includes(record.category) &&
    typeof record.timestamp === 'number' && record.timestamp > 0
  );
}

// ---------------------------------------------------------------------------
// Module imports
// ---------------------------------------------------------------------------

import { storageService }    from './storageService.js';
import { store }             from './store.js';
import { notificationBanner } from './notificationBanner.js';
import { balanceDisplay }    from './balanceDisplay.js';
import { historyList }       from './historyList.js';
import { categoryChart }     from './categoryChart.js';
import { inputForm }         from './inputForm.js';

// ---------------------------------------------------------------------------
// Application Initialization
// ---------------------------------------------------------------------------

/**
 * Startup sequence (Requirements 2.4, 3.3, 4.4, 5.2, 5.3, 7.1, 7.3):
 *
 *  1. storageService.isAvailable() — detect localStorage availability.
 *     If unavailable, show a persistent warning banner and continue in
 *     session-only mode (Req 7.3). The app must NOT crash.
 *  2. store.load()   — read + validate persisted transactions from localStorage.
 *     Internally shows a banner if records were skipped or storage had an error.
 *  3. store.subscribe(balanceDisplay.render)  — register balance UI subscriber.
 *  4. store.subscribe(historyList.render)     — register history UI subscriber.
 *  5. store.subscribe(categoryChart.render)   — register chart UI subscriber.
 *  6. inputForm.init() — bind the form submit handler.
 *  7. store.notify()   — trigger the initial paint of all UI sections from
 *     the restored state (Req 3.3, 4.4).
 */
document.addEventListener('DOMContentLoaded', () => {
  // Step 1 — Check localStorage availability (Req 7.3, 5.3)
  const storageAvailable = storageService.isAvailable();
  if (!storageAvailable) {
    notificationBanner.show(
      'Data persistence is not available in this browser context. ' +
      'Your expenses will only be saved for this session.',
      'warning'
    );
  }

  // Step 2 — Restore persisted transactions (Req 2.4, 5.2, 5.3)
  // store.load() handles skipped-records and storage-error banners internally.
  // Skip calling load() when storage is unavailable to avoid a no-op read
  // that could emit a confusing secondary banner — the session-only banner
  // shown above already covers the user communication for Req 7.3.
  if (storageAvailable) {
    store.load();
  }

  // Step 3–5 — Subscribe UI renderers to the store (Req 3.3, 4.4)
  store.subscribe(balanceDisplay.render.bind(balanceDisplay));
  store.subscribe(historyList.render.bind(historyList));
  store.subscribe(categoryChart.render.bind(categoryChart));

  // Step 6 — Bind the form submit handler (Req 1.1)
  inputForm.init();

  // Step 7 — Initial paint from restored state (Req 3.3, 4.4, 7.1)
  store.notify();

  console.info('[app] Initialisation complete.');
});
