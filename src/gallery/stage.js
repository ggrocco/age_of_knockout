// The design pages' render stage (buildings.html, ages.html): the game's own models under the game's light rig, seen
// through its isometric camera.
import * as THREE from 'three';
import { BUILDINGS } from '../data/buildings.js';
import { UNITS } from '../data/units.js';
import { buildModel, animate } from '../render/models.js';
import { createSkyLighting } from '../render/lighting.js';

const DIR = new THREE.Vector3(1, 1.05, 1).normalize(); // the game camera's view direction

// Same tone mapping and shadows as src/render/view.js.
function configureRenderer(renderer) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
}

// The game's sun, its shadow framed on the 16×16 tiles around the model.
function createSun(renderer) {
  const sun = new THREE.DirectionalLight(0xffe5ba, 3.3);
  sun.position.set(-22, 38, 16).setLength(40);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(Math.min(2048, renderer.capabilities.maxTextureSize));
  sun.shadow.radius = 2.5; sun.shadow.intensity = 0.85; sun.shadow.normalBias = 0.035; sun.shadow.bias = -0.00015;
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 90 });
  return sun;
}

// The half-width and half-height of `box` as the camera sees it (its eight corners in view space).
function viewExtents(box, camera) {
  let halfW = 0, halfH = 0;
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
    const corner = new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse);
    halfW = Math.max(halfW, Math.abs(corner.x));
    halfH = Math.max(halfH, Math.abs(corner.y));
  }
  return { halfW, halfH };
}

// Same light rig and tone mapping as src/render/view.js, so the page shows what the game shows.
export function createStage(renderer) {
  configureRenderer(renderer);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x20271b);
  scene.add(new THREE.HemisphereLight(0xc9deeb, 0x776342, 1.55));
  if (renderer.extensions.has('EXT_color_buffer_float')) {
    scene.environment = createSkyLighting(renderer).texture;
    scene.environmentIntensity = 0.4;
  }
  const sun = createSun(renderer);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x5b6a3a, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.005; ground.receiveShadow = true;
  scene.add(sun, sun.target, ground);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 200);
  let shown = null;
  return {
    renderer, scene, camera,
    show(group) {
      if (shown) scene.remove(shown);
      shown = group;
      if (group) scene.add(group);
    },
    // Point the game's isometric camera at `box`'s centre and zoom so the box fills the view.
    aim(box, aspect, pad = 1.1) {
      const centre = box.getCenter(new THREE.Vector3());
      camera.position.copy(centre).addScaledVector(DIR, 60);
      camera.lookAt(centre);
      camera.updateMatrixWorld();
      const { halfW, halfH } = viewExtents(box, camera);
      const halfHeight = Math.max(halfH, halfW / aspect) * pad;
      Object.assign(camera, { top: halfHeight, bottom: -halfHeight, left: -halfHeight * aspect, right: halfHeight * aspect, zoom: 1 });
      camera.updateProjectionMatrix();
      return centre;
    },
    setAspect(aspect) {
      const halfHeight = camera.top;
      camera.left = -halfHeight * aspect;
      camera.right = halfHeight * aspect;
      camera.updateProjectionMatrix();
    },
  };
}

// A building as the gallery shows it: finished (or half built), holding a full patch or field.
export const entity = (type, owner, built = true) => {
  const spec = BUILDINGS[type];
  return {
    id: 0, kind: 'building', type, owner, size: spec.size, constructed: built, progress: built ? 1 : 0.5, amount: spec.amount ?? 400,
  };
};
// buildModel attaches scaffolding until animate() is told the building is finished.
export function modelGroup(e, age, t = 0) {
  const model = buildModel(e, age), group = new THREE.Group();
  group.add(model.root);
  group.userData.anim = model.anim;
  animate(group, e, t, false);
  group.updateMatrixWorld(true);
  return group;
}
export const boxOf = group => new THREE.Box3().setFromObject(group);
// A unit standing idle, as the game spawns it.
export const unitEntity = (type, owner) => ({
  ...UNITS[type], id: 0, kind: 'unit', type, owner, carry: { amount: 0 }, cd: 0, cooldown: UNITS[type].cooldown ?? 30,
  order: { type: 'idle' },
});
