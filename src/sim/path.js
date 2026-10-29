import { passable } from './util.js';

// Binary min-heap of search nodes { tile, f } ordered by f (cost so far plus estimate).
class Heap {
  constructor() { this.nodes = []; }
  get size() { return this.nodes.length; }
  push(node) {
    const nodes = this.nodes;
    nodes.push(node);
    let i = nodes.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (nodes[parent].f <= nodes[i].f) break;
      swap(nodes, parent, i);
      i = parent;
    }
  }
  pop() {
    const nodes = this.nodes, top = nodes[0], last = nodes.pop();
    if (nodes.length) {
      nodes[0] = last;
      this.siftDown();
    }
    return top;
  }
  siftDown() {
    const nodes = this.nodes;
    let i = 0;
    for (;;) {
      const left = 2 * i + 1, right = left + 1;
      let smallest = i;
      if (left < nodes.length && nodes[left].f < nodes[smallest].f) smallest = left;
      if (right < nodes.length && nodes[right].f < nodes[smallest].f) smallest = right;
      if (smallest === i) break;
      swap(nodes, smallest, i);
      i = smallest;
    }
  }
}
function swap(nodes, i, j) {
  const held = nodes[i];
  nodes[i] = nodes[j];
  nodes[j] = held;
}

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
// Search state is reused between calls; a slot belongs to the current search only when its stamp equals gen.
let searchState = null;
function buffers(n) {
  if (!searchState || searchState.n !== n) {
    const tiles = n * n;
    searchState = {
      n, gen: 0,
      seen: new Uint32Array(tiles), closed: new Uint32Array(tiles), cost: new Float32Array(tiles), prev: new Int32Array(tiles),
    };
  }
  if (++searchState.gen === 0xffffffff) {
    searchState.seen.fill(0);
    searchState.closed.fill(0);
    searchState.gen = 1;
  }
  return searchState;
}

// Octile distance to `to`: the cost of the cheapest 8-neighbour walk there over open ground.
function estimate(x, y, to) {
  const dx = Math.abs(x - to.x), dy = Math.abs(y - to.y);
  return Math.max(dx, dy) + 0.414 * Math.min(dx, dy);
}

// The tiles from just after `start` to `end`, following the `prev` links back.
function tracePath(prev, start, end, n) {
  const out = [];
  for (let tile = end; tile !== start; tile = prev[tile]) out.push({ x: tile % n, y: (tile / n) | 0 });
  return out.reverse();
}

// A* on a tile grid. 8-neighbour, no corner cutting. Returns tiles after `from` up to the goal,
// [] if already there, null if unreachable. isGoal lets callers stop next to a blocked target. naval: search the water
// (deep water and shallows) instead of the land.
export function findPath(map, blocked, from, to, isGoal, naval = false) {
  const n = map.size;
  const goal = isGoal || ((x, y) => x === to.x && y === to.y);
  if (goal(from.x, from.y)) return [];
  const free = (x, y) => x >= 0 && y >= 0 && x < n && y < n && passable(map.tiles[y * n + x], naval) && !blocked(x, y);
  if (!isGoal && !free(to.x, to.y)) return null;
  const { gen, seen, closed, cost, prev } = buffers(n);
  const open = new Heap(), start = from.y * n + from.x;
  cost[start] = 0;
  seen[start] = gen;
  open.push({ tile: start, f: estimate(from.x, from.y, to) });
  // A search may cover the whole map: it counts the tiles it expands, not the stale heap entries it skips (open sea makes
  // many), so a reachable goal is always found.
  let expanded = 0;
  const maxExpand = Math.max(6000, n * n);
  while (open.size && expanded < maxExpand) {
    const current = open.pop().tile;
    if (closed[current] === gen) continue;
    closed[current] = gen;
    expanded++;
    const x = current % n, y = (current / n) | 0;
    if (goal(x, y)) return tracePath(prev, start, current, n);
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (!free(nx, ny)) continue;
      if (dx && dy && (!free(x + dx, y) || !free(x, y + dy))) continue;
      const next = ny * n + nx, nextCost = cost[current] + (dx && dy ? 1.414 : 1);
      if (seen[next] !== gen || nextCost < cost[next]) {
        cost[next] = nextCost;
        seen[next] = gen;
        prev[next] = current;
        open.push({ tile: next, f: nextCost + estimate(nx, ny, to) });
      }
    }
  }
  return null;
}
