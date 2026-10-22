import test from 'node:test';
import assert from 'node:assert/strict';
import { viewHalfHeight } from '../src/render/camera-fit.js';

test('phones and small windows keep the fixed-height framing', () => {
  assert.equal(viewHalfHeight(14, 874, 402), 14);
  assert.equal(viewHalfHeight(14, 1000, 600), 14);
  assert.equal(viewHalfHeight(14, 402, 874), 14 * 1.2 / (402 / 874));
});

test('big wide screens cap the visible width so objects stay large', () => {
  const hh = viewHalfHeight(14, 1820, 970);
  assert.ok(Math.abs(hh * (1820 / 970) - 14 * 1.2) < 1e-9, 'width is 1.2x the reference height');
  assert.ok(viewHalfHeight(14, 1440, 800) < 14 && viewHalfHeight(14, 1440, 800) > 14 * 1.2 / (1440 / 800), 'eases in between');
  assert.equal(viewHalfHeight(14, 2000, 1800), 14, 'a squarish big screen is unchanged');
  assert.equal(viewHalfHeight(7, 1820, 970) * 2, hh, 'still proportional to the zoom level');
});
