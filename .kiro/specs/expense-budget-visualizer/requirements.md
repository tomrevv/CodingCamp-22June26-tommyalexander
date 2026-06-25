# Requirements Document

## Introduction

The Expense & Budget Visualizer is a mobile-friendly, client-side web application that helps users track their daily spending. It allows users to record transactions with a name, amount, and category, view a running total balance, browse a history of all transactions, and see a visual chart of spending broken down by category. The application runs entirely in the browser with no backend server, persisting all data using the browser's Local Storage API. It is built with plain HTML, CSS, and vanilla JavaScript, and is structured to work as a standalone web page or a browser extension.

## Glossary

- **App**: The Expense & Budget Visualizer web application.
- **Transaction**: A single spending record consisting of an Item Name, an Amount, and a Category.
- **Item_Name**: A text label that describes what money was spent on (max 100 characters).
- **Amount**: A positive numeric value between 0.01 and 9,999,999.99 (max 2 decimal places) representing how much was spent.
- **Category**: A predefined spending group. Valid values are: `Food`, `Transport`, and `Fun`.
- **Transaction_List**: The ordered collection of all Transactions recorded by the user, stored in Local Storage.
- **Balance_Display**: The UI element that shows the user's total computed balance formatted to 2 decimal places.
- **Category_Chart**: A visual bar chart that displays spending totals broken down by Category.
- **Input_Form**: The UI form containing the Item Name field, Amount field, Category selector, and Submit button.
- **Local_Storage**: The browser's Web Storage API used to persist Transaction data client-side.
- **Validator**: The client-side logic responsible for checking that all Input_Form fields are filled and valid before a Transaction is saved.

---

## Requirements

### Requirement 1: Transaction Input Form

**User Story:** As a user, I want to fill out a simple form to record a new expense, so that I can log my daily spending quickly.

#### Acceptance Criteria

1. THE App SHALL render the Input_Form containing an Item_Name text field (max 100 characters), an Amount numeric field, a Category selector with options `Food`, `Transport`, and `Fun`, and a Submit button.
2. WHEN the user submits the Input_Form with all fields filled and valid, THE App SHALL add the Transaction to the Transaction_List and persist it to Local_Storage.
3. WHEN the user submits the Input_Form with all fields filled and valid, THE App SHALL reset the Input_Form to its default empty state (Item_Name cleared, Amount cleared, Category reset to `Food`) only after the Transaction has been successfully saved to Local_Storage; IF the save fails, THEN THE App SHALL keep the Input_Form filled with the previously entered values.
4. IF the user submits the Input_Form with one or more fields empty or invalid, THEN THE Validator SHALL display all inline error messages simultaneously — one per invalid field identifying what is wrong — and SHALL NOT save the Transaction.
5. THE Validator SHALL reject any Amount value that is not a number between 0.01 and 9,999,999.99 with at most 2 decimal places.
6. THE Validator SHALL reject any Item_Name that is empty or exceeds 100 characters.

---

### Requirement 2: Transaction History List

**User Story:** As a user, I want to see a list of all my recorded transactions, so that I can review my past spending.

#### Acceptance Criteria

1. THE App SHALL display the Transaction_List as a list of entries sorted in descending order by recorded date (most recent first), each entry showing the Item_Name, Amount formatted to 2 decimal places, Category, and the date the Transaction was recorded.
2. WHEN a new Transaction is successfully persisted to Local_Storage, THE App SHALL update the Transaction_List display within 1 second without requiring a page reload.
3. WHILE the Transaction_List is empty, THE App SHALL display a message indicating that no transactions have been recorded yet.
4. WHEN the App is loaded, THE App SHALL restore and display all Transactions previously saved in Local_Storage.
5. IF Local_Storage is unavailable or contains unparseable data on App load, THEN THE App SHALL display the Transaction_List as empty and show a message informing the user that saved data could not be loaded.

---

### Requirement 3: Total Balance Display

**User Story:** As a user, I want to see my total amount spent at a glance, so that I know how much I have recorded overall.

