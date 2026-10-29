// Headless bot-vs-bot match runner. Used by the test harness and for off-screen bracket matches.
import { createGame } from '../sim/game.js';
import { createBot, matchOptions, THINK_EVERY as thinkEvery } from '../ai/bot.js';
import { roundById } from '../rounds/index.js';
import { popLimit } from '../data/ages.js';

// opts.mapType: 'rivers' (default) or 'islands'; opts.limit: stop after this many ticks; opts.keepGame: return the game too.
export function simulateMatch(roundId, seed, diffs = ['medium', 'medium'], opts = {}) {
  const rules = roundById(roundId), game = createGame({ seed, rules, mapType: opts.mapType, ...matchOptions(diffs) });
  const bots = [createBot(game, 0, diffs[0]), createBot(game, 1, diffs[1])];
  const out = { ended: false, winner: null, reason: null, ticks: 0, errors: [], maxRejects: 0, cap: game.capTicks };
  try {
    play(game, bots, diffs, opts.limit || game.capTicks + 50, out.errors);
  } catch (error) {
    out.errors.push('exception: ' + (error.stack || error).toString().split('\n').slice(0, 3).join(' | '));
  }
  out.ticks = game.time;
  out.ended = !!game.result;
  out.winner = game.result?.winner ?? null;
  out.reason = game.result?.reason ?? null;
  out.maxRejects = Math.max(...bots.map(bot => bot.maxRejects));
  out.scores = game.result?.scores;
  out.final = game.players.map(({ age, pop, kills, bdestroyed }) => ({ age, pop, kills, bdestroyed }));
  out.game = opts.keepGame ? game : undefined;
  return out;
}

// Ticks until the match ends or reaches `limit`, each bot thinking on its own cadence (player 1 three ticks behind);
// checks the invariants every second and gives up after more than 5 errors.
function play(game, bots, diffs, limit, errors) {
  while (!game.result && game.time < limit) {
    game.tick();
    for (let i = 0; i < 2; i++) if (game.time % thinkEvery[diffs[i]] === (i * 3) % thinkEvery[diffs[i]]) bots[i].think();
    if (game.time % 20 === 0) checkInvariants(game, errors);
    if (errors.length > 5) break;
  }
}

function checkInvariants(game, errors) {
  for (const player of game.players) {
    for (const [kind, amount] of Object.entries(player.res)) {
      if (!Number.isFinite(amount)) errors.push(`NaN resource ${kind} at ${game.time}`);
      else if (amount < -1e-6) errors.push(`negative ${kind}=${amount} at ${game.time}`);
    }
    if (player.pop > popLimit(player.age)) errors.push(`pop ${player.pop} > ${popLimit(player.age)} at ${game.time}`);
  }
  for (const unit of game.units.values()) {
    if (Number.isFinite(unit.x) && Number.isFinite(unit.y) && Number.isFinite(unit.hp)) continue;
    errors.push(`bad unit ${unit.type}#${unit.id} at ${game.time}`);
    break;
  }
}
