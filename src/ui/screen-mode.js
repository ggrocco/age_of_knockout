// Playing without the browser's bars.
// Android, iPad and desktop browsers have the Fullscreen API. iPhone browsers (Safari, and Chrome, which runs on the
// same engine there) do not, so the way to drop their bars is to add the game to the Home Screen: launched from that
// icon, the web app manifest opens it as a full-screen app.

// 'installed' (already running as a Home Screen app), 'api' (a Full screen button works), 'homescreen' (an iPhone:
// suggest Add to Home Screen) or 'none'. Takes the globals so the test can pass fakes.
export function fullscreenMode({ document: doc, navigator: nav, matchMedia } = globalThis) {
  const media = query => !!matchMedia?.(query)?.matches;
  // Full screen through the API also matches display-mode: fullscreen; the button must stay to leave it.
  if (doc?.fullscreenElement || doc?.webkitFullscreenElement) return 'api';
  if (nav?.standalone || media('(display-mode: fullscreen)') || media('(display-mode: standalone)')) return 'installed';
  if (doc?.fullscreenEnabled || doc?.webkitFullscreenEnabled) return 'api';
  const ios = /iPhone|iPod|iPad/.test(nav?.userAgent || '') || (nav?.platform === 'MacIntel' && nav?.maxTouchPoints > 1);
  return ios ? 'homescreen' : 'none';
}

export const isFullscreen = (doc = globalThis.document) => !!(doc.fullscreenElement || doc.webkitFullscreenElement);

// Enters or leaves full screen; must run inside a tap or click. Resolves whether the page is now full screen.
export async function toggleFullscreen(doc = globalThis.document) {
  try {
    if (isFullscreen(doc)) await (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc);
    else {
      const root = doc.documentElement;
      await (root.requestFullscreen || root.webkitRequestFullscreen).call(root, { navigationUI: 'hide' });
    }
  } catch {
    // Refused (no user gesture, or a browser setting): the page simply stays as it is.
  }
  return isFullscreen(doc);
}

// The full-screen button's label.
export const fullscreenLabel = on => on ? 'Exit full screen' : 'Play full screen';

// The iOS 26 Home Screen bug: under a black-translucent status bar the page is drawn under the status bar (a top
// inset) yet the viewport stops short of the screen's bottom edge by about that inset. An opaque status bar has no top
// inset and a viewport that is honestly shorter than the screen, so it never matches.
export const shortViewport = ({ standalone, innerHeight, screenHeight, insetTop }) =>
  !!standalone && insetTop > 0 && innerHeight < screenHeight - 1;
