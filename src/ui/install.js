// Installing the game as a Home Screen app, and sizing it right once installed.
import { INSTALL_GUIDES, guideFor, installGuideHtml } from './install-guide.js';
import { fullscreenLabel, fullscreenMode, isFullscreen, shortViewport } from './fullscreen.js';

// Chrome (Android and desktop) offers its own install prompt through beforeinstallprompt; keep the event so a menu
// button can show the prompt. Safari and every iPhone browser never fire it: there the guide explains the steps.
let installEvent = null;
const listeners = new Set();
const changed = () => listeners.forEach(listener => listener());
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  installEvent = e;
  changed();
});
window.addEventListener('appinstalled', () => {
  installEvent = null;
  changed();
});
export const onInstallChange = listener => listeners.add(listener);
export async function promptInstall() {
  const event = installEvent;
  if (!event) return openInstallGuide();
  installEvent = null;
  event.prompt();
  await event.userChoice.catch(() => null);
  changed();
}

// The menus' screen buttons: full screen where the browser can do it, and Install (Chrome's prompt) or the
// step-by-step guide on phones. Nothing once the game already runs from the Home Screen.
export function screenControlsHtml(touch) {
  const mode = fullscreenMode();
  if (mode === 'installed') return '';
  const buttons = [];
  if (mode === 'api') buttons.push(`<button class="btn screen-btn" data-fullscreen="1" aria-pressed="${isFullscreen()}">&#x26F6; ${fullscreenLabel(isFullscreen())}</button>`);
  if (installEvent) buttons.push('<button class="btn screen-btn" data-install="prompt">&#x2B73; Install app</button>');
  else if (touch || mode === 'homescreen') buttons.push('<button class="btn screen-btn" data-install="guide">&#x2B73; Install as an app</button>');
  return buttons.join('');
}

// The guide dialog, opened over whatever is showing; the match stays as it was (the game menu already paused it).
export function openInstallGuide(chosen = guideFor(navigator.userAgent)) {
  let dialog = document.getElementById('install-guide');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'install-guide';
    dialog.className = 'card';
    dialog.setAttribute('aria-labelledby', 'install-title');
    // Keys stay in the dialog (Esc still closes it: that is the dialog's own default action).
    dialog.addEventListener('keydown', e => e.stopPropagation());
    dialog.addEventListener('click', e => {
      const button = e.target.closest('button');
      if (e.target === dialog || button?.dataset.guideClose) return dialog.close();
      if (button?.dataset.guide in INSTALL_GUIDES) {
        dialog.innerHTML = installGuideHtml(button.dataset.guide);
        dialog.querySelector(`[data-guide="${button.dataset.guide}"]`).focus();
      }
    });
    document.getElementById('app').append(dialog);
  }
  dialog.innerHTML = installGuideHtml(chosen);
  if (!dialog.open) dialog.showModal();
  dialog.querySelector('.guide-close').focus({ preventScroll: true });
  dialog.scrollTop = 0;
}

// An iPhone Home Screen app installed while the page still asked for a black-translucent status bar keeps that style
// until it is added again, and iOS 26 gives such an app a viewport short by the status bar's height (WebKit bug
// 301108): nothing paints below innerHeight, so the bottom of the screen is a dead strip. index.html now asks for an
// opaque status bar, which avoids the bug; for the old installs, keep every control inside the short viewport and drop
// the bottom safe-area margin, since that viewport already ends above the home indicator.
// navigator.standalone exists only on iOS, so Android and desktop keep their normal sizing.
let insetProbe = null;
function fitStandalone() {
  if (!navigator.standalone) return;
  if (!insetProbe) {
    insetProbe = document.createElement('div');
    insetProbe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px)';
    document.body.append(insetProbe);
  }
  const insetTop = parseFloat(getComputedStyle(insetProbe).paddingTop) || 0;
  const { width, height } = screen;
  const portrait = matchMedia('(orientation: portrait)').matches;
  const full = portrait ? Math.max(width, height) : Math.min(width, height);
  document.body.classList.toggle('short-viewport', shortViewport({ standalone: true, innerHeight, screenHeight: full, insetTop }));
}
fitStandalone();
window.addEventListener('resize', fitStandalone);
window.addEventListener('orientationchange', () => setTimeout(fitStandalone, 300));
