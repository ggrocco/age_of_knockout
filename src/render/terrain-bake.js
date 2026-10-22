import * as THREE from 'three';

// The small simulation grid stays on the CPU. The millions of decorative pixels
// are generated into a mipmapped GPU texture, never read back during play.
export function bakeTerrain(renderer, { size: n, tiles, starts }, seed, shore, scale = 24) {
  const grid = new Float32Array(n * n * 4);
  const updateGrid = () => {
    for (let i = 0; i < n * n; i++) { grid[i * 4] = tiles[i]; grid[i * 4 + 1] = shore[i]; }
    input.needsUpdate = true;
  };
  const input = new THREE.DataTexture(grid, n, n, THREE.RGBAFormat, THREE.FloatType);
  const side = Math.min(n * scale, renderer.capabilities.maxTextureSize);
  const target = new THREE.WebGLRenderTarget(side, side, {
    type: THREE.UnsignedByteType, colorSpace: THREE.SRGBColorSpace,
    minFilter: THREE.LinearMipmapLinearFilter, generateMipmaps: true, depthBuffer: false,
  });
  target.texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const material = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: {
      terrainGrid: { value: input }, terrainSeed: { value: seed >>> 0 },
      terrainSize: { value: n }, textureSide: { value: side },
      startA: { value: new THREE.Vector2(starts[0].x + 0.5, starts[0].y + 0.5) },
      startB: { value: new THREE.Vector2(starts[1].x + 0.5, starts[1].y + 0.5) },
    },
    vertexShader: 'in vec3 position; void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: FRAGMENT,
    depthTest: false, depthWrite: false,
  });
  const geometry = new THREE.PlaneGeometry(2, 2), scene = new THREE.Scene();
  scene.add(new THREE.Mesh(geometry, material));
  const render = () => {
    const previous = renderer.getRenderTarget(), viewport = renderer.getViewport(new THREE.Vector4());
    const scissor = renderer.getScissor(new THREE.Vector4()), scissorTest = renderer.getScissorTest();
    try {
      updateGrid();
      renderer.setRenderTarget(target); renderer.setViewport(0, 0, side, side); renderer.setScissorTest(false);
      renderer.render(scene, new THREE.Camera());
    } finally {
      renderer.setRenderTarget(previous); renderer.setViewport(viewport); renderer.setScissor(scissor); renderer.setScissorTest(scissorTest);
    }
  };
  const disposeTarget = target.dispose.bind(target);
  target.dispose = () => { input.dispose(); geometry.dispose(); material.dispose(); disposeTarget(); };
  let stamp;
  target.refresh = version => {
    if (version === stamp) return;
    render(); stamp = version;
  };
  try { render(); } catch (error) { target.dispose(); throw error; }
  return target;
}

