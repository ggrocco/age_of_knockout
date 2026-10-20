export const DT = 0.05, TPS = 20;
export const secs = s => Math.max(1, Math.round(s * TPS));
export function rectOf(e) {
  if (e.kind === 'building') return { x0: e.x, y0: e.y, x1: e.x + e.size, y1: e.y + e.size };
  if (e.kind === 'resource') { const x = Math.floor(e.x), y = Math.floor(e.y); return { x0: x, y0: y, x1: x + 1, y1: y + 1 }; }
  return { x0: e.x, y0: e.y, x1: e.x, y1: e.y };
}
export function distPoint(px, py, e) {
  const r = rectOf(e);
  return Math.hypot(Math.max(r.x0 - px, 0, px - r.x1), Math.max(r.y0 - py, 0, py - r.y1));
}
export function centerOf(e) { const r = rectOf(e); return { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 }; }
export const tileOf = e => { const c = centerOf(e); return { x: Math.floor(c.x), y: Math.floor(c.y) }; };
export const RES_KIND = { tree: 'wood', berry: 'food', gold: 'gold', stone: 'stone' };
// The tiles of a wall dragged from tile a to tile b, snapped to a straight line: horizontal if |dx| > 2|dy|, vertical if
// |dy| > 2|dx|, else a 45-degree diagonal of length max(|dx|, |dy|) (so it may end beside b, not on it). Runs from a,
// includes both ends, and keeps at most the first 64 tiles.
export function lineTiles(a, b) {
  const ax = Math.floor(a.x), ay = Math.floor(a.y), dx = Math.floor(b.x) - ax, dy = Math.floor(b.y) - ay, adx = Math.abs(dx), ady = Math.abs(dy);
  const [sx, sy, len] = adx > 2 * ady ? [Math.sign(dx), 0, adx] : ady > 2 * adx ? [0, Math.sign(dy), ady] : [Math.sign(dx), Math.sign(dy), Math.max(adx, ady)];
  const out = [];
  for (let k = 0; k <= len && out.length < 64; k++) out.push({ x: ax + k * sx, y: ay + k * sy });
  return out;
}
