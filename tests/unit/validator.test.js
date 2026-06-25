/**
 * @file tests/unit/validator.test.js
 * Unit tests for the validator module.
 * Tests specific examples and edge cases for each validation function.
 */

import { describe, it, expect } from 'vitest';
import {
  validateItemName,
  validateAmount,
  validateCategory,
  validateForm,
} from '../../validator.js';

// ---------------------------------------------------------------------------
// validateItemName
// ---------------------------------------------------------------------------

describe('validateItemName', () => {
  // Valid cases
  it('accepts a normal name', () => {
    const result = validateItemName('Lunch');
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  it('accepts a name of exactly 1 character', () => {
    const result = validateItemName('A');
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  it('accepts a name of exactly 100 characters', () => {
    const name = 'A'.repeat(100);
    const result = validateItemName(name);
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  it('accepts a name that is 100 chars when trimmed', () => {
    const name = '  ' + 'B'.repeat(100) + '  ';
    const result = validateItemName(name);
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  // Invalid — empty / whitespace-only
  it('rejects an empty string', () => {
    const result = validateItemName('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Item name is required');
  });

  it('rejects a whitespace-only string', () => {
    const result = validateItemName('   ');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Item name is required');
  });

  it('rejects a tab-only string', () => {
    const result = validateItemName('\t\n');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Item name is required');
  });

  // Invalid — too long
  it('rejects a name of 101 trimmed characters', () => {
    const name = 'A'.repeat(101);
    const result = validateItemName(name);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Item name must be 100 characters or fewer');
  });

  it('rejects a name whose trimmed length is 101', () => {
    const name = '  ' + 'B'.repeat(101) + '  ';
    const result = validateItemName(name);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Item name must be 100 characters or fewer');
  });
});

// ---------------------------------------------------------------------------
// validateAmount
// ---------------------------------------------------------------------------

describe('validateAmount', () => {
  // Valid cases — boundary values
  it('accepts the minimum valid amount 0.01', () => {
    const result = validateAmount('0.01');
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  it('accepts the maximum valid amount 9999999.99', () => {
    const result = validateAmount('9999999.99');
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  it('accepts a whole number', () => {
    const result = validateAmount('100');
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  it('accepts one decimal place', () => {
    const result = validateAmount('12.5');
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  it('accepts two decimal places', () => {
    const result = validateAmount('12.50');
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  it('accepts amount with leading/trailing spaces', () => {
    const result = validateAmount('  25.00  ');
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  // Invalid — empty
  it('rejects an empty string', () => {
    const result = validateAmount('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Amount is required');
  });

  it('rejects a whitespace-only string', () => {
    const result = validateAmount('   ');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Amount is required');
  });

  // Invalid — not a number
  it('rejects a non-numeric string', () => {
    const result = validateAmount('abc');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Amount must be a number');
  });

  it('rejects a string with embedded letters', () => {
    const result = validateAmount('12a.50');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Amount must be a number');
  });

  // Invalid — below minimum
  it('rejects 0', () => {
    const result = validateAmount('0');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Amount must be at least 0.01');
  });

  it('rejects a negative number', () => {
    const result = validateAmount('-1');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Amount must be at least 0.01');
  });

  it('rejects 0.009 (below 0.01)', () => {
    const result = validateAmount('0.009');
    expect(result.valid).toBe(false);
    // 0.009 < 0.01 triggers the "at least 0.01" error
    expect(result.error).toBe('Amount must be at least 0.01');
  });

  // Invalid — above maximum
  it('rejects 10000000', () => {
    const result = validateAmount('10000000');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Amount must be 9,999,999.99 or less');
  });

  it('rejects 9999999.999 (above max before decimal check)', () => {
    const result = validateAmount('9999999.999');
    expect(result.valid).toBe(false);
    // 9999999.999 > 9999999.99 so hits the max check first
    expect(result.error).toBe('Amount must be 9,999,999.99 or less');
  });

  // Invalid — too many decimal places
  it('rejects 0.001 (3 decimal places, below min)', () => {
    const result = validateAmount('0.001');
    expect(result.valid).toBe(false);
    // 0.001 < 0.01 so hits the minimum check before decimal places
    expect(result.error).toBe('Amount must be at least 0.01');
  });

  it('rejects 1.001 (3 decimal places within range)', () => {
    const result = validateAmount('1.001');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Amount can have at most 2 decimal places');
  });

  it('rejects 100.123 (3 decimal places)', () => {
    const result = validateAmount('100.123');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Amount can have at most 2 decimal places');
  });
});

// ---------------------------------------------------------------------------
// validateCategory
// ---------------------------------------------------------------------------

describe('validateCategory', () => {
  // Valid cases
  it('accepts "Food"', () => {
    const result = validateCategory('Food');
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  it('accepts "Transport"', () => {
    const result = validateCategory('Transport');
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  it('accepts "Fun"', () => {
    const result = validateCategory('Fun');
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  // Invalid cases
  it('rejects an empty string', () => {
    const result = validateCategory('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Category must be Food, Transport, or Fun');
  });

  it('rejects a lowercase variant "food"', () => {
    const result = validateCategory('food');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Category must be Food, Transport, or Fun');
  });

  it('rejects an arbitrary string', () => {
    const result = validateCategory('Entertainment');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Category must be Food, Transport, or Fun');
  });

  it('rejects a number', () => {
    // @ts-ignore — intentionally testing non-string
    const result = validateCategory(1);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Category must be Food, Transport, or Fun');
  });
});

// ---------------------------------------------------------------------------
// validateForm
// ---------------------------------------------------------------------------

describe('validateForm', () => {
  it('returns valid when all fields are correct', () => {
    const result = validateForm({
      itemName: 'Lunch',
      amount: '12.50',
      category: 'Food',
    });
    expect(result.valid).toBe(true);
    expect(result.errors.itemName).toBeNull();
    expect(result.errors.amount).toBeNull();
    expect(result.errors.category).toBeNull();
  });

  it('returns invalid with all three errors when all fields are empty', () => {
    const result = validateForm({ itemName: '', amount: '', category: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.itemName).toBe('Item name is required');
    expect(result.errors.amount).toBe('Amount is required');
    expect(result.errors.category).toBe('Category must be Food, Transport, or Fun');
  });

  it('shows itemName error only when other fields are valid', () => {
    const result = validateForm({
      itemName: '',
      amount: '10.00',
      category: 'Transport',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.itemName).not.toBeNull();
    expect(result.errors.amount).toBeNull();
    expect(result.errors.category).toBeNull();
  });

  it('shows amount error only when other fields are valid', () => {
    const result = validateForm({
      itemName: 'Bus',
      amount: 'abc',
      category: 'Transport',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.itemName).toBeNull();
    expect(result.errors.amount).not.toBeNull();
    expect(result.errors.category).toBeNull();
  });

  it('shows category error only when other fields are valid', () => {
    const result = validateForm({
      itemName: 'Movie',
      amount: '15.00',
      category: 'Entertainment',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.itemName).toBeNull();
    expect(result.errors.amount).toBeNull();
    expect(result.errors.category).not.toBeNull();
  });

  it('reports all errors simultaneously when multiple fields are invalid', () => {
    const result = validateForm({
      itemName: '  ',
      amount: '-5',
      category: 'other',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.itemName).not.toBeNull();
    expect(result.errors.amount).not.toBeNull();
    expect(result.errors.category).not.toBeNull();
  });

  it('handles missing fields gracefully (undefined)', () => {
    const result = validateForm({});
    expect(result.valid).toBe(false);
    expect(result.errors.itemName).not.toBeNull();
    expect(result.errors.amount).not.toBeNull();
    expect(result.errors.category).not.toBeNull();
  });
});
