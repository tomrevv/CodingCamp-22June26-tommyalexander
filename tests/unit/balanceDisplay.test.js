/**
 * @file tests/unit/balanceDisplay.test.js
 * Unit tests for the balanceDisplay module.
 * Tests DOM rendering: summing amounts and formatting to 2 decimal places.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { balanceDisplay } from '../../balanceDisplay.js';

// ---------------------------------------------------------------------------
// Setup — provide the DOM element that balanceDisplay.render() targets
// ---------------------------------------------------------------------------

beforeEach(() => {
  document.body.innerHTML = `<span id="balance-display">0.00</span>`;
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function getDisplayText() {
  return document.getElementById('balance-display').textContent;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('balanceDisplay.render', () => {
  it('shows 0.00 for an empty array', () => {
    balanceDisplay.render([]);
    expect(getDisplayText()).toBe('0.00');
  });

  it('shows the correct amount for a single transaction', () => {
    balanceDisplay.render([
      { id: '1', itemName: 'Lunch', amount: 12.50, category: 'Food', timestamp: 1 },
    ]);
    expect(getDisplayText()).toBe('12.50');
  });

  it('sums multiple transactions correctly', () => {
    balanceDisplay.render([
      { id: '1', itemName: 'Lunch', amount: 12.50, category: 'Food', timestamp: 1 },
      { id: '2', itemName: 'Bus',   amount: 2.00,  category: 'Transport', timestamp: 2 },
      { id: '3', itemName: 'Movie', amount: 15.00, category: 'Fun', timestamp: 3 },
    ]);
    expect(getDisplayText()).toBe('29.50');
  });

  it('formats a whole-number total to 2 decimal places', () => {
    balanceDisplay.render([
      { id: '1', itemName: 'Item', amount: 10, category: 'Food', timestamp: 1 },
      { id: '2', itemName: 'Item', amount: 5,  category: 'Fun',  timestamp: 2 },
    ]);
    expect(getDisplayText()).toBe('15.00');
  });

  it('formats a single-decimal-place total to 2 decimal places', () => {
    balanceDisplay.render([
      { id: '1', itemName: 'Item', amount: 1.5, category: 'Food', timestamp: 1 },
    ]);
    expect(getDisplayText()).toBe('1.50');
  });

  it('handles the minimum valid amount 0.01', () => {
    balanceDisplay.render([
      { id: '1', itemName: 'Item', amount: 0.01, category: 'Food', timestamp: 1 },
    ]);
    expect(getDisplayText()).toBe('0.01');
  });

  it('handles a large total', () => {
    balanceDisplay.render([
      { id: '1', itemName: 'Item', amount: 9999999.99, category: 'Fun', timestamp: 1 },
    ]);
    expect(getDisplayText()).toBe('9999999.99');
  });

  it('re-renders correctly on successive calls', () => {
    balanceDisplay.render([
      { id: '1', itemName: 'Lunch', amount: 10.00, category: 'Food', timestamp: 1 },
    ]);
    expect(getDisplayText()).toBe('10.00');

    balanceDisplay.render([]);
    expect(getDisplayText()).toBe('0.00');
  });
});
