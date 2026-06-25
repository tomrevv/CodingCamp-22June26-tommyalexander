/**
 * @file notificationBanner.js
 * Non-blocking notification banner for the Expense & Budget Visualizer.
 *
 * Uses the existing HTML markup:
 *   #notification-banner   — the banner container (role="alert", aria-live="polite")
 *   #notification-message  — text content span
 *   #notification-close    — close (×) button
 *
 * Requirements: 5.2, 5.3, 7.3
 *
 * @module notificationBanner
 */

/** Auto-dismiss delay in milliseconds. */
const AUTO_DISMISS_MS = 5000;

/** All type modifier classes — used to clear previous type before adding new one. */
const TYPE_CLASSES = [
  'notification-banner--info',
  'notification-banner--warning',
  'notification-banner--error',
];

const HIDDEN_CLASS = 'notification-banner--hidden';

// DOM references — resolved lazily so the module is safe to import before
// DOMContentLoaded, but the functions must be called after the DOM is ready.
function getBannerEl() {
  return document.getElementById('notification-banner');
}

function getMessageEl() {
  return document.getElementById('notification-message');
}

function getCloseBtn() {
  return document.getElementById('notification-close');
}

/** @type {ReturnType<typeof setTimeout> | null} */
let _dismissTimer = null;

/**
 * Displays the notification banner with the given message and type.
 *
 * - Sets message text content.
 * - Removes any existing type modifier class, then adds the correct one.
 * - Removes the hidden class so the banner becomes visible.
 * - Clears any pending auto-dismiss timer, then starts a new 5-second timer.
 *
 * @param {string} message - The text to display in the banner.
 * @param {'info' | 'warning' | 'error'} type - Visual style / severity level.
 */
function show(message, type) {
  const banner = getBannerEl();
  const messageEl = getMessageEl();

  if (!banner || !messageEl) return;

  // Clear any pending auto-dismiss before starting a fresh timer.
  if (_dismissTimer !== null) {
    clearTimeout(_dismissTimer);
    _dismissTimer = null;
  }

  // Set message text.
  messageEl.textContent = message;

  // Swap type class: remove all type classes, then add the correct one.
  TYPE_CLASSES.forEach((cls) => banner.classList.remove(cls));
  banner.classList.add(`notification-banner--${type}`);

  // Make the banner visible.
  banner.classList.remove(HIDDEN_CLASS);

  // Start 5-second auto-dismiss timer.
  _dismissTimer = setTimeout(hide, AUTO_DISMISS_MS);
}

/**
 * Hides the notification banner.
 *
 * - Clears any pending auto-dismiss timer.
 * - Adds the hidden class.
 * - Removes all type modifier classes.
 * - Clears the message text.
 */
function hide() {
  const banner = getBannerEl();
  const messageEl = getMessageEl();

  if (!banner) return;

  // Clear any pending timer.
  if (_dismissTimer !== null) {
    clearTimeout(_dismissTimer);
    _dismissTimer = null;
  }

  // Hide the banner.
  banner.classList.add(HIDDEN_CLASS);

  // Remove type classes.
  TYPE_CLASSES.forEach((cls) => banner.classList.remove(cls));

  // Clear message.
  if (messageEl) {
    messageEl.textContent = '';
  }
}

/**
 * Binds the close button click handler.
 * Called once when the module initialises (after DOM is ready).
 * Safe to call multiple times — uses a single event listener flag.
 */
let _closeListenerAttached = false;

function _attachCloseListener() {
  if (_closeListenerAttached) return;
  const closeBtn = getCloseBtn();
  if (closeBtn) {
    closeBtn.addEventListener('click', hide);
    _closeListenerAttached = true;
  }
}

// Attach the close-button listener as soon as the DOM is ready.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _attachCloseListener);
} else {
  _attachCloseListener();
}

/**
 * @type {{ show: typeof show, hide: typeof hide }}
 */
export const notificationBanner = { show, hide };
