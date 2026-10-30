import { BUILDINGS } from '../data/buildings.js';
import { setupKingdoms, checkKingdoms } from '../sim/kingdoms.js';
// Round rules. check(game) returns null or {winner, reason}. Every round has capTicks and a score tiebreak.
export const WONDER_TICKS = 3600, RELIC_TICKS = 3600;

// Score breakdown adapted from openage's AoE1 scoring (doc/reverse_engineering/scoring.md):
// military (kills, buildings razed, generalship = kills - losses), economy (resources, villagers,
// exploration), technology (techs researched), religion (relics held, AoE1's ruins/artifacts term),
// and wonders. Weights are scaled to this game's quantities. This is the single source of score, so
// the relic/wonder round cap-bonuses were removed to avoid double-counting; AoE1's flat +100 for
// "survived to game end" is omitted because at the time cap both sides are, by definition, alive.
export function scoreOf(game, pid) {
  const player = game.players[pid];
  const { units, villagers } = countUnits(game, pid), { standing, wonders } = countBuildings(game, pid);
  const relics = relicsHeld(game, pid), total = game.relics.size;
  const explored = exploredTiles(player.explored), mapTiles = player.explored.length;
  const military = player.kills + 3 * player.bdestroyed + Math.max(0, player.kills - player.losses) + units / 2;
  const economy = player.gathered / 50 + villagers + Math.floor((explored / mapTiles) * 100 / 3) + 2 * standing;
  const technology = (player.techs?.size || 0) * 2;
  const religion = relics * 10 + (total > 0 && relics === total ? 50 : 0);
  return military + economy + technology + religion + wonders * 100;
}

function countUnits(game, pid) {
  let units = 0, villagers = 0;
  for (const unit of game.units.values()) {
    if (unit.owner !== pid) continue;
    units++;
    if (unit.type === 'villager') villagers++;
  }
  return { units, villagers };
}

// standing: finished buildings that are not Farms, Mines or walls; wonders: finished Wonders.
function countBuildings(game, pid) {
  let standing = 0, wonders = 0;
  for (const building of game.buildings.values()) {
    if (building.owner !== pid || !building.constructed) continue;
    if (!building.gatherType && building.type !== 'wall') standing++;
    if (building.type === 'wonder') wonders++;
  }
  return { standing, wonders };
}

function relicsHeld(game, pid) {
  let relics = 0;
  for (const relic of game.relics.values()) if (game.relicOwner(relic) === pid) relics++;
  return relics;
}

function exploredTiles(explored) {
  let count = 0;
  for (let i = 0; i < explored.length; i++) if (explored[i]) count++;
  return count;
}

const tiebreak = (game, reason) => {
  const scores = [scoreOf(game, 0), scoreOf(game, 1)];
  return { winner: scores[1] > scores[0] ? 1 : 0, reason, scores };
};
// A side is out when it has no units and nothing that can make units (or a standing Wonder): it can never act again.
// Ships don't count (a last boat out on the water can't keep a beaten side in the game); a Dock does, as it trains them.
export const isEliminated = (game, pid) => {
  for (const unit of game.units.values()) if (unit.owner === pid && !unit.naval) return false;
  for (const building of game.buildings.values()) {
    if (building.owner !== pid || !building.constructed) continue;
    if (BUILDINGS[building.type].trains?.length || building.type === 'wonder') return false;
  }
  return true;
};
function conquest(game) {
  const out = [isEliminated(game, 0), isEliminated(game, 1)];
  if (out[0] && out[1]) return tiebreak(game, 'mutual destruction');
  if (out[0]) return { winner: 1, reason: 'conquest' };
  if (out[1]) return { winner: 0, reason: 'conquest' };
  return null;
}
// The cap is the game's (createGame defaults it to the round's capTicks; an easier opponent may lengthen it).
const capCheck = game => game.time >= game.capTicks ? tiebreak(game, 'time cap') : null;
const setAll = (game, amount) => {
  for (const player of game.players) player.res = { food: amount, wood: amount, gold: amount, stone: amount };
};

