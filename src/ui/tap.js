// Touch taps on buttons, handled on touchend instead of waiting for the browser's click.
// Safari on the iPhone drops a tap (no click at all) when the button touched is no longer the node under the finger
// when it lifts, and when the page changes during its synthetic mouse events. The HUD redraws several times a
// second, so a tap on a tile, the Delete tile of a foundation being built or the menu button sometimes took two or
// three tries. A short, still touch that ends on the button it began on (or on the redrawn copy of it, same
// control) now presses it right away; the touchend is cancelled, so the browser sends no second click.

export const TAP_SLOP = 12; // px a finger may drift and still tap
export const TAP_MAX_MS = 1500; // a longer press is not a tap

// What makes two button nodes the same control: a redraw makes a new node with the same identity.
export function controlKey({ id = '', scope = '', value = '', label = '', text = '', dataset = {} }) {
  const data = Object.keys(dataset).sort().map(name => `${name}=${dataset[name]}`).join('&');
  return [id, scope, value, label, data, data || id || label || value ? '' : text].join('|');
}

// Whether a touch that began at `start` and ended at `end` (both {x, y, t}) is a tap.
export const isTap = (start, end) => Math.hypot(end.x - start.x, end.y - start.y) <= TAP_SLOP && end.t - start.t <= TAP_MAX_MS;

const keyOf = button => controlKey({ id: button.id, scope: button.parentElement?.closest('[id]')?.id, value: button.value,
  label: button.getAttribute('aria-label') || '', text: button.textContent.trim(), dataset: { ...button.dataset } });

const tapButton = el => {
  const button = el?.closest?.('button');
  return button && !button.disabled ? button : null;
};

export function installTapActivation(root = document) {
  let start = null, handledAt = -Infinity;
  const point = touch => ({ x: touch.clientX, y: touch.clientY, t: performance.now() });
  root.addEventListener('touchstart', e => {
    const button = e.touches.length === 1 ? tapButton(e.target) : null;
    start = button ? { ...point(e.touches[0]), button, key: keyOf(button) } : null;
  }, { capture: true, passive: true });
  root.addEventListener('touchmove', e => {
    if (start && !isTap(start, point(e.touches[0]))) start = null;
  }, { capture: true, passive: true });
  root.addEventListener('touchcancel', () => { start = null; }, { capture: true, passive: true });
  root.addEventListener('touchend', e => {
    const begun = start;
    start = null;
    const touch = e.changedTouches[0];
    if (!begun || !touch || e.touches.length || !e.cancelable) return;
    const end = point(touch);
    if (!isTap(begun, end)) return;
    const hit = tapButton(document.elementFromPoint(end.x, end.y));
    if (!hit) return;
    const target = hit === begun.button || keyOf(hit) === begun.key ? hit : null;
    if (!target) return;
    e.preventDefault(); // no synthetic mouse events and no click from the browser
    handledAt = performance.now();
    target.click();
  }, { capture: true, passive: false });
  // A browser that still sends its own click after a cancelled touchend must not press the button twice.
  root.addEventListener('click', e => {
    if (!e.isTrusted || performance.now() - handledAt > 700) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, { capture: true });
}
