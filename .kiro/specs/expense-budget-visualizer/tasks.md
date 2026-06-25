# Implementation Plan: Expense & Budget Visualizer

## Overview

Implement a purely client-side single-page application using plain HTML, CSS, and vanilla JavaScript. The app tracks spending transactions, shows a running balance, renders a bar chart by category, and persists data via `localStorage`. The implementation follows the component architecture defined in the design document, building incrementally from the data/storage layer up through UI rendering and wiring everything together at the end.

## Tasks

- [x] 1. Set up project structure and core data model
  - Create `index.html` with semantic markup shell (header, balance section, form section, chart section, history section, notification banner region)
  - Create `styles.css` with CSS custom properties, base reset, and responsive breakpoints (≥600px two-column, <600px single-column stack)
  - Create `app.js` as an ES Module entry point (`<script type="module">`)
  - Define the `Transaction` object shape and the `isValidTransaction(record)` guard function
  - _Requirements: 1.1, 6.1, 6.2, 7.2_

- [x] 2. Implement `storageService`
  - [x] 2.1 Implement `storageService.isAvailable()`, `storageService.save()`, and `storageService.load()`
    - `isAvailable()` performs test write/read/delete to detect private-mode or quota restrictions
    - `save()` wraps `JSON.stringify` + `setItem`; catches `DOMException`; returns `boolean`
    - `load()` wraps `getItem` + `JSON.parse`; validates each record individually with `isValidTransaction()`; returns `{ transactions, skippedCount }`
    - Use storage key `"expense_budget_transactions"`
    - _Requirements: 5.1, 5.2, 5.3, 2.4, 2.5, 7.3_


- [x] 3. Implement `validator`
  - [x] 3.1 Implement `validator.validateItemName()`, `validator.validateAmount()`, `validator.validateCategory()`, and `validator.validateForm()`
    - `validateItemName`: trimmed length ≥ 1 and ≤ 100
    - `validateAmount`: parses to finite decimal in [0.01, 9999999.99] with at most 2 decimal places
    - `validateCategory`: must be exactly `"Food"`, `"Transport"`, or `"Fun"`
    - `validateForm`: runs all three validators and returns `{ valid, errors }` with all errors simultaneously
    - _Requirements: 1.4, 1.5, 1.6_


- [x] 4. Checkpoint — Ensure all tests pass
  - Run all unit and property tests for `storageService` and `validator`. Ask the user if any questions arise.

- [x] 5. Implement `store`
  - [x] 5.1 Implement `store` with `transactions`, `subscribe()`, `notify()`, `load()`, `addTransaction()`, and `deleteTransaction()`
    - `load()` calls `storageService.load()`, populates `transactions`, handles `skippedCount > 0` banner
    - `addTransaction(tx)` prepends transaction, calls `storageService.save()`; on failure rolls back and returns `false`
    - `deleteTransaction(id)` filters by `id`, calls `storageService.save()` best-effort, notifies
    - Generate `id` using `crypto.randomUUID()` with `Date.now() + Math.random()` fallback
    - _Requirements: 1.2, 1.3, 2.2, 5.1, 5.2, 5.3_


- [x] 6. Implement `notificationBanner`
  - [x] 6.1 Implement `notificationBanner.show()` and `notificationBanner.hide()`
    - Use `role="alert"` and `aria-live="polite"` on the banner element
    - Auto-dismiss after 5 seconds; provide manual close `×` button
    - Support `type`: `'info'`, `'warning'`, `'error'`
    - _Requirements: 5.2, 5.3, 7.3_

- [ ] 7. Implement UI rendering components
  - [x] 7.1 Implement `balanceDisplay.render(transactions)`
    - Sum all `tx.amount` values and format to exactly 2 decimal places
    - Display `0.00` when array is empty
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 7.2 Implement `historyList.render(transactions)`
    - Sort descending by `tx.timestamp` before rendering
    - Each entry shows `itemName`, amount formatted to 2 decimal places, category badge, and date string
    - Render empty-state message when `transactions.length === 0`
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 7.3 Implement `categoryChart.render(transactions)`
    - Compute per-category totals and max; set `--bar-height` CSS custom property on each bar element
    - Always render all three category bars (`Food`, `Transport`, `Fun`); zero-total categories render at 0% height but keep label and `$0.00` value visible
    - Add CSS `transition: height 0.3s ease` for smooth updates (satisfies ≤500ms requirement)
    - Add `role="img"` and `aria-label` summarizing totals for screen readers
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_


- [x] 8. Implement `inputForm`
  - [x] 8.1 Implement `inputForm.init()`, `inputForm.reset()`, `inputForm.showErrors()`, and `inputForm.clearErrors()`
    - Bind submit listener; on submit: read fields → `validator.validateForm()` → if invalid call `showErrors()`, return; if valid call `store.addTransaction(tx)`
    - On save success reset form (`itemName` cleared, `amount` cleared, `category` reset to `Food`)
    - On save failure (`addTransaction` returns `false`) keep form filled and call `notificationBanner.show()`
    - Each form field has a `<span class="field-error" aria-live="polite">` element for inline errors
    - Show all validation errors simultaneously
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [ ] 9. Checkpoint — Ensure all tests pass
  - Run the full test suite (unit + property tests). Ask the user if any questions arise.

- [x] 10. Apply responsive layout and accessibility CSS
  - [x] 10.1 Complete `styles.css` with responsive rules and accessibility requirements
    - Two-column layout for viewport ≥600px (form + chart side by side; history full-width below)
    - Single-column vertical stack for viewport <600px
    - Minimum body text size 14px; minimum interactive element text size 14px
    - All buttons, inputs, and selectors: `min-height: 44px; min-width: 44px`
    - No horizontal overflow or content clipping from 320px to 1920px
    - _Requirements: 6.1, 6.2, 6.3, 6.4_


- [x] 11. Wire all components together in `app.js`
  - [x] 11.1 Wire startup sequence and event subscriptions
    - Call `storageService.init()` (check availability; show persistent banner if unavailable, operate session-only per Req 7.3)
    - Call `store.load()` (restores transactions from `localStorage`; shows banner if `skippedCount > 0`)
    - Subscribe `balanceDisplay.render`, `historyList.render`, and `categoryChart.render` to `store`
    - Call `inputForm.init()` to bind the form submit handler
    - Call initial `store.notify()` to paint all sections from restored state
    - _Requirements: 2.4, 3.3, 4.4, 5.2, 5.3, 7.1, 7.3_


- [~] 12. Final checkpoint — Ensure all tests pass
  - Run the complete test suite one final time. Confirm all requirements are covered. Ask the user if any questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints at tasks 4, 9, and 12 ensure incremental validation throughout development
- Property tests use `fast-check` (available via ESM CDN or npm) with `numRuns: 100` minimum
- Unit tests and property tests are complementary — both are expected to run in the same test harness
- All components are pure vanilla JS ES Modules — no bundler or transpiler required
- The `index.html` file uses `<script type="module" src="app.js">` as the entry point

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "3.1"] },
    { "id": 1, "tasks": ["2.2", "2.3", "2.4", "3.2", "3.3", "3.4", "3.5"] },
    { "id": 2, "tasks": ["5.1", "6.1"] },
    { "id": 3, "tasks": ["5.2", "5.3", "5.4", "5.5", "5.6", "6.2", "7.1", "7.2", "7.3"] },
    { "id": 4, "tasks": ["7.4", "7.5", "8.1"] },
    { "id": 5, "tasks": ["8.2", "10.1"] },
    { "id": 6, "tasks": ["10.2", "11.1"] },
    { "id": 7, "tasks": ["11.2"] }
  ]
}
```
