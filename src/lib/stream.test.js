import assert from 'node:assert/strict';
import test, { afterEach, describe } from 'node:test';
import {
  CHROMA_GREEN,
  STREAM_BACKGROUNDS,
  isStreamView,
  readStreamParams,
  streamBackgroundUrl,
  streamUrl,
} from './stream.js';

const realWindow = globalThis.window;
const ORIGIN = 'http://localhost:8125/';

afterEach(() => {
  if (realWindow === undefined) delete globalThis.window;
  else globalThis.window = realWindow;
});

/** The stream helpers read `window.location`, so provide just enough of one. */
function stubLocation(href = ORIGIN) {
  const url = new URL(href);
  globalThis.window = { location: { href: url.toString(), search: url.search } };
}

describe('isStreamView', () => {
  test('is true only for view=stream', () => {
    assert.equal(isStreamView('?view=stream'), true);
    assert.equal(isStreamView('?view=stream&bg=green'), true);
    assert.equal(isStreamView('?view=control'), false);
    assert.equal(isStreamView(''), false);
  });
});

describe('readStreamParams', () => {
  test('accepts the three supported backgrounds', () => {
    assert.deepEqual(readStreamParams('?bg=green'), { background: 'green' });
    assert.deepEqual(readStreamParams('?bg=transparent'), { background: 'transparent' });
    assert.deepEqual(readStreamParams('?bg=solid'), { background: 'solid' });
    assert.deepEqual(STREAM_BACKGROUNDS, ['solid', 'transparent', 'green']);
  });

  test('falls back to solid for a missing or unknown background', () => {
    assert.deepEqual(readStreamParams(''), { background: 'solid' });
    assert.deepEqual(readStreamParams('?bg=magenta'), { background: 'solid' });
  });
});

describe('streamUrl', () => {
  test('turns the current page into the stream URL, keeping other params', () => {
    stubLocation(`${ORIGIN}?view=control&foo=1#frag`);
    const url = new URL(streamUrl());
    assert.equal(url.searchParams.get('view'), 'stream');
    assert.equal(url.searchParams.get('foo'), '1');
    assert.equal(url.hash, '');
  });

  test('drops the background param so the stream starts from its own choice', () => {
    stubLocation(`${ORIGIN}?view=control&bg=green`);
    const url = new URL(streamUrl());
    assert.equal(url.searchParams.get('view'), 'stream');
    assert.equal(url.searchParams.has('bg'), false);
  });
});

describe('streamBackgroundUrl', () => {
  test('adds the background param and removes it for solid', () => {
    const green = new URL(streamBackgroundUrl(`${ORIGIN}?view=stream`, 'green'));
    assert.equal(green.searchParams.get('bg'), 'green');

    const solid = new URL(streamBackgroundUrl(`${ORIGIN}?view=stream&bg=green`, 'solid'));
    assert.equal(solid.searchParams.has('bg'), false);
  });
});

describe('CHROMA_GREEN', () => {
  test('is the standard broadcast chroma key', () => {
    assert.equal(CHROMA_GREEN, '#00b140');
  });
});
