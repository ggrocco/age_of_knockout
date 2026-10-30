import { createGame } from './sim/game.js';
import { createBot, matchOptions, THINK_EVERY } from './ai/bot.js';
import { ROUNDS, KINGDOMS, roundById, scoreOf } from './rounds/index.js';
import { TEAMS } from './data/teams.js';
import { kingdomStandingsHtml } from './ui/kingdoms.js';
import { createTournament, LEVELS, LEVEL_NAME } from './tournament/bracket.js';
import { createAsyncSimulator } from './tournament/async-sim.js';
import { createView } from './render/view.js';
import { createMinimap } from './render/minimap.js';
import { createHud, reasonText } from './ui/hud.js';
import { createInput } from './ui/input.js';
import { BUILDINGS } from './data/buildings.js';
import { canPlace } from './sim/commands.js';
import { roundLimitText, TIME_LIMIT_RULE, NO_TIME_LIMIT_RULE } from './ui/tips.js';
import { MAX_TIME_LIMIT, readTimeLimit } from './time-limit.js';
import { MAP_TYPES, MAP_NAME, MAP_DESC, readMapType } from './map-type.js';

const params = new URLSearchParams(location.search), AUTO = params.get('autotour') === '1';
// ?seed=N replays a map; otherwise every tournament and quick match gets a fresh map and start position.
const pickSeed = () => +params.get('seed') || 1 + Math.floor(Math.random() * 100000);
const TOUCH = params.get('touch') === '1' || matchMedia('(pointer: coarse)').matches;
document.body.classList.toggle('touch', TOUCH);
const screenEl = document.getElementById('screen'), app = { tournament: null, match: null, ui: null };
window.__app = app;
let gpuWarned = false;
// Tournament difficulty level: ?level= wins, else the last pick (browser storage may be unavailable), else Normal.
const LEVEL_DESC = {
  relaxed: 'A long peaceful start: opponents work at half your speed and wait 30 minutes, and until Bronze Age, before attacking.',
  normal: 'The standard ramp, from easy to hard opponents.',
  hard: 'Tough opponents from the first round.',
};
const storedLevel = () => {
  try { return localStorage.getItem('level'); } catch { return null; }
};
let level = [params.get('level'), storedLevel()].find(name => Object.hasOwn(LEVELS, name ?? '')) || 'normal';
function setLevel(name) {
  level = name;
  try { localStorage.setItem('level', name); } catch {}
}
const savedTimeLimit = () => {
  try { return readTimeLimit(location.search, localStorage); } catch { return readTimeLimit(location.search); }
};
let timeLimit = savedTimeLimit();
function setTimeLimit(value) {
  timeLimit = Number(value);
  try { localStorage.setItem('timeLimit', String(timeLimit)); } catch {}
}
const savedMapType = () => {
  try { return readMapType(location.search, localStorage); } catch { return readMapType(location.search); }
};
let mapType = savedMapType();
function setMapType(value) {
  mapType = value;
  try { localStorage.setItem('mapType', value); } catch {}
}
const timeLimitLabel = () => {
  if (timeLimit === 0) return 'No time limit';
  if (timeLimit === 120) return '2 hours';
  return `${timeLimit} minute${timeLimit === 1 ? '' : 's'}`;
};
// Frame cap: high-refresh displays would otherwise redraw the whole scene ~120 times a second; idle screens need less.
const FRAME_MS = 1000 / (+params.get('fps') || 60), IDLE_FRAME_MS = 1000 / 10;

// On a phone a new building starts at the screen centre, moved to the nearest tile it fits on.
function centreTileForPlacing(type) {
  const rect = document.getElementById('viewport').getBoundingClientRect();
  const ground = ui.view.pickGround(rect.left + rect.width / 2, rect.top + rect.height / 2), size = BUILDINGS[type].size;
  if (!ground) return;
  const x = Math.round(ground.x - size / 2), y = Math.round(ground.y - size / 2);
  ui.placeTile = nearestPlaceableTile(type, x, y);
}
// The first tile, searching rings of growing radius (up to 13 tiles) around (x, y), where `type` can be placed;
// (x, y) itself when there is none.
function nearestPlaceableTile(type, x, y) {
  for (let ring = 0; ring < 14; ring++) {
    for (let dy = -ring; dy <= ring; dy++) {
      for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        if (canPlace(ui.game, 0, type, x + dx, y + dy)) return { x: x + dx, y: y + dy };
      }
    }
  }
  return { x, y };
}

