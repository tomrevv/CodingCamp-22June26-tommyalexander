# Design Document: Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a purely client-side single-page application (SPA) built with plain HTML, CSS, and vanilla JavaScript. It runs entirely in the browser with no build step, no bundler, and no third-party libraries. All data is persisted via the browser's `localStorage` API.

The application allows users to:
- Record spending transactions (item name, amount, category)
- Browse all past transactions, sorted most-recent-first
- See a running total balance
- View a bar chart of spending broken down by category (Food, Transport, Fun)

The architecture is deliberately minimal: a single `index.html` entry point, an embedded or linked stylesheet, and a single JavaScript module. This keeps deployment trivial (drag-and-drop any static host or package as a browser extension manifest).

---

## Architecture

### File Structure

The project is structured as a minimal multi-file layout for maintainability while staying framework-free:

```
expense-budget-visualizer/
├── index.html        # Shell: markup structure + <link>/<script> tags
├── styles.css        # All styling, custom properties, responsive rules
└── app.js            # All application logic (modules via <script type="module">)
```

`app.js` uses the native ES Module system (`import`/`export`) to keep logical concerns separated inside a single file or split across small sub-files if desired, without any bundler. The entry `<script type="module" src="app.js">` in `index.html` is sufficient for all modern browsers.

### Execution Model

```
Browser loads index.html
  └─> styles.css applied
  └─> app.js (module) executed
        ├─ storageService.init()   # detect localStorage availability
        ├─ store.load()            # read + validate from localStorage
        ├─ ui.render()             # initial paint of all sections
        └─ eventBus.attach()      # bind form submit, future delete/edit
```

All state mutations flow through a central `store` object. After every mutation the `store` notifies registered UI handlers to re-render the affected sections (balance, list, chart). There is no virtual DOM; direct DOM manipulation is used.

### State Flow Diagram

```
User Action (form submit / delete)
        │
        ▼
  validator.validate(input)
        │ invalid ─────────────────▶  show inline errors, stop
        │ valid
        ▼
  store.addTransaction(tx)
        │
        ├─▶ storageService.save(store.transactions)   [≤100ms]
        │
        └─▶ notify UI subscribers
              ├─▶ historyList.render()    [≤1s]
              ├─▶ balanceDisplay.render() [≤1s]
              └─▶ categoryChart.render()  [≤500ms]
```

---

## Components and Interfaces

### 1. `storageService`

Wraps all `localStorage` interaction. Isolates the rest of the application from storage failures.

```js
storageService = {
  isAvailable(): boolean,                        // feature-detect localStorage
  save(transactions: Transaction[]): boolean,    // serialize + write, returns success
  load(): { transactions: Transaction[], skippedCount: number }
}
```

- `isAvailable()` performs a test write/read/delete at startup.
- `save()` calls `JSON.stringify` and `localStorage.setItem`. If it throws (quota exceeded, security error), it returns `false` so the caller can keep the form filled.
- `load()` calls `localStorage.getItem` + `JSON.parse`. Malformed JSON returns `{ transactions: [], skippedCount: 0 }` with a storage-error flag. Each record is validated individually; invalid ones are counted and skipped.

### 2. `validator`

Pure functions — no side effects, no DOM access.

```js
validator = {
  validateItemName(value: string): ValidationResult,
  validateAmount(value: string): ValidationResult,
  validateCategory(value: string): ValidationResult,
  validateForm(fields: FormFields): FormValidationResult
}

ValidationResult = { valid: boolean, error: string | null }
FormValidationResult = { valid: boolean, errors: { itemName, amount, category } }
```

Rules:
- `itemName`: non-empty string, length ≤ 100 characters after trimming
- `amount`: parseable as a finite decimal number, in range [0.01, 9999999.99], at most 2 decimal places
- `category`: must be exactly one of `"Food"`, `"Transport"`, `"Fun"`

### 3. `store`

Single source of truth for application state. Holds the transaction list and coordinates persistence.

