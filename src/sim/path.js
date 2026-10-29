// A* on a tile grid. 8-neighbour, no corner cutting. Returns tiles after `from` up to the goal,
// [] if already there, null if unreachable. isGoal lets callers stop next to a blocked target. naval: search the water
// (deep water and shallows) instead of the land.
import { passable } from './util.js';
class Heap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(n) { const a = this.a; a.push(n); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p].f <= a[i].f) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < a.length && a[l].f < a[m].f) m = l; if (r < a.length && a[r].f < a[m].f) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; }
}
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
// Search state is reused between calls; a slot belongs to the current search only when its stamp equals gen.
let buf = null;
function buffers(n) {
  if (!buf || buf.n !== n) buf = { n, gen: 0, seen: new Uint32Array(n * n), closed: new Uint32Array(n * n), g: new Float32Array(n * n), prev: new Int32Array(n * n) };
  if (++buf.gen === 0xffffffff) { buf.seen.fill(0); buf.closed.fill(0); buf.gen = 1; }
  return buf;
}
export function findPath(map, blocked, from, to, isGoal, naval = false) {
  const n = map.size;
  const goal = isGoal || ((x, y) => x === to.x && y === to.y);
  if (goal(from.x, from.y)) return [];
  const free = (x, y) => x >= 0 && y >= 0 && x < n && y < n && passable(map.tiles[y * n + x], naval) && !blocked(x, y);
  if (!isGoal && !free(to.x, to.y)) return null;
  const { gen, seen, closed, g, prev } = buffers(n);
  const h = (x, y) => { const dx = Math.abs(x - to.x), dy = Math.abs(y - to.y); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
  const open = new Heap(); const s = from.y * n + from.x; g[s] = 0; seen[s] = gen; open.push({ i: s, f: h(from.x, from.y) });
  // A search may cover the whole map: it counts the tiles it expands, not the stale heap entries it skips (open sea makes
  // many), so a reachable goal is always found.
  let expanded = 0; const maxExpand = Math.max(6000, n * n);
  while (open.size && expanded < maxExpand) {
    const { i } = open.pop(); if (closed[i] === gen) continue; closed[i] = gen; expanded++;
    const x = i % n, y = (i / n) | 0;
    if (goal(x, y)) { const out = []; for (let k = i; k !== s; k = prev[k]) out.push({ x: k % n, y: (k / n) | 0 }); return out.reverse(); }
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (!free(nx, ny)) continue;
      if (dx && dy && (!free(x + dx, y) || !free(x, y + dy))) continue;
      const j = ny * n + nx, ng = g[i] + (dx && dy ? 1.414 : 1);
      if (seen[j] !== gen || ng < g[j]) { g[j] = ng; seen[j] = gen; prev[j] = i; open.push({ i: j, f: ng + h(nx, ny) }); }
    }
  }
  return null;
}
