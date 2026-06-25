/**
 * @file historyList.js
 * Renders the transaction history list UI component.
 * Handles sorting, empty-state, and individual entry markup.
 *
 * @module historyList
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Formats a numeric amount as a USD string with exactly 2 decimal places.
 *
 * @param {number} amount
 * @returns {string} e.g. "$12.50"
 */
function formatAmount(amount) {
  return '$' + amount.toFixed(2);
}

/**
 * Converts a Unix timestamp (ms) to a locale date string.
 *
 * @param {number} timestamp
 * @returns {string} e.g. "6/20/2025"
 */
function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Creates a single `<li>` element representing one transaction.
 *
 * Structure:
 * ```html
 * <li class="transaction-list__item" data-id="<id>">
 *   <span class="transaction-list__item-name"><itemName></span>
 *   <span class="transaction-list__item-amount"><$amount></span>
 *   <span class="transaction-list__item-category transaction-list__item-category--<lower>"><category></span>
 *   <span class="transaction-list__item-date"><date></span>
 * </li>
 * ```
 *
 * @param {import('./app.js').Transaction} tx
 * @returns {HTMLLIElement}
 */
function createTransactionItem(tx) {
  const li = document.createElement('li');
  li.className = 'transaction-list__item';
  li.dataset.id = tx.id;

  const nameSpan = document.createElement('span');
  nameSpan.className = 'transaction-list__item-name';
  nameSpan.textContent = tx.itemName;

  const amountSpan = document.createElement('span');
  amountSpan.className = 'transaction-list__item-amount';
  amountSpan.textContent = formatAmount(tx.amount);

  const categorySlug = tx.category.toLowerCase();
  const categorySpan = document.createElement('span');
  categorySpan.className =
    `transaction-list__item-category transaction-list__item-category--${categorySlug}`;
  categorySpan.textContent = tx.category;

  const dateSpan = document.createElement('span');
  dateSpan.className = 'transaction-list__item-date';
  dateSpan.textContent = formatDate(tx.timestamp);

  li.appendChild(nameSpan);
  li.appendChild(amountSpan);
  li.appendChild(categorySpan);
  li.appendChild(dateSpan);

  return li;
}

// ---------------------------------------------------------------------------
// historyList component
// ---------------------------------------------------------------------------

/**
 * Renders the `#transaction-list` element with the supplied transactions.
 *
 * Behaviour:
 * 1. Sorts a *copy* of `transactions` descending by `tx.timestamp`
 *    (most recent first) — the original array is never mutated.
 * 2. Clears the `#transaction-list` element.
 * 3. If `transactions` is empty, renders a single empty-state `<li>`.
 * 4. Otherwise renders one `<li>` per transaction with:
 *    - item name
 *    - amount formatted to 2 decimal places (e.g. `$12.50`)
 *    - category badge
 *    - date string (`new Date(tx.timestamp).toLocaleDateString()`)
 *    Each `<li>` carries a `data-id` attribute for future delete support.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4
 *
 * @param {import('./app.js').Transaction[]} transactions
 * @returns {void}
 */
function render(transactions) {
  const list = document.getElementById('transaction-list');
  if (!list) return;

  // Clear existing content
  list.innerHTML = '';

  // Empty state
  if (!transactions || transactions.length === 0) {
    const emptyLi = document.createElement('li');
    emptyLi.className = 'transaction-list__empty';
    emptyLi.textContent = 'No transactions recorded yet.';
    list.appendChild(emptyLi);
    return;
  }

  // Sort a copy — do NOT mutate the caller's array
  const sorted = transactions.slice().sort((a, b) => b.timestamp - a.timestamp);

  for (const tx of sorted) {
    list.appendChild(createTransactionItem(tx));
  }
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/** @type {{ render: (transactions: import('./app.js').Transaction[]) => void }} */
export const historyList = { render };
