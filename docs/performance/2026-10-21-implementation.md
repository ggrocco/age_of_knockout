# CPU/GPU implementation and validation

This implements the first CPU/GPU recommendations from the [original audit](2026-10-21-apple-silicon.md). The simulation still runs deterministically on the CPU at 20 ticks/s, and rendering still uses WebGL/Metal.

## Result on Apple M2 Max

Before rebasing onto `781fffa` (the new ore-patch/Mine and pause changes), a controlled original/current/current/original comparison used the same High-preset Death Match snapshot, with 511 known entity groups, 1280 × 720 CSS pixels at DPR 2, a 60 FPS cap, 60 warm-up frames and 180 timed frames per run. Both renderers submitted the same 21 calls and 1,149,458 triangles per frame.

| Metric | Original average | New average | Change |
| --- | ---: | ---: | ---: |
| CPU time inside rendering | 2.65 ms/frame | 1.77 ms/frame | 33% lower |
| View constructor CPU elapsed time | 914 ms | 52 ms | 94% lower |
| GPU elapsed rendering time | 5.88 ms/frame | 6.68 ms/frame | 14% higher |

GPU measurements varied across runs; these results support a CPU reduction, not a GPU speedup or a battery-life claim. The measured GPU times stayed within the 16.67 ms frame interval. CPU and GPU overlap, so their times must not be added to derive FPS. View-constructor timing excludes subsequent entity-model creation and is not full-page load time.

These timing samples used the pre-rebase map/simulation snapshot based on `c836525`; current seed 1 has different resources and does not recreate the 511-group scene. They are historical measurements of the optimizations, not timings of the rebased build. The earlier standalone audit and this controlled comparison had different timing conditions. The controlled comparison is the basis for the before/after claims above. [Recorded samples](2026-10-21-implementation.json).

## Changes

- **Resident transforms:** `batch.js` only writes matrices that changed. Its Three r186 storage adapter aggregates partial texture uploads by row and uploads the complete texture after allocation or capacity growth. Geometry wrappers add batch-only attributes without modifying the shared/pinned model geometry. Sorting and per-instance culling remain enabled.
- **Stationary resources:** resource proxies stay available for picking, but are outside the scene hierarchy. Depletion updates their scale and batch matrices during synchronization. Commands force synchronization, including deletion while paused.
- **Building transforms:** stable building hierarchies skip world-matrix recomputation between simulation/selection changes. Construction, damage pops, firing, selection rings and HP bars continue updating.
- **Contact shadows:** stable instance slots cache stationary matrices, with partial buffer updates and one-slot compaction on removal. Capacity growth preserves existing shadows.
- **GPU cosmetics:** building flags, spinners, floaters and smoke, plus drone bobbing and rotors, use per-part parameters and a time uniform. The same matrix deformation runs in beauty, shadow and AO normal passes, with conservative animated culling bounds. The gallery retains CPU animation. Unit limbs, movement interpolation, combat poses and working Mine wheels/carts remain on the CPU.
- **Terrain baking:** a GPU render pass at startup and after ore-patch changes replaces the 5.3-million-pixel JavaScript texture loop. The small terrain/shore grid remains CPU-generated. Seeded hash/noise, shoreline orientation, starting clearings, gold/quarry colors and edge fades, sRGB handling, mipmaps and anisotropy are preserved. No texture readback occurs during production rendering.
- **Update scheduling:** paused/result redraws run at 10 FPS; paused animation time stays frozen; camera, selection and placement changes can trigger the next active frame. HUD work is skipped when simulation/UI state is unchanged. Static minimap draws and AO exclusion traversal are cached. HUD caches release their game reference on teardown.
- **Tournament Worker:** off-screen matches run through the existing headless runner in a module Worker. Each bracket round reuses one Worker and terminates it afterward. Request correlation, error handling, cancellation and asynchronous bracket outcomes have tests. Unsupported Worker construction falls back to the synchronous runner. This improves responsiveness rather than claiming lower total simulation CPU work.