```js
store = {
  transactions: Transaction[],
  listeners: Set<() => void>,

  load(): void,                              // read from storageService on startup
  addTransaction(tx: Transaction): boolean,  // validate + persist + notify
  deleteTransaction(id: string): void,       // remove + persist + notify
  subscribe(fn: () => void): void,
  notify(): void
}
```

- `addTransaction` returns `true` on success, `false` if persistence failed (form stays filled per Req 1.3).
- `deleteTransaction` always succeeds in-memory; storage failure shows a non-blocking notification.

### 4. `inputForm`

Manages the `<form>` DOM element.

```js
inputForm = {
  init(): void,              // bind submit listener
  reset(): void,             // clear fields, reset category to Food
  showErrors(errors): void,  // render inline error messages
  clearErrors(): void
}
```

On submit:
1. Reads field values.
2. Calls `validator.validateForm(fields)`.
3. If invalid: calls `showErrors()`, returns.
4. If valid: calls `store.addTransaction(tx)`. If it returns `false` (save failed), keep form filled and show a notification.

### 5. `historyList`

Renders the `<ul>` or `<ol>` transaction history.

```js
historyList = {
  render(transactions: Transaction[]): void
}
```

- Sorts descending by `tx.timestamp` before rendering.
- Renders empty-state message when `transactions.length === 0`.
- Each list item includes: item name, formatted amount, category badge, date string.

### 6. `balanceDisplay`

Renders the total balance `<div>`.

```js
balanceDisplay = {
  render(transactions: Transaction[]): void
}
```

- Sums all `tx.amount` values, formats to 2 decimal places.
- Shows `0.00` when array is empty.

### 7. `categoryChart`

Renders the bar chart using only HTML/CSS.

```js
categoryChart = {
  render(transactions: Transaction[]): void
}
```

See Chart Rendering section for full details.

### 8. `notificationBanner`

Non-blocking notification area for storage warnings and skipped-records messages.

```js
notificationBanner = {
  show(message: string, type: 'info' | 'warning' | 'error'): void,
  hide(): void
}
```

Auto-dismisses after 5 seconds (configurable). Uses `aria-live="polite"` for screen reader support.

---

## Data Models

### `Transaction` Object

```js
{
  id:        string,   // crypto.randomUUID() or Date.now().toString() fallback
  itemName:  string,   // 1–100 characters (trimmed)
  amount:    number,   // float, 0.01–9999999.99, stored at full precision
  category:  string,   // "Food" | "Transport" | "Fun"
  timestamp: number    // Unix epoch milliseconds (Date.now())
}
```

The `id` field is used for delete operations and React-style reconciliation when re-rendering the list.

### `LocalStorage` Schema

```
Key:   "expense_budget_transactions"
Value: JSON string — array of Transaction objects

Example:
[
  {
    "id": "1718000000001",
    "itemName": "Lunch",
    "amount": 12.50,
    "category": "Food",
    "timestamp": 1718000000001
  }
]
```

A single key holds the full serialized array. On each write, the entire array is re-serialized and the key is overwritten atomically. This avoids partial-update inconsistencies.

### Validation Rules (formal)

| Field     | Rule                                                                 |
|-----------|----------------------------------------------------------------------|
| itemName  | typeof string, trimmed length ≥ 1, trimmed length ≤ 100             |
| amount    | parseFloat succeeds, isFinite, value ≥ 0.01, value ≤ 9999999.99, decimal places ≤ 2 |
| category  | value ∈ { "Food", "Transport", "Fun" }                               |
| timestamp | typeof number, isFinite, > 0                                        |
| id        | typeof string, length > 0                                           |

### Decimal Places Check

```js
function hasAtMostTwoDecimalPlaces(value) {
  const str = value.toString();
  const dotIndex = str.indexOf('.');
  if (dotIndex === -1) return true;
  return str.length - dotIndex - 1 <= 2;
}
```

---

## UI Layout and Wireframe

### Layout Structure

