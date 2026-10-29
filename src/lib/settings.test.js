import assert from 'node:assert/strict';
import test, { afterEach, describe } from 'node:test';
import {
  DEFAULT_PALETTE,
  DEFAULT_SETTINGS,
  MAX_PALETTE_SIZE,
  SPIN_CEILING,
  SPIN_FLOOR,
  STORAGE_KEY,
  hasSameParticipants,
  isAllowedLogoUrl,
  loadStoredSettings,
  randomSpinDuration,
  resolveLogoSrc,
  sanitizePalette,
  sanitizeSettings,
  buildSettingsExport,
  exportSettingsFilename,
  parseSettingsImport,
} from './settings.js';

const realWindow = globalThis.window;

afterEach(() => {
  if (realWindow === undefined) delete globalThis.window;
  else globalThis.window = realWindow;
});

/** Minimal `window.localStorage` that records writes, so read-only code is provable. */
function stubStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  const writes = [];
  globalThis.window = {
    localStorage: {
      getItem: (key) => (data.has(key) ? data.get(key) : null),
      setItem: (key, value) => {
        writes.push(key);
        data.set(key, String(value));
      },
      removeItem: (key) => data.delete(key),
    },
  };
  return { data, writes };
}

describe('sanitizeSettings defaults', () => {
  test('fills every field for garbage input', () => {
    for (const input of [undefined, null, 42, 'text', []]) {
      const settings = sanitizeSettings(input);
      assert.equal(settings.version, 1);
      assert.equal(settings.theme, 'dark');
      assert.equal(settings.spinMin, 3);
      assert.equal(settings.spinMax, 5);
      assert.equal(settings.volume, 0.7);
      assert.equal(settings.title, DEFAULT_SETTINGS.title);
      assert.deepEqual(settings.palette, DEFAULT_PALETTE);
      assert.equal(settings.participants.length, DEFAULT_SETTINGS.participants.length);
    }
  });
});

describe('spin duration range', () => {
  test('clamps both ends to the slider limits', () => {
    assert.equal(sanitizeSettings({ spinMin: -5, spinMax: 99 }).spinMin, SPIN_FLOOR);
    assert.equal(sanitizeSettings({ spinMin: -5, spinMax: 99 }).spinMax, SPIN_CEILING);
  });

  test('snaps to the 0.5 s step', () => {
    assert.equal(sanitizeSettings({ spinMin: 3.26, spinMax: 6 }).spinMin, 3.5);
    assert.equal(sanitizeSettings({ spinMin: 3.2, spinMax: 6 }).spinMin, 3);
    assert.equal(sanitizeSettings({ spinMin: 2, spinMax: 5.74 }).spinMax, 5.5);
  });

  test('forces max >= min when storage has them crossed', () => {
    const settings = sanitizeSettings({ spinMin: 8, spinMax: 2 });
    assert.equal(settings.spinMin, 8);
    assert.equal(settings.spinMax, 8);
  });

  test('parses numeric strings and ignores unusable ones', () => {
    assert.equal(sanitizeSettings({ spinMin: '7' }).spinMin, 7);
    assert.equal(sanitizeSettings({ spinMin: 'abc' }).spinMin, DEFAULT_SETTINGS.spinMin);
    assert.equal(sanitizeSettings({ spinMin: Number.NaN }).spinMin, DEFAULT_SETTINGS.spinMin);
  });

  test('randomSpinDuration stays inside the range, including edge cases', () => {
    for (let i = 0; i < 300; i += 1) {
      const duration = randomSpinDuration(2, 6);
      assert.ok(duration >= 2 && duration <= 6, `out of range: ${duration}`);
    }
    assert.equal(randomSpinDuration(4, 4), 4);
    for (let i = 0; i < 100; i += 1) {
      const swapped = randomSpinDuration(6, 2);
      assert.ok(swapped >= 2 && swapped <= 6, `out of range with swapped args: ${swapped}`);
    }
  });

  test('randomSpinDuration defaults to the 3-5 s window', () => {
    for (let i = 0; i < 100; i += 1) {
      const duration = randomSpinDuration();
      assert.ok(duration >= 3 && duration <= 5, `out of range: ${duration}`);
    }
  });
});

describe('scalar fields', () => {
  test('clamps the volume to 0..1', () => {
    assert.equal(sanitizeSettings({ volume: 5 }).volume, 1);
    assert.equal(sanitizeSettings({ volume: -1 }).volume, 0);
    assert.equal(sanitizeSettings({ volume: 'nope' }).volume, DEFAULT_SETTINGS.volume);
  });

  test('accepts only real booleans for the switches', () => {
    assert.equal(sanitizeSettings({ sounds: false }).sounds, false);
    assert.equal(sanitizeSettings({ sounds: 'false' }).sounds, true);
    assert.equal(sanitizeSettings({ autoRemove: 0 }).autoRemove, DEFAULT_SETTINGS.autoRemove);
  });

  test('accepts only light and dark themes', () => {
    assert.equal(sanitizeSettings({ theme: 'light' }).theme, 'light');
    assert.equal(sanitizeSettings({ theme: 'neon' }).theme, 'dark');
  });

  test('trims and caps the title, falling back when empty', () => {
    assert.equal(sanitizeSettings({ title: '  Mi sorteo  ' }).title, 'Mi sorteo');
    assert.equal(sanitizeSettings({ title: '   ' }).title, DEFAULT_SETTINGS.title);
    assert.equal(sanitizeSettings({ title: 'x'.repeat(200) }).title.length, 80);
  });

  test('keeps an intentionally empty slogan but caps its length', () => {
    assert.equal(sanitizeSettings({ slogan: '   ' }).slogan, '');
    assert.equal(sanitizeSettings({ slogan: 42 }).slogan, DEFAULT_SETTINGS.slogan);
    assert.equal(sanitizeSettings({ slogan: 'y'.repeat(200) }).slogan.length, 140);
  });
});

