import { secs } from './util.js';
// Fish never run out: a fished-out shoal comes back full on its own tile FISH_RETURN after it was emptied. No RNG and no
// new spots, so the map's symmetry and every Dock's fishing grounds stay as generated.
export const FISH_AMOUNT = 300, FISH_RETURN = secs(120);
const RETRY = secs(1);

// game.depleted calls this for every resource that runs out; only shoals are restocked.
export function fishedOut(game, resource) {
  if (resource.type !== 'fish') return;
  (game.fishReturns ??= []).push({ x: resource.x, y: resource.y, at: game.time + FISH_RETURN });
}

// Restock the shoals that are due (the list is in time order). One whose tile a ship is sailing over waits for it to
// leave, so the shoal never closes on a hull.
export function updateFish(game) {
  const due = game.fishReturns;
  if (!due?.length || due[0].at > game.time || game.time % RETRY) return;
  const kept = [];
  for (const spot of due) {
    if (spot.at > game.time || !tileFree(game, spot)) kept.push(spot);
    else game.addResource({ type: 'fish', x: spot.x, y: spot.y, amount: FISH_AMOUNT });
  }
  game.fishReturns = kept;
}

function tileFree(game, spot) {
  const x = Math.floor(spot.x), y = Math.floor(spot.y);
  if (game.occAt(x, y) !== 0) return false;
  for (const unit of game.units.values()) {
    if (!unit.dead && !unit.aboard && Math.floor(unit.x) === x && Math.floor(unit.y) === y) return false;
  }
  return true;
}