const ui = app.ui = {
  touch: TOUCH, boxMode: false, placeTile: null, wallStart: null, wallEnd: null, game: null, view: null, minimap: null,
  sel: new Set(), inspect: null, placing: null, speed: +(params.get('speed') || 1), paused: false,
  // Every player command goes through here: a refusal is toasted, and the HUD and view refresh at once.
  cmd(command) {
    if (ui.spectating) return { ok: false, reason: 'defeated' };
    const result = ui.game.command(0, command);
    if (!result.ok) hud.toast(reasonText(result.reason));
    hud.invalidate();
    ui.view?.sync(true);
    ui.view?.invalidate();
    return result;
  },
  setSpeed(speed) { ui.speed = speed; },
  togglePause() { if (!ui.defeatOpen) ui.paused = !ui.paused; },
  startPlacing(type) {
    ui.placing = type;
    ui.wallStart = ui.wallEnd = null;
    if (type === 'wall') {
      hud.toast(ui.touch ? 'Tap where the wall starts, then where it ends, then press Place'
        : 'Drag to draw a wall. Right-click / Esc cancels. Shift keeps placing.');
    } else if (ui.touch) {
      centreTileForPlacing(type);
      hud.toast('Tap or drag to position, then press Place');
    } else hud.toast('Click to place. Right-click / Esc cancels. Shift keeps placing.');
  },
  stopPlacing() {
    ui.placing = null;
    ui.wallStart = ui.wallEnd = null;
    ui.view?.showGhost(null);
    ui.view?.showGhostLine(null);
  },
  marker(x, y) { ui.view?.marker(x, y); },
};
window.addEventListener('orientationchange', () => setTimeout(() => app.onResize?.(), 250));
const hud = createHud(ui), input = createInput(ui);
ui.toast = hud.toast;
ui.confirmDelete = hud.confirmDelete;
ui.quit = () => {
  endMatch();
  menu();
};

// Stop the render loop and free the WebGL context; a finished match otherwise keeps drawing behind menus.
function endMatch() {
  hud.cancelDelete();
  ui.paused = false;
  document.getElementById('pausemodal').classList.add('hidden');
  const match = app.match;
  if (!match) return;
  hud.reset();
  cancelAnimationFrame(match.raf);
  match.ended = true;
  app.match = null;
  if (app.onResize) {
    window.removeEventListener('resize', app.onResize);
    app.onResize = null;
  }
  ui.view?.dispose();
  ui.view = null;
  ui.game = null;
  ui.minimap = null;
}

// The time cap of each round against the given per-round opponent difficulties, for the menu and bracket labels.
function updateRoundCaps(diffs, minutes = timeLimit) {
  const capOf = (round, i) => matchOptions([null, diffs[i]], { timeLimit: minutes }).capTicks ?? round.capTicks;
  ui.roundCaps = Object.fromEntries(ROUNDS.map((round, i) => [round.id, capOf(round, i)]));
  hud.hideTip();
}

function show(html) {
  hud.hideTip();
  screenEl.innerHTML = html;
  screenEl.classList.remove('hidden');
  if (AUTO) setTimeout(() => screenEl.querySelector('[data-auto]')?.click(), 500);
}
function hide() {
  hud.hideTip();
  screenEl.classList.add('hidden');
  screenEl.innerHTML = '';
}

