# Apple Silicon CPU/GPU audit

Measured October 21, 2026, at commit `c836525`. Analysis only; game code and graphics defaults were not changed.

The game already uses the Apple GPU through WebGL/ANGLE/Metal. The first optimization should be to stop repeating unchanged scene work on the CPU. Cosmetic animation and procedural terrain generation are good GPU candidates after that. Moving the deterministic simulation to GPU compute is a poor fit for the current scale.

## Evidence

Hardware browser: `ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Max, Unspecified Version)`, Chromium 155 in the app browser, 1280 × 720 CSS pixels at device pixel ratio 2. Hardware rendering, `WEBGL_multi_draw`, asynchronous GPU timer queries, and `navigator.gpu` were available. High rendered at DPR 2; Balanced caps DPR at 1.5.

The controlled scene used Death Match seed 1, two Hard bots, at tick 12000: 28 units, 55 buildings, 489 remaining resources, both players in Modern. The explored-map variant synthetically marked the resource map explored to exercise the cost of retaining distant known resources. This is a stress scenario, not another naturally played match.

Each frozen-scene row measured 150 frames following 30 warm-up frames, at a 60 FPS cap. The live row measured 180 frames and also advanced simulation at 20 ticks/s, ran bot thinking, synchronized entities/fog, and drew the minimap every third frame. The harness uses the game's actual renderer and models.

| Scenario | Entity groups | CPU mean / p95, ms | GPU mean / p95, ms | Renderer calls |
| --- | ---: | ---: | ---: | ---: |
| High, naturally explored | 153 | 1.58 / 2.20 | 4.34 / 7.51 | 21 |
| Balanced, same scene | 153 | 1.33 / 1.70 | 1.78 / 3.38 | 14 |
| High, all resources known | 511 | 2.49 / 4.10 | 6.18 / 7.59 | 21 |
| High, resources known + live simulation | 512 | 2.52 / 4.90 | 6.44 / 7.84 | 21 |

CPU figures are elapsed time inside the instrumented JavaScript calls, including rendering submission. They exclude the product's DOM HUD/input, browser compositor, and other process work. GPU figures come from elapsed queries around rendering; disjoint samples were rejected. CPU and GPU overlap, so their times should not be added to derive FPS. These short samples are not OS CPU percentages or battery measurements.

In the explored frozen scene, world-matrix updates averaged **0.50 ms/frame**. Batch preparation averaged **0.33 ms/frame**, across three geometry passes: shadow, beauty, and AO normals. Batch preparation is already included in rendering-submission time, so it must not be counted twice.

A separate instrumented frame issued **552 batch matrix writes; 533 (96.6%) were byte-equivalent Float32 values**. This observation covers a frozen simulation with cosmetic animations still running; it is not a claim that the same proportion is redundant during every battle. The batch matrix texture held 64 KiB in this scene. Bandwidth alone is modest; the repeated traversal, matrix composition, validation and upload scheduling are the more useful targets.

Simulation across the first 12000 ticks averaged **0.049 ms/tick**; bot thinking averaged **0.041 ms/call**. Timer precision is coarse at this scale. This does not justify a GPU rewrite of the simulation.

Turning `BatchedMesh.sortObjects` off reduced its preparation time, but did not consistently improve total frame time across the two audit passes. Leave sorting enabled until repeated, order-controlled comparisons establish an improvement.

The view constructor took approximately **0.80 s**, before `view.sync()` created entity models. `terrain.js` creates a 2304 × 2304 texture using JavaScript loops: 5.3 million pixels, with noise, shore interpolation, square roots and temporary arrays. This is a strong startup optimization candidate, although terrain generation was not timed separately from other view initialization.

Raw results: [2026-10-21-apple-silicon.json](2026-10-21-apple-silicon.json). The local development harness is `reports/perf-audit.html`, served with `npm start` at `/reports/perf-audit.html?quality=high`. It is an ignored diagnostic artifact, not included in the nginx image. An invalid standalone minimap fog-rebuild sample was discarded; its tick-stamp alignment was corrected in the local harness after the recorded run.

## Recommended implementation order

### 1. Keep static data on the GPU and update only dirty entities

Targets: `src/render/view.js:183`, `src/render/batch.js:47`, `src/render/models.js:304`.

`view.frame()` visits every known group, including distant stationary resources, calls `animate()`, updates the full scene hierarchy, writes every shown part into the batch, and rebuilds every contact-shadow matrix. Being on the unrendered proxy layer does not remove objects from scene-matrix traversal. Frustum culling happens later, when the batch prepares a render pass.

Classify static resource transforms separately from moving units and animated building parts. Update resource scale only when its amount changes. Mark construction, age changes, damage pops, visibility and selection changes dirty. Keep stationary body and blob matrices resident; avoid both CPU traversal and uploads when nothing changed. Chunk static scenery spatially so camera culling need not inspect every tree part on every pass. Retain correct proxy transforms for picking and include objects that can cast shadows into the visible area.

