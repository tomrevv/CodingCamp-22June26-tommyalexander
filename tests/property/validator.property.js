/**
 * @file tests/property/validator.property.js
 * Property-based tests for the validator module.
 *
 * Covers:
 *   - Property 2: Validator rejects all inputs with any invalid field
 *   - Property 3: Amount validation boundary is precise
 *   - Property 4: Item name validation boundary is precise
 *
 * Uses fast-check for property generation with numRuns: 100 minimum.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateItemName,
  validateAmount,
  validateCategory,
  validateForm,
} from '../../validator.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a string with exactly `n` characters of padding around a safe core. */
function repeatChar(char, n) {
  return char.repeat(n);
}

// ---------------------------------------------------------------------------
// Property 4: Item name validation boundary is precise
// Validates: Requirements 1.6
// ---------------------------------------------------------------------------

describe('Property 4: validateItemName boundary is precise', () => {
  // Feature: expense-budget-visualizer, Property 4: Item name validation boundary is precise
  it('accepts any string whose trimmed length is in [1, 100]', () => {
    fc.assert(
      fc.property(
        // Generate strings that, after trimming, are between 1 and 100 chars.
        // We do this by generating a core string of 1–100 printable chars and
        // optionally wrapping it in whitespace.
        fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length >= 1),
        (core) => {
          const result = validateItemName(core);
          expect(result.valid).toBe(true);
          expect(result.error).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: expense-budget-visualizer, Property 4: Item name validation boundary is precise
  it('rejects any string whose trimmed length is 0 (empty/whitespace-only)', () => {
    fc.assert(
      fc.property(
        // Whitespace characters only
        fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 0, maxLength: 20 }),
        (spaces) => {
          const result = validateItemName(spaces);
          expect(result.valid).toBe(false);
          expect(result.error).toBe('Item name is required');
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: expense-budget-visualizer, Property 4: Item name validation boundary is precise
  it('rejects any string whose trimmed length exceeds 100', () => {
    fc.assert(
      fc.property(
        // Generate strings with trimmed length strictly > 100
        fc.integer({ min: 101, max: 200 }).chain((len) =>
          fc.string({ minLength: len, maxLength: len }).filter((s) => s.trim().length > 100)
        ),
        (longName) => {
          const result = validateItemName(longName);
          expect(result.valid).toBe(false);
          expect(result.error).toBe('Item name must be 100 characters or fewer');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: Amount validation boundary is precise
// Validates: Requirements 1.5
// ---------------------------------------------------------------------------

describe('Property 3: validateAmount boundary is precise', () => {
  // Feature: expense-budget-visualizer, Property 3: Amount validation boundary is precise
  it('accepts any amount string in [0.01, 9999999.99] with at most 2 decimal places', () => {
    fc.assert(
      fc.property(
        // Generate amounts with 0, 1, or 2 decimal places in valid range
        fc.integer({ min: 1, max: 999999999 }).map((cents) => {
          // cents represents value * 100, so divide to get decimal
          return (cents / 100).toFixed(2);
        }),
        (amountStr) => {
          const val = parseFloat(amountStr);
          // Only test values truly in range
          if (val >= 0.01 && val <= 9999999.99) {
            const result = validateAmount(amountStr);
            expect(result.valid).toBe(true);
            expect(result.error).toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: expense-budget-visualizer, Property 3: Amount validation boundary is precise
  it('rejects amounts below 0.01', () => {
    fc.assert(
      fc.property(
        // Generate floats strictly below 0.01 (including negatives and zero)
        fc.float({ min: -1000, max: 0.009, noNaN: true }).filter(
          (v) => isFinite(v) && v < 0.01
        ),
        (val) => {
          const str = val.toFixed(4); // ensure it stays below 0.01
          const result = validateAmount(str);
          expect(result.valid).toBe(false);
          // Either "at least 0.01" or "at most 2 decimal places" — both are invalid
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: expense-budget-visualizer, Property 3: Amount validation boundary is precise
  it('rejects amounts above 9999999.99', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000000000, max: 9999999999 }).map((v) => (v / 100).toFixed(2)),
        (amountStr) => {
          const val = parseFloat(amountStr);
          if (val > 9999999.99) {
            const result = validateAmount(amountStr);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Amount must be 9,999,999.99 or less');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: expense-budget-visualizer, Property 3: Amount validation boundary is precise
  it('rejects non-numeric strings', () => {
    fc.assert(
      fc.property(
        // Strings that parseFloat would return NaN for
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => {
          const trimmed = s.trim();
          return trimmed.length > 0 && isNaN(parseFloat(trimmed));
        }),
        (str) => {
          const result = validateAmount(str);
          expect(result.valid).toBe(false);
          expect(result.error).toBe('Amount must be a number');
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: expense-budget-visualizer, Property 3: Amount validation boundary is precise
  it('rejects amounts with more than 2 decimal places when in valid range', () => {
    fc.assert(
      fc.property(
        // Generate amounts in [0.01, 9999999.99] with exactly 3 decimal places
        fc.integer({ min: 10, max: 9999990 }).chain((intPart) =>
          fc.integer({ min: 1, max: 999 }).map((frac) => {
            // frac is the fractional part (3 decimal places)
            // ensure it results in a 3-decimal-place number in valid range
            const val = intPart + frac / 1000;
            return val.toFixed(3);
          })
        ),
        (amountStr) => {
          const val = parseFloat(amountStr);
          if (val >= 0.01 && val <= 9999999.99) {
            // Only test if the string actually has 3 decimal places
            const dotIdx = amountStr.indexOf('.');
            if (dotIdx !== -1 && amountStr.length - dotIdx - 1 === 3) {
              const result = validateAmount(amountStr);
              expect(result.valid).toBe(false);
              expect(result.error).toBe('Amount can have at most 2 decimal places');
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: Validator rejects all inputs with any invalid field (validateForm)
// Validates: Requirements 1.4, 1.5, 1.6
// ---------------------------------------------------------------------------

describe('Property 2: validateForm rejects inputs with any invalid field', () => {
  // Feature: expense-budget-visualizer, Property 2: Validator rejects all inputs with any invalid field

  it('rejects form when itemName is invalid — error is reported for itemName', () => {
    fc.assert(
      fc.property(
        // Invalid itemName: empty string
        fc.constantFrom('', '   ', '\t', '\n'),
        // Valid amount
        fc.integer({ min: 1, max: 999999999 }).map((c) => (c / 100).toFixed(2)),
        // Valid category
        fc.constantFrom('Food', 'Transport', 'Fun'),
        (itemName, amount, category) => {
          const result = validateForm({ itemName, amount, category });
          expect(result.valid).toBe(false);
          expect(result.errors.itemName).not.toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects form when amount is invalid — error is reported for amount', () => {
    fc.assert(
      fc.property(
        // Valid itemName
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length >= 1),
        // Invalid amount: non-numeric
        fc.string({ minLength: 1, maxLength: 10 }).filter((s) => {
          const t = s.trim();
          return t.length > 0 && isNaN(parseFloat(t));
        }),
        // Valid category
        fc.constantFrom('Food', 'Transport', 'Fun'),
        (itemName, amount, category) => {
          const result = validateForm({ itemName, amount, category });
          expect(result.valid).toBe(false);
          expect(result.errors.amount).not.toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects form when category is invalid — error is reported for category', () => {
    fc.assert(
      fc.property(
        // Valid itemName
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length >= 1),
        // Valid amount
        fc.integer({ min: 1, max: 999999999 }).map((c) => (c / 100).toFixed(2)),
        // Invalid category: anything not in the allowed set
        fc.string({ minLength: 0, maxLength: 20 }).filter(
          (s) => !['Food', 'Transport', 'Fun'].includes(s)
        ),
        (itemName, amount, category) => {
          const result = validateForm({ itemName, amount, category });
          expect(result.valid).toBe(false);
          expect(result.errors.category).not.toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('accepts form when all fields are valid — no errors', () => {
    fc.assert(
      fc.property(
        // Valid itemName: 1–100 non-whitespace-only chars
        fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length >= 1),
        // Valid amount: in range, at most 2 decimal places
        fc.integer({ min: 1, max: 999999999 }).map((c) => (c / 100).toFixed(2)),
        // Valid category
        fc.constantFrom('Food', 'Transport', 'Fun'),
        (itemName, amount, category) => {
          const val = parseFloat(amount);
          // Guard: ensure generated amount is truly in range
          if (val < 0.01 || val > 9999999.99) return;

          const result = validateForm({ itemName, amount, category });
          expect(result.valid).toBe(true);
          expect(result.errors.itemName).toBeNull();
          expect(result.errors.amount).toBeNull();
          expect(result.errors.category).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('all errors reported simultaneously when all fields invalid', () => {
    fc.assert(
      fc.property(
        // Invalid itemName
        fc.constantFrom('', '   '),
        // Invalid amount
        fc.constantFrom('', 'abc', '-1', '0'),
        // Invalid category
        fc.constantFrom('', 'food', 'Other'),
        (itemName, amount, category) => {
          const result = validateForm({ itemName, amount, category });
          expect(result.valid).toBe(false);
          // All three errors must be non-null simultaneously
          expect(result.errors.itemName).not.toBeNull();
          expect(result.errors.amount).not.toBeNull();
          expect(result.errors.category).not.toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