// ---- the match loop
// The sim runs at 20 ticks per game second (up to 300 a frame); each bot thinks every THINK_EVERY[difficulty] ticks,
// player 1 offset by 3 ticks from player 0. The last bot in the list always plays player 1.
function runTicks(match, dt) {
  const game = match.game;
  match.acc += dt * ui.speed * 20;
  let steps = Math.min(Math.floor(match.acc), 300);
  match.acc -= Math.floor(match.acc);
  for (let i = 0; i < steps && !game.result; i++) {
    game.tick();
    for (const bot of match.bots) {
      const pid = bot.pid, every = THINK_EVERY[match.diffs[pid]];
      if (game.time % every === (pid * 3) % every) bot.think();
    }
    if (game.rules.id === 'kingdoms' && game.players[0].defeated && !match.defeatShown && !match.autoplay) break;
  }
}

// Draws the scene every frame while the match runs; while paused or over, only at IDLE_FRAME_MS or when the camera
// or the selection changed.
function renderFrame(match, now) {
  const view = match.view;
  const selectionKey = `${[...ui.sel]}|${ui.placing}`;
  const idle = ui.paused || match.game.result;
  const changed = match.viewRevision !== view.revision || match.selectionKey !== selectionKey;
  if (idle && now < (match.nextRender || 0) && !changed) return;
  view.frame(Math.min(0.1, (now - (match.lastRender ?? now - 16.67)) / 1000), match.animT);
  match.lastRender = now;
  match.nextRender = now + IDLE_FRAME_MS;
  match.viewRevision = view.revision;
  match.selectionKey = selectionKey;
}

function frame(match, now) {
  match.raf = requestAnimationFrame(match.loop);
  const game = match.game, budget = FRAME_MS;
  if (now < match.next - 2) return; // 2 ms slack keeps a jittery 60 Hz display at 60
  // next due time: averages the cap on 120/144 Hz without catch-up bursts
  match.next = Math.max(match.next, now - budget) + budget;
  const dt = Math.min(0.1, (now - match.last) / 1000);
  match.last = now;
  match.frames++;
  if (!ui.paused && !game.result) runTicks(match, dt);
  if (game.rules.id === 'kingdoms' && game.players[0].defeated && !match.defeatShown) {
    match.defeatShown = true;
    if (match.autoplay) enableSpectating(match);
    else if (!game.result) showConquered(match);
  }
  if (!ui.paused) match.animT += dt; // the animation clock stops with the match, so working villagers freeze mid-swing
  input.update(dt);
  match.view.sync();
  hud.update();
  renderFrame(match, now);
  if (match.frames % 3 === 0) ui.minimap.draw();
  if (game.result && !match.ended) {
    match.ended = true;
    setTimeout(() => { if (app.match === match) showResult(match); }, AUTO ? 300 : 1200);
  }
}

// Points the camera at the player's Town Center, zoomed in less on a phone (and less still in portrait).
function centreOnHome(game, view) {
  const townCenter = [...game.buildings.values()].find(building => building.owner === 0);
  view.centerOn(townCenter.x + 1.5, townCenter.y + 1.5);
  view.setZoom(ui.touch ? (innerHeight > innerWidth ? 7.5 : 9) : 13);
}

function resetUiFor(game, view) {
  ui.game = game;
  ui.view = view;
  ui.sel.clear();
  ui.inspect = null;
  ui.placing = null;
  ui.wallStart = ui.wallEnd = null;
  ui.paused = false;
  ui.spectating = false;
  ui.defeatOpen = false;
  ui.minimap = createMinimap(document.getElementById('minimap'), game, view);
}