describe('logo', () => {
  test('allows http(s) and root-relative URLs only', () => {
    assert.equal(isAllowedLogoUrl('https://example.com/a.png'), true);
    assert.equal(isAllowedLogoUrl('/logo.png'), true);
    assert.equal(isAllowedLogoUrl(''), true);
    assert.equal(isAllowedLogoUrl('javascript:alert(1)'), false);
    assert.equal(isAllowedLogoUrl('//evil.test/a.png'), false);
    assert.equal(isAllowedLogoUrl('ftp://example.com/a.png'), false);
  });

  test('drops unsafe URLs instead of storing them', () => {
    assert.equal(sanitizeSettings({ logoUrl: 'javascript:alert(1)' }).logoUrl, '');
    assert.equal(sanitizeSettings({ logoUrl: 'https://example.com/a.png' }).logoUrl, 'https://example.com/a.png');
  });

  test('keeps only inline image data URLs', () => {
    const png = 'data:image/png;base64,AAAA';
    assert.equal(sanitizeSettings({ logoData: png }).logoData, png);
    assert.equal(sanitizeSettings({ logoData: 'data:text/html;base64,AAAA' }).logoData, '');
    assert.equal(sanitizeSettings({ logoData: `data:image/png;base64,${'A'.repeat(700_000)}` }).logoData, '');
  });

  test('resolveLogoSrc prefers the inline image and honours the hidden switch', () => {
    assert.equal(resolveLogoSrc({ logoData: 'data:image/png;base64,AA', logoUrl: '/a.png' }), 'data:image/png;base64,AA');
    assert.equal(resolveLogoSrc({ logoUrl: '/a.png' }), '/a.png');
    assert.equal(resolveLogoSrc({ logoUrl: '/a.png', logoHidden: true }), '');
    assert.equal(resolveLogoSrc(null), '');
  });
});

describe('palette', () => {
  test('normalizes, deduplicates and caps the colours', () => {
    assert.deepEqual(sanitizePalette(['#ABC', '#aabbcc', '#ff0000']), ['#aabbcc', '#ff0000']);
    assert.equal(sanitizePalette(Array.from({ length: 30 }, (_, i) => `#0000${(i + 16).toString(16)}`)).length, MAX_PALETTE_SIZE);
  });

  test('falls back to the default palette when nothing survives', () => {
    assert.deepEqual(sanitizePalette(['nope', 42, null]), DEFAULT_PALETTE);
    assert.deepEqual(sanitizePalette('not-an-array'), DEFAULT_PALETTE);
  });
});

describe('participants', () => {
  test('keeps only strings and collapses their spaces', () => {
    assert.deepEqual(
      sanitizeSettings({ participants: [1, 'Ana', '', '  Bo   b  ', null] }).participants,
      ['Ana', 'Bo b'],
    );
  });

  test('falls back to the sample list when participants is not an array', () => {
    assert.equal(
      sanitizeSettings({ participants: 'Ana\nBeto' }).participants.length,
      DEFAULT_SETTINGS.participants.length,
    );
  });
});

describe('loadStoredSettings', () => {
  test('returns the defaults when nothing is stored', () => {
    stubStorage();
    assert.deepEqual(loadStoredSettings(), DEFAULT_SETTINGS);
  });

  test('sanitizes what it reads from storage', () => {
    stubStorage({ [STORAGE_KEY]: JSON.stringify({ spinMin: 99, theme: 'light', participants: ['Ana'] }) });
    const settings = loadStoredSettings();
    assert.equal(settings.spinMin, SPIN_CEILING);
    assert.equal(settings.theme, 'light');
    assert.deepEqual(settings.participants, ['Ana']);
  });

  test('never writes back, so a read-only window cannot clobber storage', () => {
    const { writes } = stubStorage({ [STORAGE_KEY]: JSON.stringify({ spinMin: 99 }) });
    loadStoredSettings();
    assert.deepEqual(writes, []);
  });

  test('survives malformed JSON', () => {
    stubStorage({ [STORAGE_KEY]: '{not json' });
    assert.deepEqual(loadStoredSettings(), DEFAULT_SETTINGS);
  });
});

