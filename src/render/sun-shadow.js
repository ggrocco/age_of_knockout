// The sun's shadow: how its shadow map is framed on the view, and the soft filter High and Ultra use.
import * as THREE from 'three';

// The shadow camera's depth range (world units). The soft filter measures caster distances in it.
export const SUN_NEAR = 1, SUN_FAR = 150;
const DEPTH = SUN_FAR - SUN_NEAR;
// Penumbra width per world unit between a caster and its shadow: a sun about 3 degrees across, softer than the real one.
const SPREAD = 0.05;
// Casters further than this (world units, along the light) from their shadow stop widening it.
const REACH = 6;
// Fixed filter radius in shadow-map texels on Balanced (three's own 5-tap filter).
const HARD_RADIUS = 2.5;
// Everything the map shows stands below this height, so the shadow map only has to cover receivers up to it.
const TOP = 6;

// The value for the light's shadow.radius. Soft: penumbra texels per unit of shadow-map depth between caster and
// receiver (always > 0). Hard: minus the fixed radius in texels (< 0), which tells the filter to use three's taps.
export function sunShadowRadius(soft, texelWorld) {
  return soft ? SPREAD * DEPTH / texelWorld : -HARD_RADIUS;
}

// Contact-hardening filter for sampler2DShadow (PCF) maps: sharp where a shadow meets its caster and wider the further
// the caster is (percentage-closer soft shadows). Blockers are found by comparing at the receiver's depth and at three
// depths in front of it, so the hardware-filtered shadow sampler does all the reads. The receiver's own depth slope is
// followed across the filter so flat ground lit at an angle does not shadow itself.
const SOFT_FILTER = /* glsl */ `
		#define SOFT_REACH ${(REACH / DEPTH).toFixed(6)}
		#define SOFT_STEPS vec4( ${[0.5, 1.5, 3.5, REACH].map(d => (d / DEPTH).toFixed(6)).join(', ')} )

		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {

			float shadow = 1.0;

			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;

			// The receiver's depth change per unit of shadow-map uv, from its screen-space slope (before any branch).
			vec3 dx = dFdx( shadowCoord.xyz ), dy = dFdy( shadowCoord.xyz );
			float det = dx.x * dy.y - dx.y * dy.x;
			vec2 slope = abs( det ) > 1e-12 ? vec2( dy.y * dx.z - dx.y * dy.z, dx.x * dy.z - dy.x * dx.z ) / det : vec2( 0.0 );

			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;

			if ( frustumTest ) {

				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;

				if ( shadowRadius <= 0.0 ) {

					float radius = - shadowRadius * texelSize.x;
					shadow = (
						texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
						texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
						texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
						texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
						texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
					) * 0.2;

				} else {

					// A plane's depth differs by at most this much across the search (a steeper slope is a silhouette edge).
					float search = max( 1.5, shadowRadius * SOFT_REACH ) * texelSize.x;
					float slopeLimit = 2.0 * SOFT_STEPS.x;

					// Blocker search: how much of the disk is shadowed at all (the centre too, so thin shadows are not missed).
					float blocked = 1.0 - texture( shadowMap, shadowCoord.xyz );
					for ( int i = 0; i < 8; i ++ ) {
						vec2 offset = vogelDiskSample( i, 8, phi ) * search;
						float z = shadowCoord.z + clamp( dot( offset, slope ), - slopeLimit, slopeLimit );
						blocked += 1.0 - texture( shadowMap, vec3( shadowCoord.xy + offset, z ) );
					}

					if ( blocked > 8.99 ) shadow = 0.0;
					else if ( blocked > 0.01 ) {

						// Share of the blockers at least each step in front of the receiver, from four of the taps.
						vec3 beyond = vec3( 0.0 );
						for ( int i = 0; i < 8; i += 2 ) {
							vec2 offset = vogelDiskSample( i, 8, phi ) * search;
							vec3 uvz = vec3( shadowCoord.xy + offset, shadowCoord.z + clamp( dot( offset, slope ), - slopeLimit, slopeLimit ) );
							beyond += vec3(
								1.0 - texture( shadowMap, uvz - vec3( 0.0, 0.0, SOFT_STEPS.x ) ),
								1.0 - texture( shadowMap, uvz - vec3( 0.0, 0.0, SOFT_STEPS.y ) ),
								1.0 - texture( shadowMap, uvz - vec3( 0.0, 0.0, SOFT_STEPS.z ) ) );
						}
						vec3 p = min( vec3( 1.0 ), beyond * 0.25 / ( blocked / 9.0 ) );
						// Mean blocker distance: the area under that share, step by step.
						float distance = 0.5 * ( SOFT_STEPS.x * ( 1.0 + p.x ) + ( SOFT_STEPS.y - SOFT_STEPS.x ) * ( p.x + p.y ) +
							( SOFT_STEPS.z - SOFT_STEPS.y ) * ( p.y + p.z ) + ( SOFT_STEPS.w - SOFT_STEPS.z ) * p.z );
						float radius = clamp( shadowRadius * distance, 2.0, shadowRadius * SOFT_REACH ) * texelSize.x;

						shadow = 0.0;
						for ( int i = 0; i < 16; i ++ ) {
							vec2 offset = vogelDiskSample( i, 16, phi ) * radius;
							float z = shadowCoord.z + clamp( dot( offset, slope ), - slopeLimit, slopeLimit );
							shadow += texture( shadowMap, vec3( shadowCoord.xy + offset, z ) );
						}
						// A blocker only one search tap grazes (a bowstring, a spear) fades out rather than speckling the ground.
						shadow = mix( 1.0, shadow / 16.0, smoothstep( 0.25, 1.5, blocked ) );

					}

				}

			}

			return mix( 1.0, shadow, shadowIntensity );

		}

	`;

