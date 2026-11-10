import test from 'node:test'; import assert from 'node:assert/strict';
import { INSTALL_GUIDES, guideFor, installGuideHtml } from '../src/ui/install-guide.js';

test('install guide: four illustrated steps per browser, each ringing the control to tap', () => {
  assert.deepEqual(Object.keys(INSTALL_GUIDES), ['safari', 'chrome_ios', 'android']);
  for (const [id, guide] of Object.entries(INSTALL_GUIDES)) {
    assert.equal(guide.steps.length, 4, id);
    for (const [i, step] of guide.steps.entries()) {
      assert.match(step.art, /^<svg class="guide-art" viewBox="0 0 120 210"/, `${id} ${i}`);
      assert.ok(step.art.endsWith('</svg>'), `${id} ${i}`);
      assert.match(step.art, /class="tap"/, `${id} step ${i + 1} rings what to tap`);
      assert.match(step.text, /<b>/, `${id} step ${i + 1} names the control`);
    }
  }
});

test('install guide: opens on the visitor\'s browser, with a tab for each', () => {
  assert.equal(guideFor('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/130.0 Mobile/15E148'), 'chrome_ios');
  assert.equal(guideFor('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'), 'safari');
  assert.equal(guideFor('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36'), 'android');
  const html = installGuideHtml('android');
  for (const id of Object.keys(INSTALL_GUIDES)) assert.match(html, new RegExp(`data-guide="${id}" aria-pressed="${id === 'android'}"`));
  assert.equal((html.match(/<li>/g) || []).length, 4);
});
