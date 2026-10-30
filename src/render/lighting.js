import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

// Sky above the horizon, ground below it (top to bottom of the equirectangular image).
const SKY_STOPS = [[0, '#769fc0'], [0.35, '#c0d4dc'], [0.5, '#f1e4c2'], [0.54, '#78845b'], [1, '#393426']];

// A painted sky with a sun glow, prefiltered into an environment map for soft image-based lighting.
export function createSkyLighting(renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext('2d'), sky = ctx.createLinearGradient(0, 0, 0, 256);
  for (const [at, color] of SKY_STOPS) sky.addColorStop(at, color);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, 512, 256);
  const glow = ctx.createRadialGradient(130, 90, 0, 130, 90, 36);
  glow.addColorStop(0, '#fff8df'); glow.addColorStop(0.25, '#fff4d9b0'); glow.addColorStop(1, '#fff4d900');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 512, 256);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.mapping = THREE.EquirectangularReflectionMapping;
  const generator = new THREE.PMREMGenerator(renderer), target = generator.fromEquirectangular(texture);
  generator.dispose(); texture.dispose();
  return target;
}

// Render only solid world geometry into AO. UI rings, fog, water and ground-cover
// overlays must not become opaque occluders in the normal/depth pass.
class WorldAO extends SSAOPass {
  render(renderer, writeBuffer, readBuffer, ...rest) {
    const hidden = [], autoShadow = renderer.shadowMap.autoUpdate;
    if (!this.excluded) this.excluded = this.findOverlays();
    for (const object of this.excluded) if (object.visible) { hidden.push(object); object.visible = false; }
    renderer.shadowMap.autoUpdate = false;
    this.ssaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix);
    this.ssaoMaterial.uniforms.cameraInverseProjectionMatrix.value.copy(this.camera.projectionMatrixInverse);
    try { super.render(renderer, writeBuffer, readBuffer, ...rest); }
    finally {
      hidden.forEach(object => { object.visible = true; });
      renderer.shadowMap.autoUpdate = autoShadow;
    }
  }
  // Everything that must not occlude: marked skipAO, transparent, or drawn without a depth test.
  findOverlays() {
    const found = [];
    this.scene.traverse(object => {
      if (!object.isMesh) return;
      if (object.userData.skipAO || object.material.transparent || object.material.depthTest === false) found.push(object);
    });
    return found;
  }
  dispose() {
    super.dispose(); this.ssaoMaterial.dispose(); this.noiseTexture.dispose();
  }
}

// Bloom in three small passes: a bright-pass that also shrinks the frame (4x4 texels per pixel), then a horizontal and a
// vertical blur, all at a fraction of the drawing buffer; the output pass adds the result before tone mapping
// (withBloom). three's UnrealBloomPass needs 13 render passes; on the user's M2 Max (Chrome, Metal) that cost 3-3.5 ms a
// frame at High, the same whether or not its full-resolution blend was skipped, so the pass count is what costs.
// A pixel blooms when its brightest linear HDR channel passes `threshold` (lit white walls reach about 1.2, glow
// surfaces 2 and more), so red fire and magenta neon bloom like cyan. Sun glints on gold and chrome can pass it too
// and get a faint sparkle; separating them would need a glow-only render pass.
const BLOOM = Object.freeze({ strength: 2, threshold: 1.8, knee: 0.1, spread: 1 });
const QUAD_VERTEX = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const BRIGHT_SHRINK = `uniform sampler2D tDiffuse; uniform vec2 texel; uniform float threshold, knee; varying vec2 vUv;
  vec3 bright(vec2 uv) { vec3 c = texture2D(tDiffuse, uv).rgb; return c * smoothstep(threshold, threshold + knee, max(c.r, max(c.g, c.b))); }
  void main() {
    gl_FragColor = vec4(0.25 * (bright(vUv + texel * vec2(-1.0, -1.0)) + bright(vUv + texel * vec2(1.0, -1.0))
      + bright(vUv + texel * vec2(-1.0, 1.0)) + bright(vUv + texel * vec2(1.0, 1.0))), 1.0);
  }`;
// A 13-tap Gaussian in 7 bilinear fetches; `step` above one texel would leave gaps that show as ghost edges.
const BLUR = `uniform sampler2D tInput; uniform vec2 step; varying vec2 vUv;
  vec3 pair(float offset) { return texture2D(tInput, vUv + step * offset).rgb + texture2D(tInput, vUv - step * offset).rgb; }
  void main() {
    gl_FragColor = vec4(texture2D(tInput, vUv).rgb * 0.1964825 + pair(1.4117647) * 0.2969069
      + pair(3.2941176) * 0.0944703 + pair(5.1764706) * 0.0103813, 1.0);
  }`;