function startMatch({ roundId, seed, oppDiff, label, onEnd, minutes = timeLimit, map = mapType }) {
  endMatch();
  document.body.classList.add('ingame');
  // botDiff: the bot that drives player 0 in autoplay/test modes
  const botDiff = params.get('bot') || 'hard', autoplay = params.get('autoplay') === '1' || AUTO;
  const rules = roundById(roundId), count = rules.playerCount ?? 2;
  const difficulties = Array.from({ length: count }, (_, pid) => pid === 0 ? (autoplay ? botDiff : null) : oppDiff);
  const options = matchOptions(difficulties, { timeLimit: minutes });
  const game = createGame({ seed, rules, mapType: map, ...options });
  ui.roundCaps = { ...ui.roundCaps, [roundId]: game.capTicks };
  const viewportEl = document.getElementById('viewport');
  viewportEl.innerHTML = '';
  const view = createView(viewportEl, game);
  view.selection = ui.sel;
  if (view.softwareGpu && !gpuWarned) {
    gpuWarned = true;
    hud.toast('Hardware acceleration looks off: enable it in your browser settings. Graphics set to Balanced.');
  }
  resetUiFor(game, view);
  const bots = difficulties.flatMap((diff, pid) => diff ? [Object.assign(createBot(game, pid, diff), { pid })] : []);
  const diffs = difficulties;
  centreOnHome(game, view);
  const match = app.match = {
    game, view, bots, diffs, autoplay, acc: 0, animT: 0, last: performance.now(), ended: false, frames: 0, next: 0, label, onEnd,
  };
  app.onResize = () => { view.resize(); };
  window.addEventListener('resize', app.onResize);
  match.loop = now => frame(match, now);
  match.raf = requestAnimationFrame(match.loop);
  hide();
  return match;
}

// The result card's sentence for each way a match can end, from the player's side (`won`).
const REASON = {
  resigned: won => won ? 'The enemy resigned.' : 'You resigned.',
  conquest: won => won ? 'Every enemy unit and building was destroyed.' : 'Your empire was destroyed.',
  regicide: won => won ? 'You slew the enemy King!' : 'Your King has fallen.',
  wonder: won => won ? 'Your Wonder stood for three minutes.' : 'The enemy Wonder stood for three minutes.',
  relics: won => won ? 'You held all the relics.' : 'The enemy held all the relics.',
  'time cap': () => 'Time ran out; decided on score.',
  'mutual destruction': () => 'Both empires fell; decided on score.',
  'both kings fell': () => 'Both kings fell; decided on score.',
};
function resultStats(game) {
  const you = game.players[0];
  return `Time ${Math.floor(game.time / 1200)}m ${Math.floor(game.time / 20) % 60}s`
    + ` &middot; your kills ${you.kills}, buildings destroyed ${you.bdestroyed}`
    + ` &middot; score ${scoreOf(game, 0).toFixed(0)} vs ${scoreOf(game, 1).toFixed(0)}`;
}
function showResult(match) {
  if (match.game.rules.id === 'kingdoms') return showKingdomResult(match);
  const result = match.game.result, won = result.winner === 0;
  const reason = (REASON[result.reason] || (() => result.reason))(won);
  show(`<div class="card"><h1 class="${won ? 'win' : 'lose'}">${won ? 'Victory' : 'Defeat'}</h1><p>${reason}</p>`
    + `<p><small>${resultStats(match.game)}</small></p>`
    + `<button class="btn" data-auto id="cont">${match.onEnd ? 'Continue' : 'Back to menu'}</button></div>`);
  document.getElementById('cont').onclick = () => {
    if (app.match === match) endMatch();
    if (match.onEnd) match.onEnd(won);
    else menu();
  };
}

function enableSpectating(match) {
  ui.spectating = true;
  ui.defeatOpen = false;
  ui.sel.clear(); ui.inspect = null; ui.stopPlacing();
  ui.paused = false;
  match.view.spectating = true;
  match.view.fogEnabled = false;
  match.view.sync(true); match.view.invalidate(); hud.invalidate();
  hide();
}

function showConquered(match) {
  hud.cancelDelete(); hud.closeMenu();
  ui.defeatOpen = true;
  ui.paused = true;
  ui.sel.clear(); ui.stopPlacing();
  const captor = match.game.players[0].defeatedBy;
  show(`<div class="card"><h1 class="lose">Your civilization fell</h1><p>${captor == null ? 'You have been eliminated.'
    : `${TEAMS[captor].name} killed your king and inherited your empire.`}</p>`
    + '<button class="btn" id="spectate">Spectate</button><button class="btn" id="leave-kingdoms">Back to menu</button></div>');
  document.getElementById('spectate').onclick = () => enableSpectating(match);
  document.getElementById('leave-kingdoms').onclick = () => { endMatch(); menu(); };
  document.getElementById('spectate').focus();
}

