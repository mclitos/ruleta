import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { MAX_WINNERS, WINNERS_KEY, createWinnerId, prependWinner, sanitizeWinners } from './history.js';
import { MAX_NAME_LENGTH } from './utils.js';

describe('history key', () => {
  test('uses its own versioned key, separate from the settings key', () => {
    assert.equal(WINNERS_KEY, 'ruleta-rifas:winners:v1');
  });
});

describe('sanitizeWinners', () => {
  test('returns an empty list for anything that is not an array', () => {
    for (const input of [undefined, null, 'x', 42, {}]) {
      assert.deepEqual(sanitizeWinners(input), []);
    }
  });

  test('drops entries without a usable name or timestamp', () => {
    const result = sanitizeWinners([
      { id: 'a', name: '   ', at: 1 },
      { id: 'b', name: 42, at: 1 },
      { id: 'c', name: 'Caro' },
      { id: 'd', name: 'Dani', at: 0 },
      { id: 'e', name: 'Eva', at: -3 },
      { id: 'f', name: 'Fede', at: 'ayer' },
      'nope',
      null,
    ]);
    assert.deepEqual(result, []);
  });

  test('collapses spaces and caps the name length', () => {
    const [winner] = sanitizeWinners([{ id: 'a', name: '  Martina   Herrera  ', at: 10 }]);
    assert.equal(winner.name, 'Martina Herrera');

    const [long] = sanitizeWinners([{ id: 'b', name: 'x'.repeat(MAX_NAME_LENGTH + 20), at: 10 }]);
    assert.equal(long.name.length, MAX_NAME_LENGTH);
  });

  test('generates an id when the entry has none', () => {
    const [winner] = sanitizeWinners([{ name: 'Ana', at: 1793135451539 }]);
    assert.equal(typeof winner.id, 'string');
    assert.ok(winner.id.length > 0);
  });

  test('keeps a usable id untouched', () => {
    assert.equal(sanitizeWinners([{ id: 'w-7', name: 'Ana', at: 10 }])[0].id, 'w-7');
  });

  test('de-duplicates repeated ids so React keys stay unique', () => {
    const result = sanitizeWinners([
      { id: 'a', name: 'Uno', at: 1 },
      { id: 'a', name: 'Dos', at: 2 },
      { id: 'a-0', name: 'Tres', at: 3 },
      { id: 'a', name: 'Cuatro', at: 4 },
    ]);
    const ids = result.map((winner) => winner.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.deepEqual(result.map((winner) => winner.name), ['Uno', 'Dos', 'Tres', 'Cuatro']);
  });

  test('keeps the newest MAX_WINNERS entries in their stored order', () => {
    const many = Array.from({ length: MAX_WINNERS + 120 }, (_, i) => ({
      id: `w${i}`,
      name: `Persona ${i}`,
      at: 1_700_000_000_000 + i,
    }));
    const result = sanitizeWinners(many);
    assert.equal(result.length, MAX_WINNERS);
    assert.equal(result[0].name, 'Persona 0');
    assert.equal(result[MAX_WINNERS - 1].name, `Persona ${MAX_WINNERS - 1}`);
  });

  test('accepts a numeric string as the timestamp', () => {
    assert.equal(sanitizeWinners([{ id: 'a', name: 'Ana', at: '123' }])[0].at, 123);
  });
});

describe('prependWinner', () => {
  test('puts the newest winner first', () => {
    const existing = [{ id: 'a', name: 'Ana', at: 1 }];
    const result = prependWinner(existing, { id: 'b', name: 'Beto', at: 2 });
    assert.deepEqual(result.map((winner) => winner.name), ['Beto', 'Ana']);
  });

  test('does not mutate the list it receives', () => {
    const existing = [{ id: 'a', name: 'Ana', at: 1 }];
    prependWinner(existing, { id: 'b', name: 'Beto', at: 2 });
    assert.equal(existing.length, 1);
  });

  test('caps the list at MAX_WINNERS, dropping the oldest', () => {
    const existing = Array.from({ length: MAX_WINNERS }, (_, i) => ({
      id: `w${i}`,
      name: `Persona ${i}`,
      at: i,
    }));
    const result = prependWinner(existing, { id: 'new', name: 'Nueva', at: 99 });
    assert.equal(result.length, MAX_WINNERS);
    assert.equal(result[0].name, 'Nueva');
    assert.equal(result[result.length - 1].name, `Persona ${MAX_WINNERS - 2}`);
  });
});

describe('createWinnerId', () => {
  test('returns a non-empty, distinct id per call', () => {
    const ids = new Set(Array.from({ length: 50 }, () => createWinnerId()));
    assert.equal(ids.size, 50);
    for (const id of ids) assert.equal(typeof id, 'string');
  });

  test('falls back to a seed-based id when randomUUID is unavailable', () => {
    const realCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: undefined });
    try {
      const id = createWinnerId(7);
      assert.match(id, /^w-\d+-7$/);
    } finally {
      Object.defineProperty(globalThis, 'crypto', { value: realCrypto, configurable: true });
    }
  });
});