class GlowPass extends Pass {
  constructor() {
    super();
    this.needsSwap = false;
    const target = () => new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
    this.targets = [target(), target()];
    this.shrink = new THREE.ShaderMaterial({ vertexShader: QUAD_VERTEX, fragmentShader: BRIGHT_SHRINK, depthTest: false, depthWrite: false,
      uniforms: { tDiffuse: { value: null }, texel: { value: new THREE.Vector2() }, threshold: { value: BLOOM.threshold }, knee: { value: BLOOM.knee } } });
    this.blur = new THREE.ShaderMaterial({ vertexShader: QUAD_VERTEX, fragmentShader: BLUR, depthTest: false, depthWrite: false,
      uniforms: { tInput: { value: null }, step: { value: new THREE.Vector2() } } });
    this.quad = new FullScreenQuad();
    this.blurSize = new THREE.Vector2(1, 1);
  }
  // The glow, blurred, at the size of the bloom buffers.
  get glow() { return this.targets[0].texture; }
  // `width`/`height`: the bloom buffers (a fraction of the drawing buffer); `sceneWidth`/`sceneHeight`: the frame.
  setBloomSize(width, height, sceneWidth, sceneHeight) {
    for (const t of this.targets) t.setSize(width, height);
    this.blurSize.set(width, height);
    this.shrink.uniforms.texel.value.set(1 / sceneWidth, 1 / sceneHeight);
  }
  setSize() {} // the composer's full-size call; createLightingEffects sizes the buffers with setBloomSize
  render(renderer, writeBuffer, readBuffer) {
    const draw = (material, target) => { this.quad.material = material; renderer.setRenderTarget(target); this.quad.render(renderer); };
    this.shrink.uniforms.tDiffuse.value = readBuffer.texture;
    draw(this.shrink, this.targets[0]);
    const step = this.blur.uniforms.step.value;
    this.blur.uniforms.tInput.value = this.targets[0].texture; step.set(BLOOM.spread / this.blurSize.x, 0);
    draw(this.blur, this.targets[1]);
    this.blur.uniforms.tInput.value = this.targets[1].texture; step.set(0, BLOOM.spread / this.blurSize.y);
    draw(this.blur, this.targets[0]);
  }
  dispose() { this.targets.forEach(t => t.dispose()); this.shrink.dispose(); this.blur.dispose(); this.quad.dispose(); }
}

// The output pass (tone mapping, sRGB) adds the glow before tone mapping.
function withBloom(output, glowPass) {
  const read = 'gl_FragColor = texture2D( tDiffuse, vUv );', material = output.material;
  if (!material.fragmentShader.includes(read)) throw new Error('OutputPass shader changed');
  output.uniforms.tGlow = { value: glowPass.glow }; output.uniforms.glowStrength = { value: BLOOM.strength };
  material.fragmentShader = material.fragmentShader.replace('uniform sampler2D tDiffuse;', 'uniform sampler2D tDiffuse;\nuniform sampler2D tGlow;\nuniform float glowStrength;')
    .replace(read, `${read}\ngl_FragColor.rgb += texture2D( tGlow, vUv ).rgb * glowStrength;`);
  return output;
}

export function createLightingEffects(renderer, scene, camera, preset, cosmetics) {
  // Float render targets are required by SSAOPass; direct rendering is the fallback.
  if (!preset.ao || !renderer.extensions.has('EXT_color_buffer_float')) {
    return { enabled: false, bloom: false, invalidate() {}, resize() {}, render() { renderer.render(scene, camera); }, dispose() {} };
  }
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: preset.samples > 12 ? 4 : 2 });
  const composer = new EffectComposer(renderer, target), beauty = new RenderPass(scene, camera);
  const ao = new WorldAO(scene, camera, 1, 1, preset.samples), output = new OutputPass();
  cosmetics?.patch(ao.normalMaterial);
  ao.ssaoMaterial.defines.PERSPECTIVE_CAMERA = 0;
  ao.depthRenderMaterial.defines.PERSPECTIVE_CAMERA = 0;
  ao.kernelRadius = 0.65; ao.minDistance = 0.00015; ao.maxDistance = 0.018;
  // Bloom haloes only what is brighter than lit white walls, which in practice means the glow surfaces (materials.js).
  const bloom = preset.bloom ? new GlowPass() : null;
  if (bloom) withBloom(output, bloom);
  composer.addPass(beauty); composer.addPass(ao); if (bloom) composer.addPass(bloom); composer.addPass(output);
  return {
    enabled: true, bloom: !!bloom, invalidate() { ao.excluded = null; },
    // For measurements (render audit): skip the bloom pass and its glow, keeping everything else.
    setBloom(on) { if (!bloom) return; bloom.enabled = on; output.uniforms.glowStrength.value = on ? BLOOM.strength : 0; },
    resize(width, height) {
      const ratio = renderer.getPixelRatio();
      composer.setPixelRatio(ratio); composer.setSize(width, height);
      // AO runs at a fraction (preset.ao) of the drawing-buffer resolution.
      ao.setSize(Math.max(1, Math.round(width * ratio * preset.ao)), Math.max(1, Math.round(height * ratio * preset.ao)));
      // Bloom is blurry by design: its buffers are a fraction (preset.bloom / 2) of the drawing buffer.
      const scale = preset.bloom / 2;
      bloom?.setBloomSize(Math.max(1, Math.round(width * ratio * scale)), Math.max(1, Math.round(height * ratio * scale)), width * ratio, height * ratio);
    },
    render() { composer.render(); },
    dispose() { ao.dispose(); bloom?.dispose(); output.dispose(); beauty.dispose(); composer.dispose(); },
  };
}