function showKingdomResult(match) {
  const { game } = match, { winner, reason } = game.result;
  const title = winner === null ? 'Draw' : winner === 0 ? 'Victory' : `${TEAMS[winner].name} wins`;
  const verdict = reason === 'territory' ? 'Time expired: territory decides, with game score breaking territory ties.'
    : winner === null ? 'Every civilization fell.' : 'One civilization remains.';
  show(`<div class="card"><h1 class="${winner === 0 ? 'win' : 'lose'}">${title}</h1><p>${verdict}</p>`
    + `<div class="kingdom-final">${kingdomStandingsHtml(game, true)}</div>`
    + '<button class="btn" data-auto id="kingdom-back">Back to menu</button></div>');
  document.getElementById('kingdom-back').onclick = () => { endMatch(); menu(); };
}

// ---- tournament flow
// A played round lists every result (winner in bold), the current round its pairings and later rounds just a count.
const playedMatchHtml = result => `<div class="m ${result.human ? 'cur' : ''}">`
  + `<span class="${result.winner === result.a ? 'w' : ''} ${result.a === 'You' ? 'you' : ''}">${result.a}</span>`
  + `<span class="${result.winner === result.b ? 'w' : ''} ${result.b === 'You' ? 'you' : ''}">${result.b}</span></div>`;
