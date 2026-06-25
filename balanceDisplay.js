/**
 * @file balanceDisplay.js
 * Renders the running total balance in the DOM.
 *
 * @module balanceDisplay
 */

/**
 * @typedef {import('./app.js').Transaction} Transaction
 */

/**
 * Sums all transaction amounts and updates the balance display element.
 *
 * - Formats the total to exactly 2 decimal places using `toFixed(2)`.
 * - Displays `0.00` when the array is empty.
 *
 * @param {Transaction[]} transactions - The current list of transactions.
 * @returns {void}
 */
function render(transactions) {
  const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const formatted = total.toFixed(2);

  const el = document.getElementById('balance-display');
  if (el) {
    el.textContent = formatted;
  }
}

export const balanceDisplay = { render };