// Regicide: each side starts with a King beside its Town Center.
function spawnKings(game) {
  game.roundState = { kings: [] };
  for (const pid of game.map.starts.keys()) {
    const townCenter = [...game.buildings.values()].find(building => building.owner === pid), spot = game.findSpawn(townCenter);
    game.roundState.kings.push(game.spawnUnit('king', pid, spot.x, spot.y).id);
  }
}
function checkKings(game) {
  const dead = game.roundState.kings.map(id => !game.entities.has(id));
  if (dead[0] && dead[1]) return tiebreak(game, 'both kings fell');
  if (dead[0]) return { winner: 1, reason: 'regicide' };
  if (dead[1]) return { winner: 0, reason: 'regicide' };
  return conquest(game) || capCheck(game);
}

// Wonder Race: a side wins once it has had a finished Wonder for `need` ticks in a row.
function checkWonders(game) {
  const state = game.roundState, has = [false, false];
  for (const building of game.buildings.values()) {
    if (building.type === 'wonder' && building.constructed) has[building.owner] = true;
  }
  for (const pid of [0, 1]) state.hold[pid] = has[pid] ? state.hold[pid] + 1 : 0;
  const won = state.hold.map(ticks => ticks >= state.need);
  if (won[0] || won[1]) return won[0] && won[1] ? tiebreak(game, 'wonder') : { winner: won[0] ? 0 : 1, reason: 'wonder' };
  return conquest(game) || capCheck(game);
}

// Capture the Relics: a side wins once it has held every relic for `need` ticks in a row.
function checkRelics(game) {
  const state = game.roundState, count = [0, 0];
  for (const relic of game.relics.values()) {
    const owner = game.relicOwner(relic);
    if (owner !== null) count[owner]++;
  }
  const total = game.relics.size;
  for (const pid of [0, 1]) state.hold[pid] = count[pid] === total && total > 0 ? state.hold[pid] + 1 : 0;
  state.count = count;
  const won = state.hold.map(ticks => ticks >= state.need);
  if (won[0] || won[1]) return { winner: won[0] ? 0 : 1, reason: 'relics' };
  return conquest(game) || capCheck(game);
}

export const ROUNDS = [
  { id: 'conquest', name: 'Standard Game', desc: 'Destroy all enemy units and buildings.', capTicks: 30000,
    setup() {}, check(game) { return conquest(game) || capCheck(game); } },
  { id: 'deathmatch', name: 'Death Match', capTicks: 24000,
    desc: 'Start in the Iron Age with 20000 of every resource. Destroy the enemy.',
    // late start: Death Match is the round where the historical eras are played
    setup(game) {
      setAll(game, 20000);
      for (const player of game.players) player.age = 'iron';
    },
    check(game) { return conquest(game) || capCheck(game); } },
  { id: 'regicide', name: 'Regicide', desc: 'Kill the enemy king. Protect yours.', capTicks: 30000,
    setup: spawnKings, check: checkKings },
  { id: 'wonder', name: 'Wonder Race', desc: 'Build a Wonder (Bronze Age) and keep it standing for 3 minutes.', capTicks: 30000,
    setup(game) {
      setAll(game, 3000);
      game.roundState = { hold: [0, 0], need: WONDER_TICKS };
    },
    check: checkWonders },
  { id: 'relics', name: 'Capture the Relics', desc: 'Hold all 5 relics in your Town Center for 3 minutes.', capTicks: 30000,
    setup(game) {
      game.roundState = { hold: [0, 0], need: RELIC_TICKS };
      for (const spot of game.map.relicSpots) game.spawnRelic(spot.x, spot.y);
    },
    check: checkRelics },
];
export const KINGDOMS = {
  id: 'kingdoms', name: 'Kingdom Conquest', playerCount: 4, capTicks: 30000,
  desc: 'Face three civilizations. Slay a king to inherit their empire. Conquer everyone or hold the most territory when time expires.',
  setup: setupKingdoms, check: game => checkKingdoms(game, scoreOf),
};
export const roundById = id => id === KINGDOMS.id ? KINGDOMS : ROUNDS.find(round => round.id === id);