function pairingsHtml(alive) {
  let html = '';
  for (let k = 0; k < alive.length; k += 2) {
    html += `<div class="m ${k === 0 ? 'cur' : ''}"><span class="${alive[k].id === 0 ? 'you' : ''}">${alive[k].name}</span>`
      + `<span>${alive[k + 1].name}</span></div>`;
  }
  return html;
}
const futureRoundHtml = i => `<div class="m"><span>${32 >> (i + 1) === 1 ? 'Final' : (32 >> i) / 2 + ' matches'}</span></div>`;
function bracketHtml(tournament) {
  const columns = ROUNDS.map((round, i) => {
    let matches;
    if (i < tournament.history.length) matches = tournament.history[i].results.map(playedMatchHtml).join('');
    else if (i === tournament.roundIndex && !tournament.over) matches = pairingsHtml(tournament.alive);
    else matches = futureRoundHtml(i);
    const heading = `<h4 data-tip="round:${round.id}" aria-describedby="tip" tabindex="0">Round ${i + 1}<br>${round.name}</h4>`;
    return `<div class="col">${heading}${matches}</div>`;
  });
  return `<div class="bracket">${columns.join('')}</div>`;
}
// The phone layout puts the buttons above the bracket, the desktop below it.
const aroundBracket = (tournament, buttons) => (TOUCH ? buttons : '') + bracketHtml(tournament) + (TOUCH ? '' : buttons);
function bracketScreen() {
  const tournament = app.tournament, round = tournament.round, opponent = tournament.opponent;
  updateRoundCaps(LEVELS[tournament.level], tournament.timeLimit);
  // Before the first round nothing is lost by going back; after it, leaving throws the tournament away, so it asks twice.
  const started = tournament.roundIndex > 0, backLabel = started ? 'Leave tournament' : 'Back to menu';
  const buttons = `<button class="btn" id="back">${backLabel}</button><button class="btn" data-auto id="go">Begin Round</button>`;
  const limit = `${tournament.noTimeLimit ? '' : 'Time limit: '}<b>${roundLimitText(round, ui.roundCaps[round.id])}.</b>`
    + ` ${tournament.noTimeLimit ? NO_TIME_LIMIT_RULE : TIME_LIMIT_RULE}`;
  show(`<div class="card"><h2>Round ${tournament.roundIndex + 1} of 5 &mdash; ${round.name}</h2>`
    + `<p>${round.desc}</p><p>${limit}</p><p>Map: <b>${MAP_NAME[tournament.mapType] ?? MAP_NAME.rivers}</b></p>`
    + `<p>Opponent: <b>${opponent.name}</b> (${opponent.difficulty}) &middot; Level: ${LEVEL_NAME[tournament.level]}</p>`
    + `${aroundBracket(tournament, buttons)}</div>`);
  const back = document.getElementById('back');
  back.onclick = () => {
    if (!started || back.dataset.armed) {
      app.tournament = null;
      return menu();
    }
    back.dataset.armed = '1';
    back.textContent = 'Confirm leave? Progress is lost';
    setTimeout(() => {
      if (!back.isConnected) return;
      delete back.dataset.armed;
      back.textContent = backLabel;
    }, 3000);
  };
  document.getElementById('go').onclick = () => {
    const seed = tournament.seed * 10 + tournament.roundIndex + 1;
    startMatch({ roundId: round.id, seed, oppDiff: opponent.difficulty, minutes: tournament.timeLimit, map: tournament.mapType,
      onEnd: won => afterMatch(won) });
  };
}
function showProgress(done, total) {
  const bar = document.getElementById('pbar'), text = document.getElementById('ptxt');
  if (bar) bar.style.width = (done / total * 100) + '%';
  if (text) text.textContent = `${done} / ${total} matches`;
}
// The bracket is untouched until every match has a result, so the same round can be simulated again.
function showSimulationError(error, won) {
  console.error('Bracket simulation failed', error);
  show('<div class="card"><h2>Unable to finish the bracket</h2><p>The other matches of this round could not be simulated.'
    + ' Your result is kept.</p><button class="btn" id="retry">Try again</button>'
    + '<button class="btn" id="recover">Back to menu</button></div>');
  document.getElementById('retry').onclick = () => afterMatch(won);
  document.getElementById('recover').onclick = () => {
    app.tournament = null;
    menu();
  };
}
function finalScreen(tournament) {
  const champion = !!tournament.champion;
  const verdict = champion ? 'You won all five rounds and the knockout crown.'
    : `You fell in round ${tournament.lostIn + 1} (${ROUNDS[tournament.lostIn].name}).`;
  const again = '<button class="btn" data-auto id="again">Back to menu</button>';
  show(`<div class="card"><h1 class="${champion ? 'win' : 'lose'}">${champion ? 'Champion!' : 'Eliminated'}</h1><p>${verdict}</p>`
    + `${aroundBracket(tournament, again)}</div>`);
  document.getElementById('again').onclick = menu;
}
async function afterMatch(won) {
  const tournament = app.tournament;
  show(`<div class="card"><h2>${won ? 'Round won' : 'Round lost'}</h2><p>Simulating the rest of the bracket&hellip;</p>`
    + '<div class="prog"><i id="pbar"></i></div><p id="ptxt"></p></div>');
  const simulator = createAsyncSimulator();
  try {
    await tournament.resolveAsync(won, { simulate: simulator.simulate, onProgress: showProgress });
  } catch (error) {
    showSimulationError(error, won);
    return;
  } finally {
    simulator.dispose();
  }
  if (!tournament.over) return bracketScreen();
  finalScreen(tournament);
}
function startTournament() {
  app.tournament = createTournament(pickSeed(), level, { timeLimit, mapType });
  bracketScreen();
}

// ---- main menu
const REPO_URL = 'https://github.com/ggrocco/age_of_knockout';
const GITHUB_ICON = '<svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';
const TOUCH_KEYS = '<div class="keys"><b>Tap</b><span>select your unit or building; with a selection, tap a target to order it'
  + ' (move, gather, attack, build)</span><b>Drag / pinch</b><span>pan the map / zoom</span><b>Round buttons</b><span>next idle'
  + ' villager or fishing ship, Town Center, box-select, deselect</span></div>';
const DESKTOP_KEYS = '<div class="keys"><b>Left click / drag</b>'
  + '<span>select units and buildings (double-click: all of a type)</span>'
  + '<b>Right click</b><span>move, gather, build, attack, pick up relics, or board and land a Transport Ship</span>\n'
  + '  <b>WASD / arrows, wheel</b><span>pan, zoom</span><b>. (period), H</b><span>next idle villager or fishing ship (or the round button above'
  + ' the minimap), jump to Town Center</span><b>Space + drag</b><span>pan the map with the mouse</span><b>Esc</b><span>pause /'
  + ' resume (cancels a placement first)</span></div>';