describe('hasSameParticipants', () => {
  test('treats the same list in the same order as unchanged', () => {
    assert.equal(hasSameParticipants(['Ana', 'Beto'], ['Ana', 'Beto']), true);
    assert.equal(hasSameParticipants([], []), true);
  });

  test('detects a longer, a shorter, a renamed and a reordered list', () => {
    assert.equal(hasSameParticipants(['Ana'], ['Ana', 'Beto']), false);
    assert.equal(hasSameParticipants(['Ana', 'Beto'], ['Ana']), false);
    assert.equal(hasSameParticipants(['Ana', 'Beto'], ['Ana', 'Beto Dos']), false);
    // Order drives the reel, so a reorder is a different raffle.
    assert.equal(hasSameParticipants(['Ana', 'Beto'], ['Beto', 'Ana']), false);
  });

  test('treats a missing list as empty', () => {
    assert.equal(hasSameParticipants(undefined, []), true);
    assert.equal(hasSameParticipants(null, ['Ana']), false);
  });
});

describe('buildSettingsExport and exportSettingsFilename', () => {
  test('wraps clean settings in a versioned envelope with ISO timestamp', () => {
    const fixedDate = new Date('2026-10-29T15:30:00.000Z');
    const backup = buildSettingsExport(
      { title: 'Sorteo Especial', participants: ['Pedro', 'Marta'] },
      fixedDate,
    );

    assert.equal(backup.app, 'ruleta-de-rifas');
    assert.equal(backup.version, 1);
    assert.equal(backup.exportedAt, '2026-10-29T15:30:00.000Z');
    assert.equal(backup.settings.title, 'Sorteo Especial');
    assert.deepEqual(backup.settings.participants, ['Pedro', 'Marta']);
  });

  test('generates expected filename with ISO date stamp', () => {
    const fixedDate = new Date('2026-10-29T15:30:00.000Z');
    assert.equal(exportSettingsFilename(null, fixedDate), 'ruleta-config-2026-10-29.json');
  });
});

describe('parseSettingsImport', () => {
  test('parses a valid exported backup envelope', () => {
    const backup = {
      app: 'ruleta-de-rifas',
      version: 1,
      exportedAt: '2026-10-29T15:30:00.000Z',
      settings: {
        title: 'Mi Rifa',
        participants: ['Carlos', 'Diana'],
        theme: 'light',
      },
    };

    const result = parseSettingsImport(JSON.stringify(backup));
    assert.equal(result.ok, true);
    assert.equal(result.settings.title, 'Mi Rifa');
    assert.deepEqual(result.settings.participants, ['Carlos', 'Diana']);
    assert.equal(result.settings.theme, 'light');
  });

  test('accepts raw settings objects without envelope', () => {
    const raw = {
      title: 'Sin Sobre',
      participants: ['Ana', 'Beto'],
      palette: ['#ff0000', '#00ff00'],
    };

    const result = parseSettingsImport(JSON.stringify(raw));
    assert.equal(result.ok, true);
    assert.equal(result.settings.title, 'Sin Sobre');
    assert.deepEqual(result.settings.participants, ['Ana', 'Beto']);
    assert.deepEqual(result.settings.palette, ['#ff0000', '#00ff00']);
  });

  test('sanitizes dirty imported settings', () => {
    const dirty = {
      app: 'ruleta-de-rifas',
      settings: {
        spinMin: 99,
        spinMax: 2,
        palette: ['#xyz', '#123456'],
        logoUrl: 'javascript:alert(1)',
        participants: ['  Luna  ', '', 'Sol'],
      },
    };

    const result = parseSettingsImport(JSON.stringify(dirty));
    assert.equal(result.ok, true);
    assert.equal(result.settings.spinMin, SPIN_CEILING);
    assert.equal(result.settings.spinMax, SPIN_CEILING);
    assert.deepEqual(result.settings.palette, ['#123456']);
    assert.equal(result.settings.logoUrl, '');
    assert.deepEqual(result.settings.participants, ['Luna', 'Sol']);
  });

  test('rejects non-string or empty input', () => {
    assert.equal(parseSettingsImport('').ok, false);
    assert.equal(parseSettingsImport('   ').ok, false);
    assert.equal(parseSettingsImport(null).ok, false);
  });

  test('rejects malformed JSON', () => {
    const result = parseSettingsImport('{bad json');
    assert.equal(result.ok, false);
    assert.match(result.error, /JSON válido/i);
  });

  test('rejects JSON primitives and arrays', () => {
    assert.equal(parseSettingsImport('42').ok, false);
    assert.equal(parseSettingsImport('"texto"').ok, false);
    assert.equal(parseSettingsImport('true').ok, false);
    assert.equal(parseSettingsImport('null').ok, false);
  });

  test('rejects unrelated JSON objects without recognizable keys', () => {
    const result = parseSettingsImport(JSON.stringify({ foo: 'bar', count: 123 }));
    assert.equal(result.ok, false);
    assert.match(result.error, /no parece ser una configuración/i);
  });

  test('rejects configurations without participants', () => {
    const result = parseSettingsImport(JSON.stringify({ title: 'Vacío', participants: [] }));
    assert.equal(result.ok, false);
    assert.match(result.error, /participantes válidos/i);
  });
});
