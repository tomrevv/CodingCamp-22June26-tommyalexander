/**
 * @file categoryChart.js
 * Renders the CSS bar chart for spending by category.
 *
 * The chart uses CSS custom property `--bar-height` on each `.chart-bar`
 * element. The CSS rule `height: var(--bar-height)` in styles.css resolves
 * the percentage against the `.chart-bar-group` height (200px), so
 * a bar with `--bar-height: 60%` renders at 120px — proportional to the
 * tallest bar which always reaches 100% (200px).
 *
 * A CSS `transition: height 0.3s ease` on `.chart-bar` ensures smooth visual
 * updates well within the ≤500ms requirement (Req 4.3).
 *
 * @module categoryChart
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Computes per-category totals and the proportional height percentage for
 * each bar relative to the category with the highest spend.
 *
 * @param {import('./app.js').Transaction[]} transactions
 * @returns {{ [category: string]: { total: number, heightPct: number } }}
 */
function calcBarHeights(transactions) {
  const totals = { Food: 0, Transport: 0, Fun: 0 };

  for (const tx of transactions) {
    if (tx.category in totals) {
      totals[tx.category] += tx.amount;
    }
  }

  const max = Math.max(...Object.values(totals));

  return Object.fromEntries(
    Object.entries(totals).map(([cat, total]) => [
      cat,
      { total, heightPct: max === 0 ? 0 : (total / max) * 100 }
    ])
  );
}

// ---------------------------------------------------------------------------
// categoryChart
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} CategoryChart
 * @property {function(import('./app.js').Transaction[]): void} render
 */

/**
 * Renders the category bar chart.
 *
 * For each category (Food, Transport, Fun):
 *  - Sets `--bar-height` on the `.chart-bar` element so the CSS computes the
 *    correct pixel height (Req 4.1, 4.2).
 *  - Updates `#chart-value-{category}` with the formatted dollar amount (Req 4.2).
 *  - Zero-total categories render at 0% height but labels and "$0.00" remain
 *    visible (Req 4.5).
 *
 * Updates the container's `aria-label` to summarize all three totals for
 * screen readers (Req 4.4).
 *
 * The CSS `transition: height 0.3s ease` defined in styles.css provides
 * smooth bar animation on every update (Req 4.3).
 *
 * @type {CategoryChart}
 */
export const categoryChart = {
  /**
   * Re-renders the bar chart to reflect the current transaction list.
   *
   * @param {import('./app.js').Transaction[]} transactions - All current transactions.
   * @returns {void}
   */
  render(transactions) {
    const container = document.getElementById('category-chart');
    if (!container) return;

    const heights = calcBarHeights(transactions);

    // -----------------------------------------------------------------------
    // Update each bar: --bar-height custom property + value label
    // -----------------------------------------------------------------------
    const categories = ['Food', 'Transport', 'Fun'];

    for (const cat of categories) {
      const { total, heightPct } = heights[cat];
      const catLower = cat.toLowerCase();

      // Set CSS custom property on the bar element so the CSS rule
      // `height: var(--bar-height)` resolves the percentage against the
      // 200px chart-bar-group height.
      const barEl = container.querySelector(`.chart-bar--${catLower}`);
      if (barEl) {
        barEl.style.setProperty('--bar-height', `${heightPct}%`);
      }

      // Update the dollar value label beneath the bar.
      const valueEl = document.getElementById(`chart-value-${catLower}`);
      if (valueEl) {
        valueEl.textContent = `$${total.toFixed(2)}`;
      }
    }

    // -----------------------------------------------------------------------
    // Update aria-label so screen readers get a summary of all totals (Req 4.4)
    // -----------------------------------------------------------------------
    const foodTotal      = heights['Food'].total;
    const transportTotal = heights['Transport'].total;
    const funTotal       = heights['Fun'].total;

    container.setAttribute(
      'aria-label',
      `Spending by category: Food $${foodTotal.toFixed(2)}, ` +
      `Transport $${transportTotal.toFixed(2)}, ` +
      `Fun $${funTotal.toFixed(2)}`
    );
  }
};