// The menu's pickers are toggle buttons: aria-pressed marks the chosen one for screen readers and the styling.
const toggleHtml = (attr, value, chosen, label) =>
  `<button class="btn${value === chosen ? ' on' : ''}" data-${attr}="${value}" aria-pressed="${value === chosen}">${label}</button>`;
const levelButtonsHtml = () => Object.keys(LEVELS).map(name => toggleHtml('level', name, level, LEVEL_NAME[name])).join('');
const mapButtonsHtml = () => MAP_TYPES.map(type => toggleHtml('map', type, mapType, MAP_NAME[type])).join('');
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
const quickButtonsHtml = () => ROUNDS.map((round, i) => `<button class="btn quick" data-i="${i}" data-tip="round:${round.id}"`
  + ` aria-describedby="tip" aria-label="Quick match: ${round.name}"><span class="num" aria-hidden="true">${ROMAN[i]}</span>`
  + `<b>${round.name}</b><small>${roundLimitText(round, ui.roundCaps[round.id])}</small></button>`).join('');
// Two swords crossed behind a shield, drawn in the menu's bronze above the title.
const SWORD = '<path d="M50 8 56 6 54 12 21 45"/><path d="M15 39 25 49M20 44 11 53"/><circle cx="10" cy="54" r="2"/>';
const CREST = '<svg class="crest" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"'
  + ` stroke-linecap="round" stroke-linejoin="round">${SWORD}<g transform="matrix(-1 0 0 1 64 0)">${SWORD}</g>`
  + '<path d="M32 12 48 17v13c0 11-7 19-16 23-9-4-16-12-16-23V17Z" fill="#2a1f13"/>'
  + '<path d="M32 18 43 21.5V30c0 8-5 13.5-11 16.5-6-3-11-8.5-11-16.5v-8.5Z" opacity=".5"/><path d="M27 33l5-6 5 6-5 6Z" fill="currentColor"/></svg>';
const menuHtml = () => `<div class="card menu">
  <header class="menu-head">${CREST}<h1>Age of Knockout</h1>
  <p class="tagline"><span>A five-round elimination tournament in the spirit of Age of Empires (1997)</span></p></header>
  <div class="menu-grid">
  <section class="panel rules" aria-labelledby="rules-title"><h3 class="panel-title" id="rules-title">Rules</h3>
    <div class="setting level"><span class="setting-name" id="level-label">Difficulty</span>
      <div class="seg" role="group" aria-labelledby="level-label">${levelButtonsHtml()}</div>
      <p id="leveldesc">${LEVEL_DESC[level]}</p></div>
    <div class="setting map-option"><span class="setting-name" id="map-label">Map</span>
      <div class="seg" role="group" aria-labelledby="map-label">${mapButtonsHtml()}</div>
      <p id="mapdesc">${MAP_DESC[mapType]}</p></div>
    <div class="setting time-option">
      <label for="time-limit"><span class="setting-name">Time limit</span> <output id="time-limit-value" for="time-limit">${timeLimitLabel()}</output></label>
      <input type="range" id="time-limit" min="0" max="${MAX_TIME_LIMIT}" step="1" value="${timeLimit}" style="--fill:${timeLimit / MAX_TIME_LIMIT * 100}%" aria-valuetext="${timeLimitLabel()}" aria-describedby="time-limit-help">
      <div class="time-scale"><span>0 &middot; No limit</span><span>2 hours</span></div>
      <p id="time-limit-help">Minutes of game time. Applies to quick matches and all your tournament rounds. Wonder and relic countdowns still apply.</p>
    </div>
  </section>
  <section class="panel play" aria-labelledby="play-title"><h3 class="panel-title" id="play-title">Play</h3>
    <div class="mode tournament">
      <h4>Knockout Tournament</h4>
      <p>Thirty-two rulers enter; you face one AI empire per round, each round a different game type. Lose once and you are out.</p>
      <ol class="ladder" aria-hidden="true"><li>32</li><li>16</li><li>8</li><li>4</li><li>2</li><li class="crown">&#9813;</li></ol>
      <button class="btn primary" data-auto id="start">Begin Tournament</button>
    </div>
    <div class="mode kingdoms">
      <h4>Kingdom Conquest <span class="mode-tag">4 teams</span></h4>
      <p>Slay kings to capture their civilizations. Conquer all three opponents or hold the most territory.</p>
      <button class="btn kingdoms-start" id="start-kingdoms" data-tip="round:kingdoms">Start Kingdom Conquest</button>
    </div>
  </section>
  </div>
  <section class="quick-row" aria-labelledby="quick-title"><h3 class="panel-title" id="quick-title">Quick match <small>one game of a single round type</small></h3>
    <div class="quick-grid">${quickButtonsHtml()}</div></section>
  <details class="controls"><summary>Controls</summary>${TOUCH ? TOUCH_KEYS : DESKTOP_KEYS}</details>
  <footer class="project"><a class="repo" href="${REPO_URL}" target="_blank" rel="noopener">${GITHUB_ICON}<span>View on GitHub</span></a>
  <h3>Contributing</h3>
  <p>Issues, ideas and pull requests are welcome and much appreciated! Age of Knockout is a one-person project made just for fun, so please expect slow replies and reviews.</p></footer></div>`;

