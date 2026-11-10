import test from 'node:test';
import assert from 'node:assert/strict';
import { QUALITY, renderPixelRatio } from '../src/render/quality.js';

test('High and Ultra preserve native 3x phone detail in either orientation', () => {
  for (const preset of [QUALITY.high, QUALITY.ultra]) {
    for (const [width, height] of [[402, 874], [874, 402], [430, 932], [932, 430]]) {
      assert.equal(renderPixelRatio(width, height, 3, preset), 3);
    }
  }
  assert.equal(renderPixelRatio(402, 874, 3, QUALITY.balanced), 1.5, 'Balanced keeps its power-saving resolution');
});

test('native phone detail still yields to the pixel budget on larger screens', () => {
  for (const preset of [QUALITY.high, QUALITY.ultra]) {
    const width = 1024, height = 1366;
    const ratio = renderPixelRatio(width, height, 3, preset);
    assert.ok(ratio < 3);
    assert.ok(width * height * ratio * ratio <= preset.maxPixels + 1);
    assert.equal(renderPixelRatio(402, 874, 1, preset), 1, 'standard-density displays are not supersampled');
  }
});
