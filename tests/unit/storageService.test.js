/**
 * @file tests/unit/storageService.test.js
 * Unit tests for storageService — mocks localStorage to cover availability
 * detection, save/load success paths, quota errors, malformed JSON, and
 * per-record validation during load.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { storageService } from '../../storageService.js';

// ---------------------------------------------------------------------------
// Minimal localStorage mock
// ---------------------------------------------------------------------------

/**
 * Returns a fresh in-memory localStorage mock with optional overrides so
 * individual tests can simulate errors (quota exceeded, security errors, etc.).
 */
function makeLocalStorageMock(overrides = {}) {
  const store = new Map();
  return {
    setItem: vi.fn((key, value) => { store.set(key, value); }),
    getItem: vi.fn((key) => store.has(key) ? store.get(key) : null),
    removeItem: vi.fn((key) => { store.delete(key); }),
    clear: vi.fn(() => { store.clear(); }),
    _store: store,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a valid Transaction object. */
function makeTransaction(overrides = {}) {
  return {
    id: '1718000000001',
    itemName: 'Lunch',
    amount: 12.50,
    category: 'Food',
    timestamp: 1718000000001,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// isAvailable()
// ---------------------------------------------------------------------------

describe('storageService.isAvailable()', () => {
  it('returns true when localStorage works normally', () => {
    const mock = makeLocalStorageMock();
    vi.stubGlobal('localStorage', mock);

    expect(storageService.isAvailable()).toBe(true);
  });

  it('performs write → read → delete (probe sequence)', () => {
    const mock = makeLocalStorageMock();
    vi.stubGlobal('localStorage', mock);

    storageService.isAvailable();

    expect(mock.setItem).toHaveBeenCalled();
    expect(mock.getItem).toHaveBeenCalled();
    expect(mock.removeItem).toHaveBeenCalled();
  });

  it('returns false when setItem throws (private-mode simulation)', () => {
    const mock = makeLocalStorageMock({
      setItem: vi.fn(() => { throw new DOMException('QuotaExceeded', 'QuotaExceededError'); }),
    });
    vi.stubGlobal('localStorage', mock);

    expect(storageService.isAvailable()).toBe(false);
  });

  it('returns false when getItem throws (security error simulation)', () => {
    const mock = makeLocalStorageMock({
      getItem: vi.fn(() => { throw new DOMException('SecurityError', 'SecurityError'); }),
    });
    vi.stubGlobal('localStorage', mock);

    expect(storageService.isAvailable()).toBe(false);
  });

  it('returns false when removeItem throws', () => {
    const mock = makeLocalStorageMock({
      removeItem: vi.fn(() => { throw new DOMException('SecurityError', 'SecurityError'); }),
    });
    vi.stubGlobal('localStorage', mock);

    expect(storageService.isAvailable()).toBe(false);
  });

  it('returns false when read-back value does not match written value', () => {
    const mock = makeLocalStorageMock({
      // getItem always returns something different
      getItem: vi.fn(() => '__wrong_value__'),
    });
    vi.stubGlobal('localStorage', mock);

    expect(storageService.isAvailable()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// save()
// ---------------------------------------------------------------------------

describe('storageService.save()', () => {
  it('returns true on a successful write', () => {
    const mock = makeLocalStorageMock();
    vi.stubGlobal('localStorage', mock);

    const tx = makeTransaction();
    const result = storageService.save([tx]);

    expect(result).toBe(true);
  });

  it('writes to the key "expense_budget_transactions"', () => {
    const mock = makeLocalStorageMock();
    vi.stubGlobal('localStorage', mock);

    storageService.save([makeTransaction()]);

    expect(mock.setItem).toHaveBeenCalledWith(
      'expense_budget_transactions',
      expect.any(String)
    );
  });

  it('serializes transactions as a JSON string', () => {
    const mock = makeLocalStorageMock();
    vi.stubGlobal('localStorage', mock);

    const tx = makeTransaction();
    storageService.save([tx]);

    const written = mock.setItem.mock.calls[0][1];
    expect(() => JSON.parse(written)).not.toThrow();
    expect(JSON.parse(written)).toEqual([tx]);
  });

  it('accepts an empty array', () => {
    const mock = makeLocalStorageMock();
    vi.stubGlobal('localStorage', mock);

    const result = storageService.save([]);

    expect(result).toBe(true);
    const written = mock.setItem.mock.calls[0][1];
    expect(JSON.parse(written)).toEqual([]);
  });

  it('returns false when setItem throws QuotaExceededError', () => {
    const mock = makeLocalStorageMock({
      setItem: vi.fn(() => {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      }),
    });
    vi.stubGlobal('localStorage', mock);

    const result = storageService.save([makeTransaction()]);

    expect(result).toBe(false);
  });

  it('returns false when setItem throws a generic DOMException', () => {
    const mock = makeLocalStorageMock({
      setItem: vi.fn(() => {
        throw new DOMException('SecurityError', 'SecurityError');
      }),
    });
    vi.stubGlobal('localStorage', mock);

    expect(storageService.save([makeTransaction()])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// load()
// ---------------------------------------------------------------------------

describe('storageService.load()', () => {
  it('returns empty transactions and 0 skipped when key is absent', () => {
    const mock = makeLocalStorageMock(); // nothing stored
    vi.stubGlobal('localStorage', mock);

    const result = storageService.load();

    expect(result.transactions).toEqual([]);
    expect(result.skippedCount).toBe(0);
  });

  it('reads from the key "expense_budget_transactions"', () => {
    const mock = makeLocalStorageMock();
    vi.stubGlobal('localStorage', mock);

    storageService.load();

    expect(mock.getItem).toHaveBeenCalledWith('expense_budget_transactions');
  });

  it('restores a single valid transaction', () => {
    const tx = makeTransaction();
    const mock = makeLocalStorageMock();
    mock._store.set('expense_budget_transactions', JSON.stringify([tx]));
    vi.stubGlobal('localStorage', mock);

    const { transactions, skippedCount } = storageService.load();

    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toEqual(tx);
    expect(skippedCount).toBe(0);
  });

  it('restores multiple valid transactions in original order', () => {
    const txs = [
      makeTransaction({ id: '1', timestamp: 1718000000001 }),
      makeTransaction({ id: '2', timestamp: 1718000000002, itemName: 'Coffee', amount: 3.50, category: 'Fun' }),
    ];
    const mock = makeLocalStorageMock();
    mock._store.set('expense_budget_transactions', JSON.stringify(txs));
    vi.stubGlobal('localStorage', mock);

    const { transactions, skippedCount } = storageService.load();

    expect(transactions).toEqual(txs);
    expect(skippedCount).toBe(0);
  });

  it('skips a record with a missing id and increments skippedCount', () => {
    const valid = makeTransaction({ id: 'valid-1' });
    const invalid = { itemName: 'No ID', amount: 5.00, category: 'Food', timestamp: 1718000000001 };
    const mock = makeLocalStorageMock();
    mock._store.set('expense_budget_transactions', JSON.stringify([valid, invalid]));
    vi.stubGlobal('localStorage', mock);

    const { transactions, skippedCount } = storageService.load();

    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toEqual(valid);
    expect(skippedCount).toBe(1);
  });

  it('skips a record with an invalid amount (non-numeric string) and increments skippedCount', () => {
    const valid = makeTransaction({ id: 'v1' });
    const invalid = { id: 'bad', itemName: 'Bad Amount', amount: 'not-a-number', category: 'Food', timestamp: 1718000000001 };
    const mock = makeLocalStorageMock();
    mock._store.set('expense_budget_transactions', JSON.stringify([valid, invalid]));
    vi.stubGlobal('localStorage', mock);

    const { transactions, skippedCount } = storageService.load();

    expect(transactions).toHaveLength(1);
    expect(skippedCount).toBe(1);
  });

  it('skips a record with an invalid category and increments skippedCount', () => {
    const valid = makeTransaction({ id: 'v1' });
    const invalid = { id: 'bad', itemName: 'Bad Category', amount: 5.00, category: 'Entertainment', timestamp: 1718000000001 };
    const mock = makeLocalStorageMock();
    mock._store.set('expense_budget_transactions', JSON.stringify([valid, invalid]));
    vi.stubGlobal('localStorage', mock);

    const { transactions, skippedCount } = storageService.load();

    expect(transactions).toHaveLength(1);
    expect(skippedCount).toBe(1);
  });

  it('skips a record with itemName being an empty string', () => {
    const valid = makeTransaction({ id: 'v1' });
    const invalid = { id: 'bad', itemName: '', amount: 5.00, category: 'Food', timestamp: 1718000000001 };
    const mock = makeLocalStorageMock();
    mock._store.set('expense_budget_transactions', JSON.stringify([valid, invalid]));
    vi.stubGlobal('localStorage', mock);

    const { transactions, skippedCount } = storageService.load();

    expect(transactions).toHaveLength(1);
    expect(skippedCount).toBe(1);
  });

  it('skips a record with amount below 0.01', () => {
    const valid = makeTransaction({ id: 'v1' });
    const invalid = { id: 'bad', itemName: 'Tiny', amount: 0.001, category: 'Food', timestamp: 1718000000001 };
    const mock = makeLocalStorageMock();
    mock._store.set('expense_budget_transactions', JSON.stringify([valid, invalid]));
    vi.stubGlobal('localStorage', mock);

    const { transactions, skippedCount } = storageService.load();

    expect(transactions).toHaveLength(1);
    expect(skippedCount).toBe(1);
  });

  it('returns all valid and counts all invalid when array is mixed', () => {
    const txs = [
      makeTransaction({ id: 'a' }),
      { id: '', itemName: 'No ID', amount: 1.00, category: 'Food', timestamp: 1 },         // invalid id
      makeTransaction({ id: 'b', itemName: 'Bus', amount: 2.50, category: 'Transport' }),
      { id: 'x', itemName: '   ', amount: 1.00, category: 'Food', timestamp: 1 },           // whitespace-only itemName
      makeTransaction({ id: 'c', itemName: 'Movie', amount: 9.99, category: 'Fun' }),
      null,                                                                                   // null record
    ];
    const mock = makeLocalStorageMock();
    mock._store.set('expense_budget_transactions', JSON.stringify(txs));
    vi.stubGlobal('localStorage', mock);

    const { transactions, skippedCount } = storageService.load();

    expect(transactions).toHaveLength(3);
    expect(skippedCount).toBe(3);
  });

  it('returns empty array and 0 skipped for malformed JSON', () => {
    const mock = makeLocalStorageMock();
    mock._store.set('expense_budget_transactions', 'not valid json {{{');
    vi.stubGlobal('localStorage', mock);

    const { transactions, skippedCount } = storageService.load();

    expect(transactions).toEqual([]);
    expect(skippedCount).toBe(0);
  });

  it('returns empty array when stored value is a JSON object (not an array)', () => {
    const mock = makeLocalStorageMock();
    mock._store.set('expense_budget_transactions', JSON.stringify({ id: 'oops' }));
    vi.stubGlobal('localStorage', mock);

    const { transactions, skippedCount } = storageService.load();

    expect(transactions).toEqual([]);
    expect(skippedCount).toBe(0);
  });

  it('returns empty array when stored value is a JSON string primitive', () => {
    const mock = makeLocalStorageMock();
    mock._store.set('expense_budget_transactions', JSON.stringify('just a string'));
    vi.stubGlobal('localStorage', mock);

    const { transactions, skippedCount } = storageService.load();

    expect(transactions).toEqual([]);
    expect(skippedCount).toBe(0);
  });

  it('returns empty array and storageError flag when getItem throws', () => {
    const mock = makeLocalStorageMock({
      getItem: vi.fn(() => { throw new DOMException('SecurityError', 'SecurityError'); }),
    });
    vi.stubGlobal('localStorage', mock);

    const { transactions, skippedCount } = storageService.load();

    expect(transactions).toEqual([]);
    expect(skippedCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Round-trip: save then load
// ---------------------------------------------------------------------------

describe('storageService round-trip (save → load)', () => {
  it('restores exactly what was saved', () => {
    const mock = makeLocalStorageMock();
    vi.stubGlobal('localStorage', mock);

    const txs = [
      makeTransaction({ id: '1' }),
      makeTransaction({ id: '2', itemName: 'Bus', amount: 2.50, category: 'Transport', timestamp: 1718000000002 }),
      makeTransaction({ id: '3', itemName: 'Movie', amount: 9.99, category: 'Fun', timestamp: 1718000000003 }),
    ];

    storageService.save(txs);
    const { transactions, skippedCount } = storageService.load();

    expect(transactions).toEqual(txs);
    expect(skippedCount).toBe(0);
  });

  it('round-trips an empty array correctly', () => {
    const mock = makeLocalStorageMock();
    vi.stubGlobal('localStorage', mock);

    storageService.save([]);
    const { transactions, skippedCount } = storageService.load();

    expect(transactions).toEqual([]);
    expect(skippedCount).toBe(0);
  });
});
