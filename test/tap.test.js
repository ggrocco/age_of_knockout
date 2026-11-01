import test from 'node:test';
import assert from 'node:assert/strict';
import { controlKey, isTap, TAP_SLOP, TAP_MAX_MS } from '../src/ui/tap.js';

test('a redrawn button is the same control; a different tile is not', () => {
  const del = { scope: 'cmds', dataset: { delete: '41', tip: 'delete' } };
  assert.equal(controlKey(del), controlKey({ scope: 'cmds', dataset: { tip: 'delete', delete: '41' } }));
  assert.notEqual(controlKey(del), controlKey({ scope: 'cmds', dataset: { delete: '42', tip: 'delete' } }));
  assert.notEqual(controlKey({ scope: 'cmds', dataset: { train: 'villager', b: '3' } }),
    controlKey({ scope: 'cmds', dataset: { train: 'scout', b: '3' } }));
  // the pause button's label changes with its state; its data does not
  assert.equal(controlKey({ scope: 'topbar', dataset: { pause: '1' }, text: 'Pause' }),
    controlKey({ scope: 'topbar', dataset: { pause: '1' }, text: 'Resume' }));
  // the same data in another panel is another control
  assert.notEqual(controlKey({ scope: 'topbar', dataset: { menu: 'open' } }), controlKey({ scope: 'gamemenu', dataset: { menu: 'open' } }));
  // plain buttons (the delete dialog's) tell apart by value, and by text only when nothing else does
  assert.notEqual(controlKey({ scope: 'delete-confirmation', value: 'cancel' }), controlKey({ scope: 'delete-confirmation', value: 'delete' }));
  assert.notEqual(controlKey({ scope: 'screen', text: 'Play' }), controlKey({ scope: 'screen', text: 'Back' }));
});

test('only a short, still touch is a tap', () => {
  const start = { x: 100, y: 200, t: 0 };
  assert.ok(isTap(start, { x: 104, y: 197, t: 140 }));
  assert.ok(isTap(start, { x: 100 + TAP_SLOP, y: 200, t: TAP_MAX_MS }));
  assert.ok(!isTap(start, { x: 100 + TAP_SLOP + 1, y: 200, t: 100 }), 'a swipe along the tile strip scrolls');
  assert.ok(!isTap(start, { x: 100, y: 200, t: TAP_MAX_MS + 1 }), 'a long press');
});
