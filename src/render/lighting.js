import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

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

// A pixel blooms when its brightest linear HDR channel passes `threshold`: lit white walls reach about 1.2, glow
// surfaces 2 and more. Sun glints on gold and chrome can pass it too and get a faint sparkle; separating them would
// need a glow-only render pass. The brightest channel, not luminance, so red fire and magenta neon bloom like cyan.
const BLOOM = Object.freeze({ strength: 0.55, radius: 0.25, threshold: 1.8 });

// UnrealBloomPass without its last step, which adds the bloom back into the full-resolution multisampled scene
// target: on a tile-based GPU that writes the whole target out and reads it back, 3-3.5 ms a frame at High on an M2
// Max. The bloom stays in its small composite target (`glow`) and the output pass adds it (withBloom).
class GlowPass extends UnrealBloomPass {
  constructor(...args) {
    super(...args);
    const shader = this.materialHighPassFilter, luma = 'float v = luminance( texel.xyz );';
    if (!shader.fragmentShader.includes(luma) || !this._fsQuad) throw new Error('UnrealBloomPass internals changed');
    shader.fragmentShader = shader.fragmentShader.replace(luma, 'float v = max( texel.r, max( texel.g, texel.b ) );');
  }
  get glow() { return this.renderTargetsHorizontal[0].texture; }
  // UnrealBloomPass.render up to its composite (three r186), all at half resolution and below.
  render(renderer, writeBuffer, readBuffer) {
    const autoClear = renderer.autoClear, quad = this._fsQuad;
    renderer.getClearColor(this._oldClearColor); this._oldClearAlpha = renderer.getClearAlpha();
    renderer.autoClear = false; renderer.setClearColor(this.clearColor, 0);
    const draw = (material, target) => { quad.material = material; renderer.setRenderTarget(target); renderer.clear(); quad.render(renderer); };
    this.highPassUniforms.tDiffuse.value = readBuffer.texture;
    this.highPassUniforms.luminosityThreshold.value = this.threshold;
    draw(this.materialHighPassFilter, this.renderTargetBright);
    let input = this.renderTargetBright;
    for (let i = 0; i < this.nMips; i++) {
      const blur = this.separableBlurMaterials[i];
      blur.uniforms.colorTexture.value = input.texture; blur.uniforms.direction.value = UnrealBloomPass.BlurDirectionX;
      draw(blur, this.renderTargetsHorizontal[i]);
      blur.uniforms.colorTexture.value = this.renderTargetsHorizontal[i].texture; blur.uniforms.direction.value = UnrealBloomPass.BlurDirectionY;
      draw(blur, this.renderTargetsVertical[i]);
      input = this.renderTargetsVertical[i];
    }
    this.compositeMaterial.uniforms.bloomStrength.value = this.strength;
    this.compositeMaterial.uniforms.bloomRadius.value = this.radius;
    this.compositeMaterial.uniforms.bloomTintColors.value = this.bloomTintColors;
    draw(this.compositeMaterial, this.renderTargetsHorizontal[0]);
    renderer.setClearColor(this._oldClearColor, this._oldClearAlpha); renderer.autoClear = autoClear;
  }
}

// The output pass (tone mapping, sRGB) adds the glow texture before tone mapping, as UnrealBloomPass's blend would have.
function withBloom(output, glowPass) {
  const read = 'gl_FragColor = texture2D( tDiffuse, vUv );', material = output.material;
  if (!material.fragmentShader.includes(read)) throw new Error('OutputPass shader changed');
  output.uniforms.tGlow = { value: glowPass.glow };
  material.fragmentShader = material.fragmentShader.replace('uniform sampler2D tDiffuse;', 'uniform sampler2D tDiffuse;\nuniform sampler2D tGlow;')
    .replace(read, `${read}\ngl_FragColor.rgb += texture2D( tGlow, vUv ).rgb;`);
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
  const bloom = preset.bloom ? new GlowPass(new THREE.Vector2(1, 1), BLOOM.strength, BLOOM.radius, BLOOM.threshold) : null;
  if (bloom) withBloom(output, bloom);
  composer.addPass(beauty); composer.addPass(ao); if (bloom) composer.addPass(bloom); composer.addPass(output);
  return {
    enabled: true, bloom: !!bloom, invalidate() { ao.excluded = null; },
    resize(width, height) {
      const ratio = renderer.getPixelRatio();
      composer.setPixelRatio(ratio); composer.setSize(width, height);
      // AO runs at a fraction (preset.ao) of the drawing-buffer resolution.
      ao.setSize(Math.max(1, Math.round(width * ratio * preset.ao)), Math.max(1, Math.round(height * ratio * preset.ao)));
      // Bloom is blurry by design, so it also runs at a fraction (preset.bloom) of the resolution.
      bloom?.setSize(Math.max(1, Math.round(width * ratio * preset.bloom)), Math.max(1, Math.round(height * ratio * preset.bloom)));
    },
    render() { composer.render(); },
    dispose() { ao.dispose(); bloom?.dispose(); output.dispose(); beauty.dispose(); composer.dispose(); },
  };
}
