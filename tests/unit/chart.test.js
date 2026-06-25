/**
 * @file tests/unit/chart.test.js
 * Unit tests for categoryChart.render().
 *
 * Tests cover:
 * - Bar height proportionality (tallest bar = 100%, others proportional)
 * - Dollar value labels update correctly
 * - All-zero case (empty transactions) renders 0% height + $0.00 labels
 * - aria-label updates to summarize all three category totals
 * - All three category bars always rendered (Req 4.5)
 *
 * Uses jsdom (configured via vitest.config.js) to provide a minimal DOM.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { categoryChart } from '../../categoryChart.js';

// ---------------------------------------------------------------------------
// Helpers — build a minimal chart DOM fixture
// ---------------------------------------------------------------------------

/**
 * Injects the category-chart HTML fragment into document.body before each test
 * so categoryChart.render() has real DOM elements to manipulate.
 */
function setupChartDOM() {
  document.body.innerHTML = `
    <div
      id="category-chart"
      class="chart"
      role="img"
      aria-label="Spending by category: Food $0.00, Transport $0.00, Fun $0.00"
    >
      <div class="chart-bars">
        <div class="chart-bar-group">
          <div class="chart-bar chart-bar--food" style="--bar-height: 0%" aria-hidden="true"></div>
          <span class="chart-label">Food</span>
          <span class="chart-value" id="chart-value-food">$0.00</span>
        </div>
        <div class="chart-bar-group">
          <div class="chart-bar chart-bar--transport" style="--bar-height: 0%" aria-hidden="true"></div>
          <span class="chart-label">Transport</span>
          <span class="chart-value" id="chart-value-transport">$0.00</span>
        </div>
        <div class="chart-bar-group">
          <div class="chart-bar chart-bar--fun" style="--bar-height: 0%" aria-hidden="true"></div>
          <span class="chart-label">Fun</span>
          <span class="chart-value" id="chart-value-fun">$0.00</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Returns the `--bar-height` custom property value set on a bar element.
 * @param {string} category - 'food' | 'transport' | 'fun'
 * @returns {string} e.g. "100%"
 */
function getBarHeight(category) {
  const el = document.querySelector(`.chart-bar--${category}`);
  return el.style.getPropertyValue('--bar-height').trim();
}

/** Returns the text content of a value label element. */
function getValueLabel(category) {
  return document.getElementById(`chart-value-${category}`).textContent;
}

/** Returns the current aria-label on the chart container. */
function getAriaLabel() {
  return document.getElementById('category-chart').getAttribute('aria-label');
}

// ---------------------------------------------------------------------------
// Test: all-zero / empty transactions (Req 4.5)
// ---------------------------------------------------------------------------

describe('categoryChart.render — empty transactions', () => {
  beforeEach(setupChartDOM);

  it('sets all bar heights to 0% when transactions array is empty', () => {
    categoryChart.render([]);
    expect(getBarHeight('food')).toBe('0%');
    expect(getBarHeight('transport')).toBe('0%');
    expect(getBarHeight('fun')).toBe('0%');
  });

  it('shows $0.00 for all value labels when transactions array is empty', () => {
    categoryChart.render([]);
    expect(getValueLabel('food')).toBe('$0.00');
    expect(getValueLabel('transport')).toBe('$0.00');
    expect(getValueLabel('fun')).toBe('$0.00');
  });

  it('updates aria-label to show all zeros when transactions array is empty', () => {
    categoryChart.render([]);
    expect(getAriaLabel()).toBe(
      'Spending by category: Food $0.00, Transport $0.00, Fun $0.00'
    );
  });
});

// ---------------------------------------------------------------------------
// Test: bar height proportionality (Req 4.1, 4.2)
// ---------------------------------------------------------------------------

describe('categoryChart.render — bar height proportionality', () => {
  beforeEach(setupChartDOM);

  it('sets the tallest category bar to 100%', () => {
    const transactions = [
      { id: '1', itemName: 'Lunch', amount: 40, category: 'Food', timestamp: 1 },
      { id: '2', itemName: 'Bus',   amount: 10, category: 'Transport', timestamp: 2 },
      { id: '3', itemName: 'Movie', amount: 35, category: 'Fun', timestamp: 3 },
    ];
    categoryChart.render(transactions);
    // Food has highest total (40), so its bar should be 100%
    expect(getBarHeight('food')).toBe('100%');
  });

  it('sets other bars proportionally to the max', () => {
    const transactions = [
      { id: '1', itemName: 'Lunch', amount: 40, category: 'Food', timestamp: 1 },
      { id: '2', itemName: 'Bus',   amount: 10, category: 'Transport', timestamp: 2 },
      { id: '3', itemName: 'Movie', amount: 35, category: 'Fun', timestamp: 3 },
    ];
    categoryChart.render(transactions);
    // Transport: 10/40 * 100 = 25%
    expect(getBarHeight('transport')).toBe('25%');
    // Fun: 35/40 * 100 = 87.5%
    expect(getBarHeight('fun')).toBe('87.5%');
  });

  it('sums multiple transactions in the same category', () => {
    const transactions = [
      { id: '1', itemName: 'Lunch',   amount: 20, category: 'Food', timestamp: 1 },
      { id: '2', itemName: 'Dinner',  amount: 30, category: 'Food', timestamp: 2 },
      { id: '3', itemName: 'Bus',     amount: 50, category: 'Transport', timestamp: 3 },
    ];
    categoryChart.render(transactions);
    // Food: 20+30 = 50, Transport: 50, Fun: 0 → max = 50
    // Food and Transport both at 100%, Fun at 0%
    expect(getBarHeight('food')).toBe('100%');
    expect(getBarHeight('transport')).toBe('100%');
    expect(getBarHeight('fun')).toBe('0%');
  });

  it('sets a single-category scenario: one category at 100%, others at 0%', () => {
    const transactions = [
      { id: '1', itemName: 'Cinema', amount: 25, category: 'Fun', timestamp: 1 },
    ];
    categoryChart.render(transactions);
    expect(getBarHeight('food')).toBe('0%');
    expect(getBarHeight('transport')).toBe('0%');
    expect(getBarHeight('fun')).toBe('100%');
  });
});

// ---------------------------------------------------------------------------
// Test: dollar value labels (Req 4.2)
// ---------------------------------------------------------------------------

describe('categoryChart.render — value labels', () => {
  beforeEach(setupChartDOM);

  it('formats totals to exactly 2 decimal places', () => {
    const transactions = [
      { id: '1', itemName: 'Lunch', amount: 40,   category: 'Food', timestamp: 1 },
      { id: '2', itemName: 'Bus',   amount: 10,   category: 'Transport', timestamp: 2 },
      { id: '3', itemName: 'Movie', amount: 35,   category: 'Fun', timestamp: 3 },
    ];
    categoryChart.render(transactions);
    expect(getValueLabel('food')).toBe('$40.00');
    expect(getValueLabel('transport')).toBe('$10.00');
    expect(getValueLabel('fun')).toBe('$35.00');
  });

  it('shows $0.00 for a category with no transactions (Req 4.5)', () => {
    const transactions = [
      { id: '1', itemName: 'Lunch', amount: 12.50, category: 'Food', timestamp: 1 },
    ];
    categoryChart.render(transactions);
    expect(getValueLabel('food')).toBe('$12.50');
    expect(getValueLabel('transport')).toBe('$0.00');
    expect(getValueLabel('fun')).toBe('$0.00');
  });

  it('accumulates fractional amounts correctly', () => {
    const transactions = [
      { id: '1', itemName: 'Coffee', amount: 3.75, category: 'Food', timestamp: 1 },
      { id: '2', itemName: 'Tea',    amount: 2.25, category: 'Food', timestamp: 2 },
    ];
    categoryChart.render(transactions);
    // 3.75 + 2.25 = 6.00 exactly
    expect(getValueLabel('food')).toBe('$6.00');
  });
});

// ---------------------------------------------------------------------------
// Test: aria-label (Req 4.4)
// ---------------------------------------------------------------------------

describe('categoryChart.render — aria-label', () => {
  beforeEach(setupChartDOM);

  it('updates aria-label with correct totals after render', () => {
    const transactions = [
      { id: '1', itemName: 'Lunch', amount: 40,   category: 'Food',      timestamp: 1 },
      { id: '2', itemName: 'Bus',   amount: 10,   category: 'Transport', timestamp: 2 },
      { id: '3', itemName: 'Movie', amount: 35,   category: 'Fun',       timestamp: 3 },
    ];
    categoryChart.render(transactions);
    expect(getAriaLabel()).toBe(
      'Spending by category: Food $40.00, Transport $10.00, Fun $35.00'
    );
  });

  it('updates aria-label after a second render call with different data', () => {
    categoryChart.render([
      { id: '1', itemName: 'Lunch', amount: 5, category: 'Food', timestamp: 1 },
    ]);
    // Now re-render with new data
    categoryChart.render([
      { id: '2', itemName: 'Taxi', amount: 20, category: 'Transport', timestamp: 2 },
    ]);
    expect(getAriaLabel()).toBe(
      'Spending by category: Food $0.00, Transport $20.00, Fun $0.00'
    );
  });
});

// ---------------------------------------------------------------------------
// Test: graceful handling of unknown categories
// ---------------------------------------------------------------------------

describe('categoryChart.render — unknown category handling', () => {
  beforeEach(setupChartDOM);

  it('ignores transactions with unknown categories', () => {
    const transactions = [
      { id: '1', itemName: 'Misc', amount: 100, category: 'Other', timestamp: 1 },
      { id: '2', itemName: 'Lunch', amount: 20, category: 'Food', timestamp: 2 },
    ];
    categoryChart.render(transactions);
    // Only Food should have a value; unknown category is ignored
    expect(getValueLabel('food')).toBe('$20.00');
    expect(getValueLabel('transport')).toBe('$0.00');
    expect(getValueLabel('fun')).toBe('$0.00');
  });
});
