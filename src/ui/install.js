// Installing the game as a Home Screen app, and sizing it right once installed.
import { INSTALL_GUIDES, guideFor, installGuideHtml } from './install-guide.js';
import { fullscreenLabel, fullscreenMode, isFullscreen } from './fullscreen.js';

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

// iPhone Home Screen apps with a black-translucent status bar get a viewport short by the status bar's height (a
// WebKit bug), leaving a black strip along the bottom. There, size the app from the screen itself (--app-h).
// navigator.standalone exists only on iOS, so Android and desktop keep their normal sizing.
function fitStandalone() {
  if (!navigator.standalone) return;
  const { width, height } = screen;
  const portrait = matchMedia('(orientation: portrait)').matches;
  const full = portrait ? Math.max(width, height) : Math.min(width, height);
  const root = document.documentElement.style;
  if (full > innerHeight) root.setProperty('--app-h', `${full}px`);
  else root.removeProperty('--app-h');
}
fitStandalone();
window.addEventListener('resize', fitStandalone);
window.addEventListener('orientationchange', () => setTimeout(fitStandalone, 300));