A static/dynamic batch split may add a few submissions while eliminating repeated work. The current 21-call sample suggests there is room to test this tradeoff. Validate it rather than enforcing a one-batch rule. With a shared matrix texture, skipping unchanged setters alone still leaves a full texture update whenever any animated part changes; separate static storage or suitable partial updates matter.

This is the best-supported first step. No percentage speedup is claimed before implementation.

### 2. Move cosmetic animation into vertex shaders

Targets: `src/render/models.js:304`, `src/render/materials.js`, `src/render/batch.js`.

Start with flags, smoke, building spinners/floaters, drone rotors and bobbing. Upload phase, speed, pivot and animation-state parameters; let the GPU evaluate motion from a time uniform. Later, evaluate unit limb animation and visual interpolation from previous/current simulation poses uploaded at 20 Hz.

Keep health, attacks, movement decisions and authoritative positions in the deterministic CPU simulation. Apply identical deformation to beauty, shadow and AO normal/depth passes. Expand culling bounds for moving parts and preserve useful picking proxies. A shader that only animates the beauty pass produces incorrect shadows/AO.

Grass wind and water effects are already shader-driven. They provide an existing pattern, but moving those effects to the GPU again would not save CPU time.

### 3. Generate the terrain texture in a GPU render pass once per map

Target: `src/render/terrain.js:20`.

Upload the small terrain/shore/start-position inputs and render the procedural surface into a texture. Reuse it for the match. Baking once avoids adding expensive procedural noise to every later terrain fragment. This can remove a large JavaScript pixel-generation loop; measure startup time and visual agreement separately.

A Worker/OffscreenCanvas version is an alternative if exact current pixels matter. It moves the stall off the main thread but does not inherently reduce total CPU work.

### 4. Reduce work during pause and infrequent UI updates

Targets: `src/main.js:81`, `src/ui/hud.js:78`, `src/render/minimap.js:13`, `src/render/lighting.js:24`.

Pause/result screens still render at 30 FPS and perform model, blob-shadow and HUD work. Consider rendering on state/camera changes, or a slower decorative-animation cadence. Update HUD values on simulation/UI changes rather than rebuilding candidate HTML on every frame. Cache the AO exclusion list rather than traversing all proxies every AO pass.

Minimap fog uses up to 9216 Canvas2D rectangles per refresh. Reusing the existing visibility texture in a minimap shader is possible, but measure this path first. Use the existing renderer and avoid GPU-to-CPU pixel readback; creating another renderer or reading back pixels can erase the saving. The audit does not establish minimap fog as a leading bottleneck.

### 5. Use Workers for simulation stalls, not as a claim of lower CPU consumption

Target: `src/tournament/bracket.js:32`.

`resolveAsync()` yields between matches; each off-screen match still runs synchronously on the main thread. A Worker can prevent individual matches from freezing the UI. It performs essentially the same CPU work. Spatial indexing for aggro/tower target searches is a better CPU optimization if larger armies make those scans significant. The ledger already records the Worker and aggro gaps.

## WebGPU decision

WebGPU is available on the measured M2 Max, but the current WebGL path already reaches Metal. A renderer-name change does not move JavaScript scene traversal or the simulation to the GPU.

A migration must replace the `onBeforeCompile` customizations in `materials.js`, `grass.js` and `terrain.js` with node materials/TSL, and replace `EffectComposer`/`SSAOPass` in `lighting.js` with the WebGPU postprocessing stack. It also needs asynchronous renderer initialization, import-map/deployment checks, and gallery/browser parity. Three.js explicitly documents these incompatibilities and notes that WebGL can still perform better for some applications. [Three.js migration guide](https://threejs.org/manual/pages/webgpurenderer).

After steps 1–3, a small WebGPU prototype could test GPU-generated animation transforms, culling/compaction and indirect rendering as entity counts grow. Keep intermediate results on the GPU. Sending a small irregular A* or combat job to compute and immediately reading its answer back creates synchronization costs and complicates deterministic headless execution. Apple documents CPU/GPU overlap and resource dependencies as central performance concerns. [Apple CPU/GPU synchronization](https://developer.apple.com/documentation/metal/synchronizing-cpu-and-gpu-work).

For immediate lower rendering cost, the existing Balanced preset already reduced measured GPU time from 4.34 to 1.78 ms in the natural scene. That trades visual quality for lower work and is separate from CPU-to-GPU offloading.

## Validation and limits

- `npm test`: 257/257 passed.
- Actual game screenshot inspected in the hardware browser: Death Match ran, models/terrain/fog/HUD rendered correctly.
- Hardware audit completed; GPU error state was zero and browser warnings/errors were empty.
- The headless browse attempt could not create WebGL; it was not used for timing conclusions.
- Not measured: Safari, other Apple chips, maximum-population battles, prolonged thermals, battery draw, full product HUD/layout/compositor CPU, or performance after implementing any recommendation. The current samples are comfortably inside a 16.67 ms frame interval; they establish optimization opportunities, not a universal CPU/GPU bottleneck diagnosis.