```
┌─────────────────────────────────┐
│         APP HEADER              │
│   "Expense & Budget Visualizer" │
├─────────────────────────────────┤
│  ┌───────────────────────────┐  │
│  │      BALANCE DISPLAY      │  │
│  │    Total Spent: $0.00     │  │
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│  ┌───────────────────────────┐  │
│  │      INPUT FORM           │  │
│  │  Item Name: [__________]  │  │
│  │  Amount:    [__________]  │  │
│  │  Category:  [Food    ▾]   │  │
│  │             [ Add Expense ]│  │
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│  ┌───────────────────────────┐  │
│  │   CATEGORY CHART          │  │
│  │   Food  Transport  Fun    │  │
│  │   ████  ██         ████   │  │
│  │   $40   $10        $35    │  │
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│  ┌───────────────────────────┐  │
│  │   TRANSACTION HISTORY     │  │
│  │   [Most recent first]     │  │
│  │   Lunch · $12.50 · Food   │  │
│  │   2025-06-20              │  │
│  │   ─────────────────────── │  │
│  │   Bus fare · $2.00 ·      │  │
│  │   Transport · 2025-06-19  │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### Responsive Behavior

| Viewport   | Layout                                    |
|------------|-------------------------------------------|
| ≥ 600px    | Two-column: form + chart side by side; history full-width below |
| < 600px    | Single-column stack: header → balance → form → chart → history |

CSS custom properties define spacing and font sizes. `min-width: 320px` is the base breakpoint. All interactive elements have `min-height: 44px` and `min-width: 44px` enforced via CSS.

### Notification Banner

Sits at the top of the page (or below the header). Uses a `role="alert"` and `aria-live="polite"` region so screen readers announce the message. Auto-dismisses; can also be manually closed with an `×` button.

---

## Validation Logic Design

The `validator` module is a set of pure functions that take values and return structured results. It has no DOM access — `inputForm` is responsible for displaying errors.

### Amount Validation Pipeline

```
raw string input
    │
    ├─ isEmpty? → error: "Amount is required"
    │
    ├─ parseFloat(value) → NaN? → error: "Amount must be a number"
    │
    ├─ value < 0.01 → error: "Amount must be at least 0.01"
    │
    ├─ value > 9999999.99 → error: "Amount must be 9,999,999.99 or less"
    │
    └─ decimalPlaces > 2 → error: "Amount can have at most 2 decimal places"
```

### Item Name Validation Pipeline

```
raw string input
    │
    ├─ trimmed length === 0 → error: "Item name is required"
    │
    └─ trimmed length > 100 → error: "Item name must be 100 characters or fewer"
```

### Error Display

All validation errors are shown simultaneously (not one at a time). Each form field has a corresponding `<span class="field-error" aria-live="polite">` element below it. `inputForm.showErrors()` sets `textContent` on each span. Spans are hidden (empty/`hidden` attribute) when there are no errors.

---

## Chart Rendering Approach

The `categoryChart` uses a pure CSS flexbox bar chart — no `<canvas>`, no SVG, no external library.

### Structure

```html
<div class="chart" role="img" aria-label="Spending by category">
  <div class="chart-bars">
    <div class="chart-bar-group">
      <div class="chart-bar" style="--bar-height: 60%"></div>
      <span class="chart-label">Food</span>
      <span class="chart-value">$40.00</span>
    </div>
    <!-- Transport, Fun -->
  </div>
