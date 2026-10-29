export const DT = 0.05, TPS = 20;
export const secs = seconds => Math.max(1, Math.round(seconds * TPS));
// An entity's footprint in tiles, [x0, x1) x [y0, y1): a building's square, a resource's tile, a unit's own point.
export function rectOf(entity) {
  if (entity.kind === 'building') return { x0: entity.x, y0: entity.y, x1: entity.x + entity.size, y1: entity.y + entity.size };
  if (entity.kind === 'resource') {
    const x = Math.floor(entity.x), y = Math.floor(entity.y);
    return { x0: x, y0: y, x1: x + 1, y1: y + 1 };
  }
  return { x0: entity.x, y0: entity.y, x1: entity.x, y1: entity.y };
}
// Distance from point (px, py) to the nearest point of the entity's footprint (0 inside it).
export function distPoint(px, py, entity) {
  const rect = rectOf(entity);
  return Math.hypot(Math.max(rect.x0 - px, 0, px - rect.x1), Math.max(rect.y0 - py, 0, py - rect.y1));
}
export function centerOf(entity) {
  const rect = rectOf(entity);
  return { x: (rect.x0 + rect.x1) / 2, y: (rect.y0 + rect.y1) / 2 };
}
export const tileOf = entity => {
  const centre = centerOf(entity);
  return { x: Math.floor(centre.x), y: Math.floor(centre.y) };
};
export const RES_KIND = { tree: 'wood', berry: 'food', gold: 'gold', stone: 'stone', fish: 'food' };
// Map tiles: 0 land, 1 deep water, 2 gold vein, 3 quarry, 4 shallows. Soldiers walk every tile but deep water; ships
// (a unit with `naval`) sail deep water and shallows only.
export const WATER = 1, SHALLOWS = 4;
export const passable = (tile, naval) => naval ? tile === WATER || tile === SHALLOWS : tile !== WATER;
// The tiles of a wall dragged from tile a to tile b, snapped to a straight line: horizontal if |dx| > 2|dy|, vertical if
// |dy| > 2|dx|, else a 45-degree diagonal of length max(|dx|, |dy|) (so it may end beside b, not on it). Runs from a,
// includes both ends, and keeps at most the first 64 tiles.
export function lineTiles(a, b) {
  const ax = Math.floor(a.x), ay = Math.floor(a.y);
  const { stepX, stepY, length } = snapLine(Math.floor(b.x) - ax, Math.floor(b.y) - ay);
  const out = [];
  for (let k = 0; k <= length && out.length < 64; k++) out.push({ x: ax + k * stepX, y: ay + k * stepY });
  return out;
}
// The step per tile and the length (in steps) of the snapped line for a drag of (dx, dy) tiles.
function snapLine(dx, dy) {
  const adx = Math.abs(dx), ady = Math.abs(dy);
  if (adx > 2 * ady) return { stepX: Math.sign(dx), stepY: 0, length: adx };
  if (ady > 2 * adx) return { stepX: 0, stepY: Math.sign(dy), length: ady };
  return { stepX: Math.sign(dx), stepY: Math.sign(dy), length: Math.max(adx, ady) };
}