const PCF_FILTER = /(\t*float getShadow\( sampler2DShadow shadowMap, vec2 shadowMapSize,[\s\S]*?)(\t*#elif defined\( SHADOWMAP_TYPE_VSM \))/;

// Swaps three's PCF getShadow in shadowmap_pars_fragment for the soft filter; throws if three's chunk has changed shape.
export function softenShadowChunk(source) {
  if (!PCF_FILTER.test(source)) throw new Error('sun-shadow: three.js shadow chunk not recognised');
  return source.replace(PCF_FILTER, (_, filter, next) => SOFT_FILTER + next);
}

// Installs the filter into three's shader chunks once, before the first shader compiles.
let installed = false;
export function installSoftShadows() {
  if (installed) return;
  THREE.ShaderChunk.shadowmap_pars_fragment = softenShadowChunk(THREE.ShaderChunk.shadowmap_pars_fragment);
  installed = true;
}

// The sun's shadow camera axes: z points from the scene to the sun, x and y span the shadow map.
function sunAxes(sunOffset) {
  const basis = new THREE.Matrix4().lookAt(sunOffset, new THREE.Vector3(), new THREE.Vector3(0, 1, 0));
  const x = new THREE.Vector3(), y = new THREE.Vector3(), z = new THREE.Vector3();
  basis.extractBasis(x, y, z);
  return { x, y, z };
}

const corner = new THREE.Vector3(), forward = new THREE.Vector3(), point = new THREE.Vector3();

// Frames the shadow camera on what the view camera shows: the ground and everything up to TOP under the screen,
// clipped to the map, plus a tile of margin. The frame is square, grows in whole tiles and moves in whole shadow-map
// texels, so shadow edges do not shimmer while the camera pans. Returns the world size of one shadow-map texel.
export function fitSunShadow(sun, camera, sunOffset, mapSize, mapResolution) {
  const axes = sun.userData.axes ??= sunAxes(sunOffset);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  const add = p => {
    const u = p.dot(axes.x), v = p.dot(axes.y), w = p.dot(axes.z);
    minX = Math.min(minX, u); maxX = Math.max(maxX, u); minY = Math.min(minY, v); maxY = Math.max(maxY, v);
    minZ = Math.min(minZ, w); maxZ = Math.max(maxZ, w);
  };
  camera.getWorldDirection(forward);
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    corner.set(sx, sy, -1).unproject(camera);
    for (const height of [0, TOP]) add(point.copy(corner).addScaledVector(forward, (height - corner.y) / forward.y));
  }
  // Never wider or deeper than the map itself (zoomed far out, the screen also shows the void around it).
  let mapMinX = Infinity, mapMaxX = -Infinity, mapMinY = Infinity, mapMaxY = -Infinity, mapMinZ = Infinity, mapMaxZ = -Infinity;
  for (const [x, z] of [[0, 0], [mapSize, 0], [0, mapSize], [mapSize, mapSize]]) for (const height of [0, TOP]) {
    point.set(x, height, z);
    const u = point.dot(axes.x), v = point.dot(axes.y), w = point.dot(axes.z);
    mapMinX = Math.min(mapMinX, u); mapMaxX = Math.max(mapMaxX, u); mapMinY = Math.min(mapMinY, v); mapMaxY = Math.max(mapMaxY, v);
    mapMinZ = Math.min(mapMinZ, w); mapMaxZ = Math.max(mapMaxZ, w);
  }
  minX = Math.max(minX, mapMinX); maxX = Math.min(maxX, mapMaxX); minY = Math.max(minY, mapMinY); maxY = Math.min(maxY, mapMaxY);
  minZ = Math.max(minZ, mapMinZ); maxZ = Math.min(maxZ, mapMaxZ);
  const half = Math.max(2, Math.ceil(Math.max(maxX - minX, maxY - minY) / 2 + 1));
  const texel = 2 * half / mapResolution;
  const centerX = Math.round((minX + maxX) / 2 / texel) * texel, centerY = Math.round((minY + maxY) / 2 / texel) * texel;
  const shadowCamera = sun.shadow.camera;
  shadowCamera.left = shadowCamera.bottom = -half;
  shadowCamera.right = shadowCamera.top = half;
  shadowCamera.updateProjectionMatrix();
  // The sun sits over the middle of what is shown, at least its usual distance away and far enough back that the
  // nearest of it stays past the near plane (the whole map, seen from a phone held upright, is deeper than that).
  sun.target.position.copy(axes.x).multiplyScalar(centerX).addScaledVector(axes.y, centerY).addScaledVector(axes.z, (minZ + maxZ) / 2);
  const distance = Math.max(sunOffset.length(), (maxZ - minZ) / 2 + SUN_NEAR + 1);
  sun.position.copy(sun.target.position).addScaledVector(axes.z, distance);
  return texel;
}
