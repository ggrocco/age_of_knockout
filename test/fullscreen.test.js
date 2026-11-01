import test from 'node:test'; import assert from 'node:assert/strict';
import { fullscreenMode, fullscreenLabel, isFullscreen, shortViewport, toggleFullscreen } from '../src/ui/fullscreen.js';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const env = ({ doc = {}, ua = ANDROID, standalone, display = null, platform = 'Linux', touch = 5 } = {}) => ({
  document: doc,
  navigator: { userAgent: ua, standalone, platform, maxTouchPoints: touch },
  matchMedia: query => ({ matches: display !== null && query === `(display-mode: ${display})` }),
});

test('full screen: a button where the Fullscreen API exists, the Home Screen hint on an iPhone', () => {
  assert.equal(fullscreenMode(env({ doc: { fullscreenEnabled: true } })), 'api');
  assert.equal(fullscreenMode(env({ doc: { webkitFullscreenEnabled: true }, ua: IPHONE })), 'api', 'iPad Safari');
  assert.equal(fullscreenMode(env({ ua: IPHONE })), 'homescreen');
  assert.equal(fullscreenMode(env({ ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel', touch: 5 })), 'homescreen',
    'iPad asking for the desktop site');
  assert.equal(fullscreenMode(env({ ua: 'Mozilla/5.0 (X11; Linux x86_64)', touch: 0 })), 'none');
});

test('full screen: nothing to offer once launched from the Home Screen, but a page in API full screen keeps its exit', () => {
  assert.equal(fullscreenMode(env({ ua: IPHONE, standalone: true })), 'installed');
  assert.equal(fullscreenMode(env({ doc: { fullscreenEnabled: true }, display: 'standalone' })), 'installed');
  assert.equal(fullscreenMode(env({ doc: { fullscreenEnabled: true }, display: 'fullscreen' })), 'installed');
  const inApiFullscreen = { fullscreenEnabled: true, fullscreenElement: {} };
  assert.equal(fullscreenMode(env({ doc: inApiFullscreen, display: 'fullscreen' })), 'api');
  assert.equal(fullscreenLabel(isFullscreen(inApiFullscreen)), 'Exit full screen');
  assert.equal(fullscreenLabel(false), 'Play full screen');
});

test('toggleFullscreen enters on the root element and leaves again, tolerating a refusal', async () => {
  const doc = { fullscreenElement: null };
  doc.documentElement = { requestFullscreen(options) { assert.equal(options.navigationUI, 'hide'); doc.fullscreenElement = this; return Promise.resolve(); } };
  doc.exitFullscreen = () => { doc.fullscreenElement = null; return Promise.resolve(); };
  assert.equal(await toggleFullscreen(doc), true);
  assert.equal(await toggleFullscreen(doc), false);
  doc.documentElement.requestFullscreen = () => Promise.reject(new Error('denied'));
  assert.equal(await toggleFullscreen(doc), false);
});

test('short viewport: only an iPhone Home Screen app drawn under its status bar yet stopping short of the bottom', () => {
  const iphone17 = { standalone: true, screenHeight: 874 };
  assert.equal(shortViewport({ ...iphone17, innerHeight: 812, insetTop: 62 }), true, 'iOS 26 black-translucent bug');
  assert.equal(shortViewport({ ...iphone17, innerHeight: 874, insetTop: 62 }), false, 'translucent bar, full viewport');
  assert.equal(shortViewport({ ...iphone17, innerHeight: 812, insetTop: 0 }), false, 'opaque status bar');
  assert.equal(shortViewport({ ...iphone17, standalone: undefined, innerHeight: 700, insetTop: 62 }), false, 'Safari tab');
});