</div>
```

### Height Calculation

```js
function calcBarHeights(transactions) {
  const totals = { Food: 0, Transport: 0, Fun: 0 };
  for (const tx of transactions) totals[tx.category] += tx.amount;

  const max = Math.max(...Object.values(totals));
  const MAX_BAR_HEIGHT_PX = 200; // configurable CSS var

  return Object.fromEntries(
    Object.entries(totals).map(([cat, total]) => [
      cat,
      { total, heightPct: max === 0 ? 0 : (total / max) * 100 }
    ])
  );
}
```

- When `max === 0`, all bars render at 0% height but labels and `$0.00` values remain visible (Req 4.5).
- Bar height is set via a CSS custom property `--bar-height` on each bar element. The CSS rule is `height: calc(var(--bar-height) * 2px)` or similar, so bars scale proportionally to the largest category.
- A CSS transition (`transition: height 0.3s ease`) provides smooth animation on update (well within the 500ms requirement).

### Accessibility

The chart container has `role="img"` with an `aria-label` that summarizes totals (e.g., "Spending by category: Food $40.00, Transport $10.00, Fun $35.00"). This ensures screen readers get the data even though bars are visual-only.

---

## State Management Approach

The application uses a simple observer/subscriber pattern. There is no reactive framework.

```js
// Pseudocode
const store = {
  transactions: [],
  _listeners: [],

  subscribe(fn) { this._listeners.push(fn); },

  _notify() {
    for (const fn of this._listeners) fn(this.transactions);
  },

  addTransaction(tx) {
    this.transactions = [tx, ...this.transactions];
    const saved = storageService.save(this.transactions);
    if (!saved) {
      this.transactions = this.transactions.slice(1); // rollback
      return false;
    }
    this._notify();
    return true;
  },

  deleteTransaction(id) {
    this.transactions = this.transactions.filter(t => t.id !== id);
    storageService.save(this.transactions); // best-effort
    this._notify();
  }
};
```

On startup, all UI renderers subscribe to the store. When the store notifies, each subscriber re-renders its section using the latest transaction array. This keeps UI logic decoupled from data logic.

**No global mutable state outside `store.transactions`** — all computed values (balance, chart totals) are derived on demand from the transaction array each time a subscriber is called.

---

## Error Handling Design

### Error Categories and Responses

| Scenario | Detection | Response |
|---|---|---|
| localStorage unavailable (private mode, quota) | `storageService.isAvailable()` returns false | Show persistent banner; operate session-only |
| localStorage quota exceeded on save | `setItem` throws `DOMException` | Return `false` from `save()`; keep form filled; show banner |
| localStorage data is unparseable JSON | `JSON.parse` throws | Treat as empty; show banner "data could not be loaded" |
| Individual records missing required fields | Per-record validation in `load()` | Skip record; count skipped; show "N records were skipped" banner |
| Individual records with non-numeric Amount | Per-record `isNaN` / `isFinite` check | Skip record; count skipped |
| Form submitted with invalid data | `validator.validateForm()` fails | Show inline errors; do not save |
| `crypto.randomUUID` unavailable (old browser) | Feature-detect; fallback to `Date.now() + Math.random()` | Silently use fallback ID generator |

### Non-Blocking Notifications

Storage-related errors and skip notifications use `notificationBanner.show()`. These are not modal dialogs — the app remains fully usable. The banner auto-dismisses after 5 seconds and has a manual close button.

### Form Save Failure

Per Req 1.3, if `storageService.save()` fails after a valid submit:
- `store.addTransaction()` rolls back the in-memory state
- Returns `false` to `inputForm`
- `inputForm` keeps fields populated with the user's data
- `notificationBanner.show("Could not save. Storage may be full.", "error")`

### Corrupted Record Handling

```js
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
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

The following properties were derived from the acceptance criteria prework analysis. Redundant properties were consolidated: list-growth and list-contains-new-transaction were merged (1.2 + 2.2); balance-sum and balance-update were merged (3.1 + 3.2); chart-totals and chart-load were merged (4.1 + 4.4); amount and itemName validation were kept separate as they cover distinct domains.

---

### Property 1: Valid transaction always appears in the list

*For any* valid transaction (non-empty item name with trimmed length ≤ 100, amount in [0.01, 9999999.99] with at most 2 decimal places, category one of Food/Transport/Fun), after calling `store.addTransaction(tx)`, the transaction list length increases by exactly 1 and the new transaction is present in the list.

**Validates: Requirements 1.2, 2.2**

---

### Property 2: Validator rejects all inputs with any invalid field

