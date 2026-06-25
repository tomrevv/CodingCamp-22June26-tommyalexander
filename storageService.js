/**
 * @file storageService.js
 * Wraps all `localStorage` interaction for the Expense & Budget Visualizer.
 * Isolates the rest of the application from storage failures.
 *
 * @module storageService
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The localStorage key used to persist the transaction array. */
const STORAGE_KEY = 'expense_budget_transactions';

/**
 * A temporary key used by `isAvailable()` to probe localStorage
 * without colliding with real application data.
 */
const PROBE_KEY = '__expense_budget_probe__';

// ---------------------------------------------------------------------------
// storageService
// ---------------------------------------------------------------------------

/**
 * @typedef {{ id: string, itemName: string, amount: number, category: string, timestamp: number }} Transaction
 */

/**
 * @typedef {{ transactions: Transaction[], skippedCount: number, storageError?: boolean }} LoadResult
 */

// ---------------------------------------------------------------------------
// isValidTransaction — guard function for Transaction objects
// ---------------------------------------------------------------------------

/**
 * Returns `true` if `record` is a well-formed {@link Transaction} object.
 *
 * This is an internal copy kept here so `storageService` has no dependency
 * on `app.js` (which attaches DOM listeners at module scope and would fail in
 * a non-browser / test environment). The canonical export lives in `app.js`.
 *
 * Validation rules:
 * - `record` must be a non-null object
 * - `id`        — non-empty string
 * - `itemName`  — string whose trimmed length is ≥ 1
 * - `amount`    — finite number ≥ 0.01
 * - `category`  — exactly one of "Food", "Transport", "Fun"
 * - `timestamp` — positive finite number
 *
 * @param {unknown} record
 * @returns {boolean}
 */
function isValidTransaction(record) {
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

/**
 * Service object that encapsulates all `localStorage` reads and writes.
 *
 * @namespace storageService
 */
export const storageService = {
  /**
   * Detects whether `localStorage` is available and usable in the current
   * browser context (e.g., not in a restricted private-browsing mode and not
   * over quota for at least small writes).
   *
   * The probe performs a write, a read, and a delete. If any step throws or
   * the read-back value does not match the written value, `false` is returned.
   *
   * @returns {boolean} `true` if localStorage is available; `false` otherwise.
   *
   * Requirements: 5.3, 7.3
   */
  isAvailable() {
    try {
      const testValue = '__probe__';
      localStorage.setItem(PROBE_KEY, testValue);
      const readBack = localStorage.getItem(PROBE_KEY);
      localStorage.removeItem(PROBE_KEY);
      return readBack === testValue;
    } catch (_err) {
      return false;
    }
  },

  /**
   * Serializes `transactions` to JSON and writes the result to `localStorage`
   * under {@link STORAGE_KEY}.
   *
   * Returns `false` (instead of throwing) when the write fails so that callers
   * can keep the form filled per Requirement 1.3.
   *
   * Common failure modes:
   * - `QuotaExceededError` / `NS_ERROR_DOM_QUOTA_REACHED` — storage full
   * - `SecurityError` — `localStorage` blocked by browser security policy
   *
   * @param {Transaction[]} transactions - The current transaction array to persist.
   * @returns {boolean} `true` on success; `false` if the write failed.
   *
   * Requirements: 5.1, 2.4
   */
  save(transactions) {
    try {
      const serialized = JSON.stringify(transactions);
      localStorage.setItem(STORAGE_KEY, serialized);
      return true;
    } catch (_err) {
      // DOMException (QuotaExceededError, SecurityError, etc.)
      return false;
    }
  },

  /**
   * Reads and deserializes the transaction array from `localStorage`.
   *
   * Parsing and validation strategy:
   * 1. If the key is absent, return an empty result (no transactions, 0 skipped).
   * 2. If `JSON.parse` throws, return an empty result (treat as unparseable).
   * 3. If the parsed value is not an array, treat as empty.
   * 4. Validate each element individually with `isValidTransaction()`.
   *    - Valid records are kept.
   *    - Invalid records are counted but silently dropped.
   *
   * @returns {LoadResult} Object containing:
   *   - `transactions` — array of valid {@link Transaction} objects restored from storage
   *   - `skippedCount` — number of records that failed validation and were discarded
   *
   * Requirements: 5.2, 2.5, 7.3
   */
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      // Key not present — fresh start
      if (raw === null) {
        return { transactions: [], skippedCount: 0 };
      }

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (_parseErr) {
        // Malformed JSON — treat as empty, signal via skippedCount 0
        // (caller uses the absence of transactions + storageError flag for banner)
        return { transactions: [], skippedCount: 0, storageError: true };
      }

      // Guard: must be an array
      if (!Array.isArray(parsed)) {
        return { transactions: [], skippedCount: 0, storageError: true };
      }

      // Per-record validation — invalid records are counted but skipped
      const transactions = [];
      let skippedCount = 0;

      for (const record of parsed) {
        if (isValidTransaction(record)) {
          transactions.push(record);
        } else {
          skippedCount++;
        }
      }

      return { transactions, skippedCount };
    } catch (_err) {
      // Unexpected error reading from localStorage (e.g., SecurityError on getItem)
      return { transactions: [], skippedCount: 0, storageError: true };
    }
  },
};
