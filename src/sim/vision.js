import { centerOf } from './util.js';
// Half-width of each row of a filled disc of radius r (the tiles with dx*dx + dy*dy <= r*r), cached per radius.
const discs = new Map();
function disc(radius) {
  let halfWidths = discs.get(radius);
  if (!halfWidths) {
    halfWidths = new Int32Array(2 * radius + 1);
    for (let dy = -radius; dy <= radius; dy++) halfWidths[dy + radius] = Math.floor(Math.sqrt(radius * radius - dy * dy));
    discs.set(radius, halfWidths);
  }
  return halfWidths;
}

export function updateVision(game) {
  const n = game.map.size;
  for (const player of game.players) player.visible.fill(0);
  for (const list of [game.units, game.buildings]) for (const entity of list.values()) {
    if (entity.aboard) continue; // a transport's hold sees nothing; the ship has its own sight
    revealAround(game, entity, n);
  }
  for (const player of game.players) markExplored(player.visible, player.explored);
}

// Mark the disc of tiles in sight of `entity` visible to its owner. A building's sight counts from its edge, not its centre.
function revealAround(game, entity, n) {
  const visible = game.players[entity.owner].visible, center = centerOf(entity);
  const radius = Math.ceil(entity.sight + (entity.size ? entity.size / 2 : 0)), halfWidths = disc(radius);
  const cx = Math.floor(center.x), cy = Math.floor(center.y);
  for (let dy = -radius; dy <= radius; dy++) {
    const y = cy + dy;
    if (y < 0 || y >= n) continue;
    const halfWidth = halfWidths[dy + radius], lastX = Math.min(n - 1, cx + halfWidth), row = y * n;
    for (let x = Math.max(0, cx - halfWidth); x <= lastX; x++) visible[row + x] = 1;
  }
}

// Whatever is visible now stays explored for good.
function markExplored(visible, explored) {
  for (let i = 0; i < visible.length; i++) explored[i] |= visible[i];
}

export function visibleTo(game, pid, x, y) {
  const n = game.map.size, player = game.players[pid], i = Math.floor(y) * n + Math.floor(x);
  return player.visible[i] ? 'visible' : player.explored[i] ? 'explored' : 'hidden';
}
