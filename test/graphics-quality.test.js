import test from 'node:test';
import assert from 'node:assert/strict';
import { QUALITY, readQuality, saveQuality, renderPixelRatio } from '../src/render/quality.js';
import * as THREE from 'three';
import { createLightingEffects } from '../src/render/lighting.js';
import { surfaceKind, createModelMaterial, setGlowBloom } from '../src/render/materials.js';

test('graphics defaults to High and accepts only supported URL presets', () => {
  assert.equal(readQuality(), 'high');
  for (const name of Object.keys(QUALITY)) assert.equal(readQuality(`?quality=${name}`), name);
  for (const name of ['constructor', '__proto__', 'invalid', '']) assert.equal(readQuality(`?quality=${name}`), 'high');
});

test('graphics preference persists, with an explicit URL taking precedence', () => {
  const data = new Map(), storage = { getItem: k => data.get(k), setItem: (k, v) => data.set(k, v) };
  assert.equal(saveQuality('balanced', storage), true);
  assert.equal(readQuality('', storage), 'balanced');
  assert.equal(readQuality('?quality=ultra', storage), 'ultra');
  assert.equal(saveQuality('invalid', storage), false);
  assert.equal(readQuality('', storage), 'balanced');
});

test('unavailable browser storage does not prevent choosing graphics settings', () => {
  const storage = { getItem() { throw new Error('Denied'); }, setItem() { throw new Error('Quota'); } };
  assert.equal(readQuality('', storage), 'high');
  assert.equal(readQuality('?quality=ultra', storage), 'ultra');
  assert.equal(saveQuality('ultra', storage), false);
});

test('render resolution respects pixel budgets on retina desktops and phones', () => {
  for (const preset of Object.values(QUALITY)) for (const [w, h, dpr] of [[402, 874, 3], [874, 402, 3], [2560, 1440, 2], [7680, 4320, 2]]) {
    const ratio = renderPixelRatio(w, h, dpr, preset);
    assert.ok(ratio > 0 && ratio <= dpr && ratio <= preset.pixelRatio);
    assert.ok(w * h * ratio * ratio <= preset.maxPixels + 1);
  }
  assert.equal(renderPixelRatio(402, 874, 3, QUALITY.high), 2);
  assert.equal(renderPixelRatio(402, 874, 3, QUALITY.ultra), 2.5);
  assert.ok(Number.isFinite(renderPixelRatio(0, 0, 1, QUALITY.high)));
});

test('Balanced and browsers without float render targets use the direct-render fallback', () => {
  const scene = {}, camera = {}; let renders = 0;
  const renderer = { extensions: { has: () => false }, render(s, c) { assert.equal(s, scene); assert.equal(c, camera); renders++; } };
  for (const preset of [QUALITY.balanced, QUALITY.high, QUALITY.ultra]) {
    const effects = createLightingEffects(renderer, scene, camera, preset);
    assert.equal(effects.enabled, false);
    effects.resize(402, 874); effects.render(); effects.dispose();
  }
  assert.equal(renders, 3);
});

test('bloom only runs on presets that already render through the composer', () => {
  // Bloom costs about 3 ms a frame on an M2 Max (Chrome, Metal) whatever its size, so only Ultra pays for it.
  assert.equal(QUALITY.balanced.bloom, 0); assert.equal(QUALITY.high.bloom, 0);
  assert.ok(QUALITY.ultra.bloom > 0 && QUALITY.ultra.ao > 0);
  const renderer = { extensions: { has: () => false }, render() {} };
  assert.equal(createLightingEffects(renderer, {}, {}, QUALITY.ultra).bloom, false, 'no float targets: no bloom pass');
});

test('light-source colours become glow surfaces, which emit harder when bloom is on', () => {
  for (const light of [0xff8a2a, 0xffc04a, 0xfff3c2, 0x39f3ff, 0xff3df2]) assert.equal(surfaceKind(light), 5);
  assert.equal(surfaceKind(0xf2c230), 4, 'gold metal stays metal');
  assert.equal(surfaceKind(0xf4f6f7), 0, 'white panels do not glow');
  const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
  createModelMaterial().onBeforeCompile(shader);
  assert.match(shader.fragmentShader, /totalEmissiveRadiance \+= glowColor \* glowEmit/);
  assert.match(shader.fragmentShader, /vSurface > 3\.5 && vSurface < 4\.5\) metalnessFactor/, 'glow surfaces are not metal');
  setGlowBloom(true);
  assert.ok(shader.uniforms.glowEmit.value > 1 && shader.uniforms.glowLit.value < 1);
  setGlowBloom(false);
  assert.ok(shader.uniforms.glowEmit.value < 1 && shader.uniforms.glowLit.value === 1);
});