*For any* form input where at least one field is invalid — item name is empty or exceeds 100 trimmed characters, amount is out of range [0.01, 9999999.99] or has more than 2 decimal places, or category is not one of Food/Transport/Fun — `validator.validateForm()` returns `valid: false` with a non-null error for each invalid field simultaneously, and the transaction list remains unchanged.

**Validates: Requirements 1.4, 1.5, 1.6**

---

### Property 3: Amount validation boundary is precise

*For any* string input, `validator.validateAmount()` returns `valid: true` if and only if the string parses to a finite number in [0.01, 9999999.99] with at most 2 decimal places. Every value inside these bounds is accepted; every value outside these bounds (including 0, 0.001, 10000000, negative numbers, non-numeric strings) is rejected.

**Validates: Requirements 1.5**

---

### Property 4: Item name validation boundary is precise

*For any* string input, `validator.validateItemName()` returns `valid: true` if and only if the string, after trimming whitespace, has length in [1, 100]. Empty strings, whitespace-only strings, and strings with trimmed length > 100 are all rejected.

**Validates: Requirements 1.6**

---

### Property 5: Balance always equals the sum of all transaction amounts

*For any* transaction list containing zero or more valid transactions, the computed balance equals the arithmetic sum of all `tx.amount` values, formatted to exactly 2 decimal places. An empty list produces "0.00". Adding a transaction with amount A increases the balance by exactly A.

**Validates: Requirements 3.1, 3.2, 3.4**

---

### Property 6: Serialization round-trip preserves all valid transactions

*For any* array of valid Transaction objects, serializing with `JSON.stringify` and then deserializing with `JSON.parse` followed by per-record validation produces an array that is deeply equal to the original — same length, same field values for every record in the same order.

**Validates: Requirements 5.1, 2.4, 3.3**

---

### Property 7: Corrupted records are skipped; valid records are fully preserved

*For any* mixed JSON array containing both valid and invalid Transaction records, `storageService.load()` restores exactly the valid records and skips all invalid ones. The count of restored transactions equals the count of records that pass `isValidTransaction()`, regardless of how many invalid records are interspersed.

**Validates: Requirements 5.2, 2.5**

---

### Property 8: Category chart totals are consistent with the transaction list

*For any* transaction list, the category totals computed by `categoryChart` satisfy: (a) each category's bar value equals the sum of `tx.amount` for all transactions in that category, (b) the sum of all three category totals equals the overall balance, and (c) all three category bars are always rendered regardless of whether their total is zero.

**Validates: Requirements 4.1, 4.5**

---

### Property 9: History list is always sorted descending by timestamp

*For any* array of transactions with arbitrary insertion order and arbitrary timestamp values, the transaction history rendered by `historyList.render()` always displays entries in descending order of `tx.timestamp` (most recent first). No valid permutation of the input produces an incorrectly ordered output.

**Validates: Requirements 2.1**

---

### Property 10: Form reset state is conditionally tied to save success

*For any* valid form input, after calling `store.addTransaction(tx)`: if `storageService.save()` succeeds, the Input_Form fields are cleared to their default empty state; if `storageService.save()` fails, all previously entered field values remain intact in the form.

**Validates: Requirements 1.3**

---

## Error Handling

(See Error Handling Design section above for full details.)

Summary of error handling principles:
- **Never crash** — all error paths return graceful degraded states
- **Non-blocking notifications** — storage errors never block the UI
- **Form-preserving failures** — a save failure never destroys user input
- **Partial restore** — corrupted records are skipped, not fatal
- **Session-only fallback** — no localStorage → app still works for the current session

---

## Testing Strategy

### Dual Approach: Unit + Property-Based Tests

The testing strategy combines focused unit tests for concrete scenarios with property-based tests for universal correctness guarantees.

**Unit tests** cover:
- Specific examples of valid and invalid inputs
- Edge cases: amount = 0.01, amount = 9999999.99, amount = 0.001, itemName exactly 100 chars
- Integration between `store`, `storageService`, and `validator`
- DOM rendering output for specific transaction sets