// A new level or time limit changes every round's cap, so the Quick buttons' time labels follow.
function refreshQuickLabels() {
  updateRoundCaps(LEVELS[level]);
  for (const quick of document.querySelectorAll('.quick')) {
    const round = ROUNDS[+quick.dataset.i];
    quick.querySelector('small').textContent = roundLimitText(round, ui.roundCaps[round.id]);
  }
}
// Marks `button` as the chosen one of its picker.
function pressOnly(button) {
  for (const other of button.parentElement.children) {
    other.classList.toggle('on', other === button);
    other.setAttribute('aria-pressed', String(other === button));
  }
}
function wireMenu() {
  document.getElementById('start').onclick = startTournament;
  document.getElementById('start-kingdoms').onclick = () => startMatch({ roundId: KINGDOMS.id, seed: pickSeed(),
    oppDiff: params.get('opp') || ({ relaxed: 'relaxed', normal: 'medium', hard: 'hard' })[level] });
  document.getElementById('time-limit').oninput = e => {
    setTimeLimit(e.target.value);
    document.getElementById('time-limit-value').textContent = timeLimitLabel();
    e.target.setAttribute('aria-valuetext', timeLimitLabel());
    e.target.style.setProperty('--fill', `${timeLimit / MAX_TIME_LIMIT * 100}%`);
    refreshQuickLabels();
  };
  for (const button of document.querySelectorAll('[data-map]')) button.onclick = () => {
    setMapType(button.dataset.map);
    document.getElementById('mapdesc').textContent = MAP_DESC[mapType];
    pressOnly(button);
  };
  for (const button of document.querySelectorAll('[data-level]')) button.onclick = () => {
    setLevel(button.dataset.level);
    document.getElementById('leveldesc').textContent = LEVEL_DESC[level];
    refreshQuickLabels();
    pressOnly(button);
  };
  // A quick match faces the opponent that round would have in a tournament at the chosen level.
  for (const button of document.querySelectorAll('.quick')) button.onclick = () => {
    const i = +button.dataset.i;
    startMatch({ roundId: ROUNDS[i].id, seed: pickSeed(), oppDiff: LEVELS[level][i] });
  };
}
function menu() {
  updateRoundCaps(LEVELS[level]);
  document.body.classList.remove('ingame');
  show(menuHtml());
  wireMenu();
}

if (params.get('mode') === 'kingdoms') {
  startMatch({ roundId: KINGDOMS.id, seed: pickSeed(),
    oppDiff: params.get('opp') || ({ relaxed: 'relaxed', normal: 'medium', hard: 'hard' })[level] });
} else if (params.get('round')) {
  startMatch({ roundId: ROUNDS[+params.get('round') - 1].id, seed: pickSeed(), oppDiff: params.get('opp') || 'medium' });
} else menu();
