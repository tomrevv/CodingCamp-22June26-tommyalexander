/**
 * @file validator.js
 * Pure validation functions for the Expense & Budget Visualizer input form.
 * No side effects, no DOM access.
 *
 * @module validator
 */

/**
 * @typedef {{ valid: boolean, error: string | null }} ValidationResult
 */

/**
 * @typedef {{ itemName: string, amount: string, category: string }} FormFields
 */

/**
 * @typedef {{ valid: boolean, errors: { itemName: string|null, amount: string|null, category: string|null } }} FormValidationResult
 */

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

/**
 * Returns `true` if the *string* representation of the amount has at most 2
 * decimal places. Operates on the trimmed input string (not the parsed float)
 * so that strings like "100.500" (3 explicit decimal digits) are correctly
 * flagged even though `Number("100.500") === 100.5` drops the trailing zero.
 *
 * @param {string} trimmedStr - The whitespace-trimmed amount string.
 * @returns {boolean}
 */
function hasAtMostTwoDecimalPlaces(trimmedStr) {
  const dotIndex = trimmedStr.indexOf('.');
  if (dotIndex === -1) return true;
  return trimmedStr.length - dotIndex - 1 <= 2;
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

/**
 * Validates an item name string.
 *
 * Rules:
 * - trimmed length must be ≥ 1 (non-empty)
 * - trimmed length must be ≤ 100
 *
 * @param {string} value - Raw string from the item name input field.
 * @returns {ValidationResult}
 */
export function validateItemName(value) {
  const trimmed = typeof value === 'string' ? value.trim() : '';

  if (trimmed.length === 0) {
    return { valid: false, error: 'Item name is required' };
  }
  if (trimmed.length > 100) {
    return { valid: false, error: 'Item name must be 100 characters or fewer' };
  }
  return { valid: true, error: null };
}

/**
 * Validates an amount string.
 *
 * Pipeline:
 * 1. Empty string → "Amount is required"
 * 2. Number(trimmed) → NaN → "Amount must be a number"
 * 3. value < 0.01 → "Amount must be at least 0.01"
 * 4. value > 9999999.99 → "Amount must be 9,999,999.99 or less"
 * 5. more than 2 decimal places → "Amount can have at most 2 decimal places"
 *
 * @param {string} value - Raw string from the amount input field.
 * @returns {ValidationResult}
 */
export function validateAmount(value) {
  const trimmed = typeof value === 'string' ? value.trim() : '';

  if (trimmed.length === 0) {
    return { valid: false, error: 'Amount is required' };
  }

  const parsed = Number(trimmed);

  if (isNaN(parsed) || !isFinite(parsed)) {
    return { valid: false, error: 'Amount must be a number' };
  }

  if (parsed < 0.01) {
    return { valid: false, error: 'Amount must be at least 0.01' };
  }

  if (parsed > 9999999.99) {
    return { valid: false, error: 'Amount must be 9,999,999.99 or less' };
  }

  if (!hasAtMostTwoDecimalPlaces(parsed)) {
    return { valid: false, error: 'Amount can have at most 2 decimal places' };
  }

  return { valid: true, error: null };
}

/**
 * Validates a category string.
 *
 * Rule: must be exactly one of `"Food"`, `"Transport"`, or `"Fun"`.
 *
 * @param {string} value - Raw string from the category selector.
 * @returns {ValidationResult}
 */
export function validateCategory(value) {
  const VALID_CATEGORIES = ['Food', 'Transport', 'Fun'];

  if (!VALID_CATEGORIES.includes(value)) {
    return { valid: false, error: 'Category must be Food, Transport, or Fun' };
  }
  return { valid: true, error: null };
}

/**
 * Validates all three form fields simultaneously and returns a combined result.
 *
 * All validators run regardless of individual failures so that every error is
 * reported at once (Requirement 1.4).
 *
 * @param {FormFields} fields
 * @returns {FormValidationResult}
 */
export function validateForm(fields) {
  const itemNameResult = validateItemName(fields.itemName ?? '');
  const amountResult = validateAmount(fields.amount ?? '');
  const categoryResult = validateCategory(fields.category ?? '');

  const valid = itemNameResult.valid && amountResult.valid && categoryResult.valid;

  return {
    valid,
    errors: {
      itemName: itemNameResult.error,
      amount: amountResult.error,
      category: categoryResult.error,
    },
  };
}

/**
 * Bundled validator object for use by `inputForm` and other consumers.
 */
export const validator = {
  validateItemName,
  validateAmount,
  validateCategory,
  validateForm,
};