**Property-based tests** cover the 10 correctness properties defined above. Each property test runs a minimum of 100 randomly generated inputs to discover edge cases not covered by examples.

### Recommended PBT Library

**fast-check** (npm package, also available via CDN/ESM for browser use) is the recommended property-based testing library for JavaScript. It supports:
- Arbitrary generators for strings, numbers, arrays, objects
- Shrinking (automatically minimizes failing inputs to the simplest counterexample)
- 100+ iterations per run by default

### Property Test Configuration

Each property-based test MUST:
- Run minimum 100 iterations (`numRuns: 100`)
- Reference the design property it validates in a comment
- Use the tag format: `Feature: expense-budget-visualizer, Property N: <property_text>`

```js
// Feature: expense-budget-visualizer, Property 6: Serialization round-trip preserves all valid transactions
it('serialization round-trip', () => {
  fc.assert(
    fc.property(fc.array(arbitraryTransaction()), (transactions) => {
      const serialized = JSON.stringify(transactions);
      const loaded = JSON.parse(serialized).filter(isValidTransaction);
      expect(loaded).toEqual(transactions);
    }),
    { numRuns: 100 }
  );
});

// Feature: expense-budget-visualizer, Property 3: Amount validation boundary is precise
it('amount validation boundary', () => {
  fc.assert(
    fc.property(fc.float({ min: 0.01, max: 9999999.99 }), (amount) => {
      const str = amount.toFixed(2);
      expect(validator.validateAmount(str).valid).toBe(true);
    }),
    { numRuns: 100 }
  );
});
```

### Property-to-Test Mapping

| Property | Test File | PBT Generator Sketch |
|---|---|---|
| 1 (valid tx in list) | `store.property.js` | `arbitraryTransaction()` |
| 2 (invalid rejected, all errors shown) | `validator.property.js` | `arbitraryInvalidFormInput()` |
| 3 (amount boundary) | `validator.property.js` | `fc.float()` + `fc.string()` |
| 4 (itemName boundary) | `validator.property.js` | `fc.string({ maxLength: 200 })` |
| 5 (balance = sum) | `store.property.js` | `fc.array(arbitraryTransaction())` |
| 6 (serialization round-trip) | `storage.property.js` | `fc.array(arbitraryTransaction())` |
| 7 (corrupted skipped) | `storage.property.js` | `fc.array(arbitraryMaybeInvalidRecord())` |
| 8 (chart totals consistent) | `chart.property.js` | `fc.array(arbitraryTransaction())` |
| 9 (history sorted descending) | `store.property.js` | `fc.array(arbitraryTransaction())` |
| 10 (form reset ↔ save success) | `store.property.js` | `arbitraryTransaction()` + mock |

### Test File Structure

```
tests/
├── unit/
│   ├── validator.test.js       # Unit tests: specific examples, edge cases (0.01, 9999999.99, empty string, etc.)
│   ├── storageService.test.js  # Unit tests with mocked localStorage (unavailable, quota exceeded)
│   ├── store.test.js           # Unit tests: rollback on save failure, empty state
│   └── chart.test.js           # Unit tests: bar height calculations, all-zero case
└── property/
    ├── validator.property.js   # Properties 2, 3, 4
    ├── store.property.js       # Properties 1, 5, 9, 10
    ├── storage.property.js     # Properties 6, 7
    └── chart.property.js       # Property 8
```

### Non-PBT Test Strategies

The following concerns are NOT suited to property-based testing and use alternative strategies:

| Concern | Strategy |
|---|---|
| Responsive layout (320px–1920px) | Manual browser testing + visual snapshot tests |
| Touch target sizes (44×44px) | CSS audit + automated accessibility check (axe-core) |
| Cross-browser compatibility | Manual testing in Chrome, Firefox, Edge, Safari |
| Notification auto-dismiss timing | Example-based unit test with fake timers |
| Chart CSS rendering | Visual snapshot test |