const FRAGMENT = `
precision highp float;
precision highp int;
uniform highp sampler2D terrainGrid;
uniform uint terrainSeed;
uniform float terrainSize;
uniform float textureSide;
uniform vec2 startA;
uniform vec2 startB;
out vec4 bakedColor;
float hash(ivec2 p, uint seed) {
  uint n = uint(p.x) * 374761393u ^ uint(p.y) * 668265263u ^ seed;
  n = (n ^ (n >> 13u)) * 1274126177u;
  return float(n ^ (n >> 16u)) / 4294967295.0;
}
float noise(vec2 p, uint seed) {
  ivec2 i = ivec2(floor(p)); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i,seed),hash(i+ivec2(1,0),seed),f.x),
    mix(hash(i+ivec2(0,1),seed),hash(i+ivec2(1,1),seed),f.x),f.y);
}
vec2 cell(ivec2 p) { return texelFetch(terrainGrid, clamp(p,ivec2(0),ivec2(int(terrainSize)-1)),0).rg; }
float oreAt(ivec2 p) {
  if (any(lessThan(p,ivec2(0))) || any(greaterThanEqual(p,ivec2(int(terrainSize))))) return 0.0;
  return cell(p).r;
}
float oreWeight(vec2 p, float kind) {
  ivec2 tile = ivec2(floor(p)); vec2 f = fract(p); float d = 1.0;
  if (oreAt(tile+ivec2(-1,0)) != kind) d = min(d,f.x);
  if (oreAt(tile+ivec2(1,0)) != kind) d = min(d,1.0-f.x);
  if (oreAt(tile+ivec2(0,-1)) != kind) d = min(d,f.y);
  if (oreAt(tile+ivec2(0,1)) != kind) d = min(d,1.0-f.y);
  if (oreAt(tile+ivec2(-1,-1)) != kind) d = min(d,length(f));
  if (oreAt(tile+ivec2(1,-1)) != kind) d = min(d,length(vec2(1.0-f.x,f.y)));
  if (oreAt(tile+ivec2(-1,1)) != kind) d = min(d,length(vec2(f.x,1.0-f.y)));
  if (oreAt(tile+ivec2(1,1)) != kind) d = min(d,length(1.0-f));
  return clamp((d+(noise(p*3.1,terrainSeed+57u)-0.5)*0.2)/0.25,0.0,1.0);
}
vec3 oreColor(vec2 p, ivec2 pixel, float kind) {
  float rough = noise(p*1.7,terrainSeed+41u), fine = noise(p*6.0,terrainSeed+43u)-0.5;
  if (kind == 2.0) {
    if (hash(pixel >> 1,terrainSeed+71u) > 0.965 && fine > -0.1) return vec3(224.0,186.0,66.0);
    return vec3(114.0,102.0,82.0)+rough*vec3(28.0,24.0,16.0)+fine*vec3(22.0,20.0,14.0);
  }
  float crack = abs(noise(p*2.3,terrainSeed+83u)-0.5) < 0.022 ? 0.62 : 1.0;
  return (vec3(124.0,122.0,116.0)+rough*vec3(26.0,25.0,22.0)+fine*vec3(20.0,20.0,18.0))*crack;
}
float shoreAt(vec2 p) {
  vec2 q = p - 0.5; ivec2 i = ivec2(floor(q)); vec2 f = fract(q);
  return mix(mix(cell(i).g,cell(i+ivec2(1,0)).g,f.x),
    mix(cell(i+ivec2(0,1)).g,cell(i+ivec2(1,1)).g,f.x),f.y);
}
vec3 linearColor(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
}
void main() {
  // CanvasTexture flipped the original image vertically. Match that world orientation
  // and the old integer pixel coordinates, including the half-pixel offset.
  vec2 pixel = vec2(gl_FragCoord.x - 0.5, textureSide - gl_FragCoord.y - 0.5);
  vec2 p = pixel * terrainSize / textureSide;
  float broad = noise(p * 0.22, terrainSeed), detail = noise(p * 2.7, terrainSeed + 9u);
  float grain = hash(ivec2(pixel), terrainSeed + 31u) - 0.5;
  float shore = shoreAt(p); vec3 color;
  float kind = cell(ivec2(floor(p))).r;
  if (kind == 1.0) {
    float shallow = max(0.0,1.0-shore/4.0);
    color = vec3(28.0,68.0,74.0) + shallow * vec3(28.0,38.0,34.0);
  } else {
    float earth = max(0.0,(broad-0.52)*2.2);
    earth = max(earth,max(0.0,1.0-distance(p,startA)/5.0)*0.85);
    earth = max(earth,max(0.0,1.0-distance(p,startB)/5.0)*0.85);
    float sand = max(0.0,1.0-shore/2.0)*0.7;
    color = mix(vec3(83.0,94.0,47.0)+broad*vec3(30.0,30.0,16.0),vec3(141.0,119.0,80.0),earth);
    color = mix(color,vec3(166.0,150.0,106.0),sand);
    if (kind >= 2.0) color = mix(color,oreColor(p,ivec2(pixel),kind),oreWeight(p,kind));
  }
  color = clamp(color+(detail-0.5)*17.0+grain*13.0,0.0,255.0);
  // The sRGB render attachment encodes linear output. Subsequent terrain sampling
  // therefore has exactly the same color-space contract as the old canvas texture.
  bakedColor = vec4(linearColor(color/255.0),1.0);
}
`;
