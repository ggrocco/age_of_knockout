import { centerOf } from './util.js';
// Half-width of each row of a filled disc of radius r (the tiles with dx*dx + dy*dy <= r*r), cached per radius.
const discs = new Map();
function disc(r) {
  let d = discs.get(r);
  if (!d) { d = new Int32Array(2 * r + 1); for (let dy = -r; dy <= r; dy++) d[dy + r] = Math.floor(Math.sqrt(r * r - dy * dy)); discs.set(r, d); }
  return d;
}
export function updateVision(game) {
  const n = game.map.size;
  for (const p of game.players) p.visible.fill(0);
  for (const list of [game.units, game.buildings]) for (const e of list.values()) {
    if (e.aboard) continue; // a transport's hold sees nothing; the ship has its own sight
    const vis = game.players[e.owner].visible, c = centerOf(e), r = Math.ceil(e.sight + (e.size ? e.size / 2 : 0)), d = disc(r);
    const cx = Math.floor(c.x), cy = Math.floor(c.y);
    for (let dy = -r; dy <= r; dy++) {
      const y = cy + dy; if (y < 0 || y >= n) continue;
      const x1 = Math.min(n - 1, cx + d[dy + r]), row = y * n;
      for (let x = Math.max(0, cx - d[dy + r]); x <= x1; x++) vis[row + x] = 1;
    }
  }
  for (const p of game.players) { const vis = p.visible, ex = p.explored; for (let i = 0; i < vis.length; i++) ex[i] |= vis[i]; }
}
export function visibleTo(game, pid, x, y) {
  const n = game.map.size, p = game.players[pid], i = Math.floor(y) * n + Math.floor(x);
  return p.visible[i] ? 'visible' : p.explored[i] ? 'explored' : 'hidden';
}
