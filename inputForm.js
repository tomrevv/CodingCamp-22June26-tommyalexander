/**
 * @file inputForm.js
 * Manages the expense input form for the Expense & Budget Visualizer.
 *
 * Responsibilities:
 * - Bind the form's submit event listener (`init`)
 * - Read field values, validate via `validator.validateForm()`, and display errors (`showErrors`)
 * - On valid submission: call `store.addTransaction()`, reset form on success,
 *   or show a notification on save failure (Requirement 1.3)
 * - Clear all inline error messages (`clearErrors`)
 * - Reset all fields to their default state (`reset`)
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 *
 * @module inputForm
 */

import { validator } from './validator.js';
import { store } from './store.js';
import { notificationBanner } from './notificationBanner.js';

// ---------------------------------------------------------------------------
// DOM element accessors (resolved lazily after DOM is ready)
// ---------------------------------------------------------------------------

/** @returns {HTMLFormElement | null} */
function getForm() {
  return document.getElementById('expense-form');
}

/** @returns {HTMLInputElement | null} */
function getItemNameInput() {
  return document.getElementById('item-name');
}

/** @returns {HTMLInputElement | null} */
function getAmountInput() {
  return document.getElementById('amount');
}

/** @returns {HTMLSelectElement | null} */
function getCategorySelect() {
  return document.getElementById('category');
}

/** @returns {HTMLSpanElement | null} */
function getItemNameError() {
  return document.getElementById('item-name-error');
}

/** @returns {HTMLSpanElement | null} */
function getAmountError() {
  return document.getElementById('amount-error');
}

/** @returns {HTMLSpanElement | null} */
function getCategoryError() {
  return document.getElementById('category-error');
}

// ---------------------------------------------------------------------------
// inputForm
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} FormErrors
 * @property {string | null} itemName  - Error message for the item name field, or null if valid.
 * @property {string | null} amount    - Error message for the amount field, or null if valid.
 * @property {string | null} category  - Error message for the category field, or null if valid.
 */

export const inputForm = {
  // -------------------------------------------------------------------------
  // init
  // -------------------------------------------------------------------------

  /**
   * Binds the submit event listener to the `#expense-form` element.
   *
   * Must be called once after the DOM is ready (e.g. from `app.js` inside a
   * `DOMContentLoaded` handler). Safe to call only once — attaching the
   * listener multiple times would fire the handler multiple times per submit.
   *
   * Submit flow:
   *  1. Prevent default browser submission.
   *  2. Read raw field values from the three form controls.
   *  3. Call `validator.validateForm()` with the raw values.
   *  4. If invalid: call `showErrors()` with the error map, then return.
   *  5. If valid: clear inline errors, build a Transaction object, and call
   *     `store.addTransaction(tx)`.
   *     - On success (`true`): call `reset()` to clear the form.
   *     - On failure (`false`): keep the form filled and call
   *       `notificationBanner.show()` with an error message (Req 1.3).
   *
   * @returns {void}
   *
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
   */
  init() {
    const form = getForm();
    if (!form) {
      console.warn('[inputForm] #expense-form not found in the DOM.');
      return;
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const itemNameInput = getItemNameInput();
      const amountInput = getAmountInput();
      const categorySelect = getCategorySelect();

      // Read raw values (fall back to empty string if element not found)
      const rawItemName = itemNameInput ? itemNameInput.value : '';
      const rawAmount = amountInput ? amountInput.value : '';
      const rawCategory = categorySelect ? categorySelect.value : '';

      // Validate all fields simultaneously
      const { valid, errors } = validator.validateForm({
        itemName: rawItemName,
        amount: rawAmount,
        category: rawCategory,
      });

      if (!valid) {
        this.showErrors(errors);
        return;
      }

      // Fields are valid — clear any lingering inline errors
      this.clearErrors();

      // Build the Transaction object
      const tx = {
        id: (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
          ? crypto.randomUUID()
          : Date.now().toString() + '-' + Math.random().toString(36).slice(2),
        itemName: rawItemName.trim(),
        amount: parseFloat(rawAmount),
        category: rawCategory,
        timestamp: Date.now(),
      };

      // Attempt to persist via store
      const saved = store.addTransaction(tx);

      if (saved) {
        // Success: reset the form to its default empty state (Req 1.3)
        this.reset();
      } else {
        // Failure: keep the form filled and notify the user (Req 1.3)
        notificationBanner.show(
          'Could not save. Storage may be full.',
          'error'
        );
      }
    });
  },

  // -------------------------------------------------------------------------
  // reset
  // -------------------------------------------------------------------------

  /**
   * Resets the form fields to their default empty state:
   * - Item name input → empty string
   * - Amount input → empty string
   * - Category selector → `"Food"` (the first and default option)
   *
   * Also clears all inline error messages.
   *
   * @returns {void}
   *
   * Requirements: 1.3
   */
  reset() {
    const itemNameInput = getItemNameInput();
    const amountInput = getAmountInput();
    const categorySelect = getCategorySelect();

    if (itemNameInput) itemNameInput.value = '';
    if (amountInput) amountInput.value = '';
    if (categorySelect) categorySelect.value = 'Food';

    this.clearErrors();
  },

  // -------------------------------------------------------------------------
  // showErrors
  // -------------------------------------------------------------------------

  /**
   * Renders inline validation error messages for all three fields simultaneously.
   *
   * For each field, sets the `textContent` of its corresponding
   * `<span class="field-error" aria-live="polite">` element:
   * - If the error is a non-empty string, the span displays that message.
   * - If the error is `null`, the span is cleared (set to empty string).
   *
   * All three spans are updated in a single call so every error is visible at
   * once (Requirement 1.4).
   *
   * @param {FormErrors} errors - Map of field names to error messages (or null).
   * @returns {void}
   *
   * Requirements: 1.4, 1.5, 1.6
   */
  showErrors(errors) {
    const itemNameErrorEl = getItemNameError();
    const amountErrorEl = getAmountError();
    const categoryErrorEl = getCategoryError();

    if (itemNameErrorEl) {
      itemNameErrorEl.textContent = errors.itemName ?? '';
    }
    if (amountErrorEl) {
      amountErrorEl.textContent = errors.amount ?? '';
    }
    if (categoryErrorEl) {
      categoryErrorEl.textContent = errors.category ?? '';
    }
  },

  // -------------------------------------------------------------------------
  // clearErrors
  // -------------------------------------------------------------------------

  /**
   * Clears all inline validation error messages by setting the `textContent`
   * of each `<span class="field-error">` to an empty string.
   *
   * This hides the spans visually (when CSS rules hide empty spans) and
   * removes any previously displayed error messages.
   *
   * @returns {void}
   */
  clearErrors() {
    this.showErrors({ itemName: null, amount: null, category: null });
  },
};