`README.md` and `AGENTS.md` describe the updated idle-render behavior and architecture. Jenkins smoke checks include the Worker and new renderer modules, including the deployed `/eof` Worker path. Existing Docker `COPY src` lines already include them. No dependencies, import-map changes, simulation rules, stats, quality-preset defaults or kept-building fixture changes were needed.

## Original verification before rebase

- `npm test`: **264/264 passed**, including seven new cache/Worker tests and unchanged kept-building hashes.
- `node test/bot-sim.js 12`: **60/60 matches ended cleanly**, maximum rejected commands zero. Existing time-cap behavior is unchanged.
- Hardware shader comparison: an Industrial/Future scene containing flags, smoke, rotating/floating machinery and drones was rendered with GPU cosmetics and with the CPU reference. Mean channel difference was **0.017/255**; **0.028%** of channels differed by more than 8/255, mostly at rasterized edges. Screenshots inspected.
- GPU terrain bake compared against the old CPU formula on an asymmetric test map: maximum channel difference **1/255**, mean **0.027/255**. The asymmetry also checks vertical orientation.
- Balanced → Ultra → High retained correct rendering, GL error zero and stable High texture count after switching back.
- Desktop and forced-touch 402 × 874 / 874 × 402 checks passed: 6 decorative frames in 600 ms while paused, fixed simulation clock, immediate camera/selection updates, detached-resource picking, depletion refresh, dispatched touch taps, deletion Cancel/confirm while paused, and resuming simulation.
- A five-round browser tournament reached Champion with the human outcomes forced for flow testing; all remaining bracket matches ran normally, using four module Workers.
- Standalone game, shader and comparison pages had no console warnings/errors and GL error zero. The iframe automation harness logged a `MutationObserver.observe` error while replacing documents. Neither game nor harness code uses MutationObserver, and standalone checks were clean; this appears to come from browser instrumentation.

A reusable hardware diagnostic is checked in at `test/tools/render-audit.html`; run `npm start`, then open `/test/tools/render-audit.html?quality=high`. It preserves the saved graphics preference. The one-off parity, original-source comparison and UI-flow harnesses remain under ignored `reports/`.

Not verified: Safari, physical touch devices, maximum-population battles, long thermal runs, OS-level CPU/energy use, or the Docker/Jenkins pipeline. WebGPU migration, GPU unit-limb animation/interpolation, spatial chunking and a shader minimap remain possible later work; this change does not assume they will improve the current profile.

## Verification after rebase onto `781fffa`

The rebase preserves current camera-fit/zoom, pause/resume, ore patches and Mine behavior. Ore changes upload the small simulation grid and repaint the texture on the GPU; the old per-pixel CPU repaint path is removed. The initial bake is reused until terrainVersion changes. Working Mines bypass the stationary-building cache.

- `npm test`: **290/290 passed**, including eight new cache/Worker tests and unchanged kept-building hashes.
- `node test/bot-sim.js 12`: **60/60 matches ended cleanly**, maximum rejected commands zero.
- Hardware gold/quarry comparison against current main's CPU formula, including a live tile change: maximum **1/255** channel difference, mean **0.026/255** initially and **0.027/255** after refresh; GL error zero.
- Industrial/Future shader comparison and Balanced → Ultra → High switching passed again; standalone console warnings/errors were empty.
- Pause-modal/settings visibility and Esc resume passed; a working Mine kept animating between simulation ticks.
- Desktop and forced-touch portrait/landscape flows passed again, including frozen pause animation time, 10 FPS redraws, immediate camera/selection, resource picking/depletion, deletion and resume. A forced-win five-round tournament reached Champion with four module Workers. The iframe-navigation instrumentation error recurred; standalone shader pages remained clean.

The pre-rebase timings above were not repeated against the new ore map and larger population limits. Safari, physical phones, maximum armies, energy and Docker/Jenkins remain unverified.