#### Acceptance Criteria

1. THE Balance_Display SHALL show the sum of all Transaction Amounts currently in the Transaction_List, formatted to 2 decimal places.
2. WHEN a new Transaction is added, THE Balance_Display SHALL update to reflect the new total within 1 second without requiring a page reload.
3. WHEN the App is loaded, THE Balance_Display SHALL compute and display the total from all Transactions restored from Local_Storage.
4. WHILE the Transaction_List is empty, THE Balance_Display SHALL display a total of 0.00.

---

### Requirement 4: Spending by Category Chart

**User Story:** As a user, I want to see a visual breakdown of my spending by category, so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Category_Chart SHALL display the total Amount spent for each Category (`Food`, `Transport`, `Fun`) as a bar chart rendered using only HTML, CSS, and vanilla JavaScript — no third-party charting libraries.
2. WHEN a new Transaction is added, THE Category_Chart SHALL update to reflect the new category totals within 500ms without requiring a page reload.
3. WHEN a Transaction is deleted or edited, THE Category_Chart SHALL update to reflect the revised category totals within 500ms without requiring a page reload.
4. WHEN the App is loaded, THE Category_Chart SHALL render based on all Transactions restored from Local_Storage.
5. THE Category_Chart SHALL always display all three Categories (`Food`, `Transport`, `Fun`); any Category with a total Amount of zero SHALL be represented by a zero-height bar with its label still visible.

---

### Requirement 5: Data Persistence

**User Story:** As a user, I want my transactions to be saved between sessions, so that I do not lose my spending history when I close or refresh the browser.

#### Acceptance Criteria

1. WHEN a Transaction is added, edited, or deleted, THE App SHALL serialize the updated Transaction_List and write it to Local_Storage, completing the write within 100ms before the operation returns to the UI.
2. WHEN the App is loaded, THE App SHALL read all persisted data from Local_Storage; IF some persisted Transaction records are corrupted or invalid (missing required fields or containing a non-numeric Amount), THEN THE App SHALL restore only the valid records, derive the Balance_Display and Category_Chart from those valid records, and display a non-blocking notification informing the user that some records were skipped.
3. IF Local_Storage is unavailable, returns a parse error, or all persisted data fails validation on load, THEN THE App SHALL initialize with an empty Transaction_List and display a message informing the user that saved data could not be loaded and that the app is starting with no history.

---

### Requirement 6: Responsive and Mobile-Friendly Layout

**User Story:** As a user on a mobile device, I want the app to display correctly on a small screen, so that I can track my expenses on the go.

#### Acceptance Criteria

1. THE App SHALL use a responsive layout that renders without horizontal overflow, content clipping, or text truncation on viewport widths from 320px to 1920px.
2. WHEN rendered on a viewport width below 600px, THE App SHALL stack all major UI sections (navigation, forms, transaction list, and summary panels) vertically to prevent horizontal overflow.
3. THE App SHALL use legible font sizes with a minimum body text size of 14px and a minimum interactive element (buttons, inputs, selectors) text size of 14px on all viewport sizes.
4. THE App SHALL provide touch targets (buttons, links, and interactive controls) with a minimum tap area of 44×44 CSS pixels on all viewport sizes.

---

### Requirement 7: Browser Compatibility

**User Story:** As a user, I want the app to work in any modern browser, so that I can use it regardless of which browser I prefer.

#### Acceptance Criteria

1. THE App SHALL function correctly — meaning all features are operational, no JavaScript errors are thrown, and no layout is broken — in the latest stable version of Chrome, Firefox, Edge, and Safari at the time of testing.
2. THE App SHALL use only standard Web APIs (including the Local_Storage API) available natively in modern browsers without polyfills, transpilers, or build tools in the shipped source.
3. IF Local_Storage is unavailable in the current browser context (e.g., private browsing mode with storage disabled), THEN THE App SHALL display a message informing the user that data persistence is not available and operate in a session-only mode without crashing.
