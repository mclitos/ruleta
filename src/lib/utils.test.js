import assert from 'node:assert/strict';
import test, { afterEach, describe } from 'node:test';
import {
  MAX_NAME_LENGTH,
  clamp,
  formatTime,
  initials,
  inkFor,
  mixHex,
  mod,
  normalizeHex,
  parseParticipants,
  secureRandomIndex,
  shadeHex,
} from './utils.js';

const realCrypto = globalThis.crypto;

afterEach(() => {
  Object.defineProperty(globalThis, 'crypto', { value: realCrypto, configurable: true });
});

/** Replaces `crypto.getRandomValues` with a scripted sequence of uint32 values. */
function stubRandom(values) {
  let index = 0;
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: {
      getRandomValues(buffer) {
        buffer[0] = values[Math.min(index, values.length - 1)];
        index += 1;
        return buffer;
      },
    },
  });
  return () => index;
}

describe('clamp', () => {
  test('keeps values inside the range and pins the edges', () => {
    assert.equal(clamp(5, 0, 10), 5);
    assert.equal(clamp(-3, 0, 10), 0);
    assert.equal(clamp(42, 0, 10), 10);
  });
});

describe('mod', () => {
  test('wraps negatives into the positive range', () => {
    assert.equal(mod(-1, 3), 2);
    assert.equal(mod(7, 3), 1);
    assert.equal(mod(-4, 3), 2);
  });
});

describe('parseParticipants', () => {
  test('splits lines, collapses spaces and drops blanks', () => {
    assert.deepEqual(parseParticipants('Ana\n\n  Bo   b \r\nCaro'), ['Ana', 'Bo b', 'Caro']);
  });

  test('returns an empty list for non-strings', () => {
    assert.deepEqual(parseParticipants(null), []);
    assert.deepEqual(parseParticipants(undefined), []);
    assert.deepEqual(parseParticipants(42), []);
  });

  test('caps each name at MAX_NAME_LENGTH', () => {
    const [name] = parseParticipants('x'.repeat(MAX_NAME_LENGTH + 50));
    assert.equal(name.length, MAX_NAME_LENGTH);
  });

  test('caps the list at 5000 names', () => {
    const text = Array.from({ length: 5100 }, (_, i) => `Persona ${i}`).join('\n');
    assert.equal(parseParticipants(text).length, 5000);
  });
});

describe('initials', () => {
  test('uses the first two words, or two letters of a single word', () => {
    assert.equal(initials('Lucía Benítez'), 'LB');
    assert.equal(initials('Martina'), 'MA');
    assert.equal(initials('  Ana   María  Sol '), 'AM');
  });

  test('falls back to "?" for empty input', () => {
    assert.equal(initials(''), '?');
    assert.equal(initials(null), '?');
  });
});

describe('normalizeHex', () => {
  test('expands 3-digit hex and lowercases 6-digit hex', () => {
    assert.equal(normalizeHex('#ABC'), '#aabbcc');
    assert.equal(normalizeHex('#A1B2C3'), '#a1b2c3');
    assert.equal(normalizeHex('  #fff  '), '#ffffff');
  });

  test('rejects anything that is not a hex colour', () => {
    assert.equal(normalizeHex('abc'), null);
    assert.equal(normalizeHex('#ggg'), null);
    assert.equal(normalizeHex('#12345'), null);
    assert.equal(normalizeHex(42), null);
  });
});

describe('mixHex / shadeHex', () => {
  test('mixes two colours at the requested amount', () => {
    assert.equal(mixHex('#000000', '#ffffff', 0.5), '#808080');
    assert.equal(mixHex('#000000', '#ffffff', 0), '#000000');
    assert.equal(mixHex('#000000', '#ffffff', 1), '#ffffff');
  });

  test('clamps the amount instead of overflowing the channels', () => {
    assert.equal(mixHex('#000000', '#ffffff', 5), '#ffffff');
    assert.equal(mixHex('#000000', '#ffffff', -2), '#000000');
  });

  test('returns the first colour when either side is invalid', () => {
    assert.equal(mixHex('not-a-colour', '#ffffff', 0.5), 'not-a-colour');
  });

  test('shadeHex darkens towards black', () => {
    assert.equal(shadeHex('#ffffff', 0.5), '#808080');
  });
});

describe('inkFor', () => {
  test('picks white ink on dark bars and dark ink on light bars', () => {
    assert.equal(inkFor('#000000'), '#ffffff');
    assert.equal(inkFor('#1b1338'), '#ffffff');
    assert.equal(inkFor('#ffffff'), '#1b1338');
    assert.equal(inkFor('#f5b800'), '#1b1338');
  });

  test('treats an invalid colour as black', () => {
    assert.equal(inkFor('nope'), '#ffffff');
  });
});

describe('secureRandomIndex', () => {
  test('always returns an index inside [0, max)', () => {
    for (const max of [1, 2, 3, 7, 16, 100]) {
      for (let i = 0; i < 200; i += 1) {
        const index = secureRandomIndex(max);
        assert.ok(Number.isInteger(index), `not an integer for max ${max}`);
        assert.ok(index >= 0 && index < max, `out of range for max ${max}: ${index}`);
      }
    }
  });

  test('returns 0 for a non-positive or non-finite max', () => {
    assert.equal(secureRandomIndex(0), 0);
    assert.equal(secureRandomIndex(-5), 0);
    assert.equal(secureRandomIndex(Number.NaN), 0);
    assert.equal(secureRandomIndex(Number.POSITIVE_INFINITY), 0);
  });

  test('rejects out-of-limit samples instead of biasing the result', () => {
    // 2^32 / 3 has a remainder, so 4294967295 is the first rejected value.
    const calls = stubRandom([4294967295, 4294967294]);
    assert.equal(secureRandomIndex(3), 2);
    assert.equal(calls(), 2);
  });

  test('truncates a fractional max so the result stays an index', () => {
    const index = secureRandomIndex(2.5);
    assert.ok(Number.isInteger(index));
    assert.ok(index >= 0 && index < 2);
  });
});

describe('formatTime', () => {
  test('formats a timestamp as a local time', () => {
    assert.match(formatTime(1793135451539), /^\d{1,2}[:.]\d{2}[:.]\d{2}$/);
  });

  test('returns an empty string for an unusable timestamp', () => {
    assert.equal(formatTime(Number.NaN), '');
  });
});
