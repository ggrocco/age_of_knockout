// Camera half-height in world units for a zoom level and canvas size (CSS px). Landscape keeps the height fixed, so
// a wide window would just show more empty map with small objects; on big screens the width is capped instead
// (at most FIT_ASPECT × the height), easing in between SMALL_W and BIG_W so phones and small windows are unchanged.
const FIT_ASPECT = 1.2, SMALL_W = 1000, BIG_W = 1600;
export function viewHalfHeight(zoom, width, height) {
  const w = Math.max(1, width), aspect = w / Math.max(1, height);
  if (aspect < 1) return zoom * 1.2 / aspect; // portrait: fit the width instead
  const bigness = Math.min(1, Math.max(0, (w - SMALL_W) / (BIG_W - SMALL_W))); // 0 up to SMALL_W, 1 from BIG_W
  return zoom * (1 - bigness * (1 - Math.min(1, FIT_ASPECT / aspect)));
}
