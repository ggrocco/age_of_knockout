import { createGame } from './sim/game.js';
import { createBot, matchOptions, THINK_EVERY } from './ai/bot.js';
import { ROUNDS, roundById, scoreOf } from './rounds/index.js';
import { createTournament, LEVELS, LEVEL_NAME } from './tournament/bracket.js';
import { createView } from './render/view.js';
import { createMinimap } from './render/minimap.js';
import { createHud, reasonText } from './ui/hud.js';
import { createInput } from './ui/input.js';
import { BUILDINGS } from './data/buildings.js';
import { canPlace } from './sim/commands.js';
import { roundLimitText, TIME_LIMIT_RULE, NO_TIME_LIMIT_RULE } from './ui/tips.js';

const params = new URLSearchParams(location.search), AUTO = params.get('autotour') === '1';
// ?seed=N replays a map; otherwise every tournament and quick match gets a fresh map and start position.
const pickSeed = () => +params.get('seed') || 1 + Math.floor(Math.random() * 100000);
const TOUCH = params.get('touch') === '1' || matchMedia('(pointer: coarse)').matches;
document.body.classList.toggle('touch', TOUCH);
const screenEl = document.getElementById('screen'), app = { tournament: null, match: null, ui: null };
window.__app = app;
let gpuWarned = false;
// Tournament difficulty level: ?level= wins, else the last pick (browser storage may be unavailable), else Normal.
const LEVEL_DESC = { relaxed: 'A long peaceful start: opponents work at half your speed and wait 30 minutes, and until Bronze Age, before attacking.', normal: 'The standard ramp, from easy to hard opponents.', hard: 'Tough opponents from the first round.' };
const storedLevel = () => { try { return localStorage.getItem('level'); } catch { return null; } };
let level = [params.get('level'), storedLevel()].find(l => Object.hasOwn(LEVELS, l ?? '')) || 'normal';
function setLevel(l) { level = l; try { localStorage.setItem('level', l); } catch {} }
const storedNoTimeLimit = () => { try { return localStorage.getItem('noTimeLimit') === 'true'; } catch { return false; } };
let noTimeLimit = params.has('noTimeLimit') ? params.get('noTimeLimit') === '1' : storedNoTimeLimit();
function setNoTimeLimit(value) { noTimeLimit = value; try { localStorage.setItem('noTimeLimit', String(value)); } catch {} }
// Frame cap: high-refresh displays would otherwise redraw the whole scene ~120 times a second; idle screens need less.
const FRAME_MS = 1000 / (+params.get('fps') || 60), IDLE_FRAME_MS = 1000 / 30;

const ui = app.ui = { touch: TOUCH, boxMode: false, placeTile: null, game: null, view: null, minimap: null, sel: new Set(), inspect: null, placing: null, speed: +(params.get('speed') || 1), paused: false,
  cmd(c) { const r = ui.game.command(0, c); if (!r.ok) hud.toast(reasonText(r.reason)); return r; },
  setSpeed(s) { ui.speed = s; }, togglePause() { ui.paused = !ui.paused; },
  startPlacing(type) {
    ui.placing = type;
    if (ui.touch) { const r = document.getElementById('viewport').getBoundingClientRect(), p = ui.view.pickGround(r.left + r.width / 2, r.top + r.height / 2), sz = BUILDINGS[type].size; if (p) { const cx = Math.round(p.x - sz / 2), cy = Math.round(p.y - sz / 2); ui.placeTile = { x: cx, y: cy };
        for (let r = 0; r < 14; r++) { let found = false; for (let dy = -r; dy <= r && !found; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; if (canPlace(ui.game, 0, type, cx + dx, cy + dy)) { ui.placeTile = { x: cx + dx, y: cy + dy }; found = true; break; } } if (found) break; } } hud.toast('Tap or drag to position, then press Place'); }
    else hud.toast('Click to place. Right-click / Esc cancels. Shift keeps placing.');
  },
  stopPlacing() { ui.placing = null; ui.view?.showGhost(null); },
  marker(x, y) { ui.view?.marker(x, y); } };
window.addEventListener('orientationchange', () => setTimeout(() => app.onResize?.(), 250));
const hud = createHud(ui), input = createInput(ui); ui.toast = hud.toast; ui.quit = () => { endMatch(); menu(); };

// Stop the render loop and free the WebGL context; a finished match otherwise keeps drawing behind menus.
function endMatch() {
  const m = app.match; if (!m) return;
  cancelAnimationFrame(m.raf); m.ended = true; app.match = null;
  if (app.onResize) { window.removeEventListener('resize', app.onResize); app.onResize = null; }
  ui.view?.dispose(); ui.view = null; ui.game = null; ui.minimap = null;
}

function updateRoundCaps(diffs, unlimited = noTimeLimit) {
  ui.roundCaps = Object.fromEntries(ROUNDS.map((r, i) => [r.id, matchOptions([null, diffs[i]], { noTimeLimit: unlimited }).capTicks ?? r.capTicks]));
  hud.hideTip();
}

function show(html) { hud.hideTip(); screenEl.innerHTML = html; screenEl.classList.remove('hidden'); if (AUTO) setTimeout(() => screenEl.querySelector('[data-auto]')?.click(), 500); }
function hide() { hud.hideTip(); screenEl.classList.add('hidden'); screenEl.innerHTML = ''; }

function startMatch({ roundId, seed, oppDiff, label, onEnd, unlimited = noTimeLimit }) {
  endMatch();
  document.body.classList.add('ingame');
  const botDiff = params.get('bot') || 'hard', autoplay = params.get('autoplay') === '1' || AUTO; // botDiff: the bot that drives player 0 in autoplay/test modes
  const game = createGame({ seed, rules: roundById(roundId), ...matchOptions([autoplay ? botDiff : null, oppDiff], { noTimeLimit: unlimited }) });
  ui.roundCaps = { ...ui.roundCaps, [roundId]: game.capTicks };
  const vp = document.getElementById('viewport'); vp.innerHTML = '';
  const view = createView(vp, game); view.selection = ui.sel;
  if (view.softwareGpu && !gpuWarned) { gpuWarned = true; hud.toast('Hardware acceleration looks off: enable it in your browser settings. Graphics set to Balanced.'); }
  ui.game = game; ui.view = view; ui.sel.clear(); ui.inspect = null; ui.placing = null; ui.paused = false; ui.minimap = createMinimap(document.getElementById('minimap'), game, view);
  const bots = [createBot(game, 1, oppDiff)];
  if (autoplay) bots.unshift(createBot(game, 0, botDiff));
  const diffs = { 0: botDiff, 1: oppDiff };
  const tc = [...game.buildings.values()].find(b => b.owner === 0); view.centerOn(tc.x + 1.5, tc.y + 1.5); view.setZoom(ui.touch ? (innerHeight > innerWidth ? 7.5 : 9) : 13);
  const m = app.match = { game, view, bots, diffs, acc: 0, last: performance.now(), ended: false, frames: 0, next: 0, label, onEnd };
  app.onResize = () => { view.resize(); }; window.addEventListener('resize', app.onResize);
  const loop = now => {
    m.raf = requestAnimationFrame(loop);
    const budget = ui.paused || game.result ? IDLE_FRAME_MS : FRAME_MS;
    if (now < m.next - 2) return; // 2 ms slack keeps a jittery 60 Hz display at 60
    m.next = Math.max(m.next, now - budget) + budget; // next due time: averages the cap on 120/144 Hz without catch-up bursts
    const dt = Math.min(0.1, (now - m.last) / 1000); m.last = now; m.frames++;
    if (!ui.paused && !game.result) {
      m.acc += dt * ui.speed * 20; let steps = Math.min(Math.floor(m.acc), 300); m.acc -= Math.floor(m.acc);
      for (let i = 0; i < steps && !game.result; i++) { game.tick(); for (const b of m.bots) { const pid = b === m.bots[m.bots.length - 1] ? 1 : 0, ev = THINK_EVERY[m.diffs[pid]]; if (game.time % ev === (pid * 3) % ev) b.think(); } }
    }
    input.update(dt); view.sync(); view.frame(dt, now / 1000); hud.update(); if (m.frames % 3 === 0) ui.minimap.draw();
    if (game.result && !m.ended) { m.ended = true; setTimeout(() => { if (app.match === m) showResult(m); }, AUTO ? 300 : 1200); }
  };
  m.raf = requestAnimationFrame(loop);
  hide();
  return m;
}

const REASON = { resigned: w => w ? 'The enemy resigned.' : 'You resigned.', conquest: w => w ? 'Every enemy unit and building was destroyed.' : 'Your empire was destroyed.', regicide: w => w ? 'You slew the enemy King!' : 'Your King has fallen.', wonder: w => w ? 'Your Wonder stood for three minutes.' : 'The enemy Wonder stood for three minutes.',
  relics: w => w ? 'You held all the relics.' : 'The enemy held all the relics.', 'time cap': w => 'Time ran out; decided on score.', 'mutual destruction': () => 'Both empires fell; decided on score.', 'both kings fell': () => 'Both kings fell; decided on score.' };
function showResult(m) {
  const r = m.game.result, won = r.winner === 0, p = m.game.players;
  const stats = `Time ${Math.floor(m.game.time / 1200)}m ${Math.floor(m.game.time / 20) % 60}s &middot; your kills ${p[0].kills}, buildings destroyed ${p[0].bdestroyed} &middot; score ${scoreOf(m.game, 0).toFixed(0)} vs ${scoreOf(m.game, 1).toFixed(0)}`;
  show(`<div class="card"><h1 class="${won ? 'win' : 'lose'}">${won ? 'Victory' : 'Defeat'}</h1><p>${(REASON[r.reason] || (() => r.reason))(won)}</p><p><small>${stats}</small></p><button class="btn" data-auto id="cont">${m.onEnd ? 'Continue' : 'Back to menu'}</button></div>`);
  document.getElementById('cont').onclick = () => { if (app.match === m) endMatch(); if (m.onEnd) m.onEnd(won); else menu(); };
}

// ---- tournament flow
function bracketHtml(t) {
  const cols = ROUNDS.map((r, i) => {
    let ms = '';
    if (i < t.history.length) ms = t.history[i].results.map(x => `<div class="m ${x.human ? 'cur' : ''}"><span class="${x.winner === x.a ? 'w' : ''} ${x.a === 'You' ? 'you' : ''}">${x.a}</span><span class="${x.winner === x.b ? 'w' : ''} ${x.b === 'You' ? 'you' : ''}">${x.b}</span></div>`).join('');
    else if (i === t.roundIndex && !t.over) { for (let k = 0; k < t.alive.length; k += 2) ms += `<div class="m ${k === 0 ? 'cur' : ''}"><span class="${t.alive[k].id === 0 ? 'you' : ''}">${t.alive[k].name}</span><span>${t.alive[k + 1].name}</span></div>`; }
    else ms = `<div class="m"><span>${32 >> (i + 1) === 1 ? 'Final' : (32 >> i) / 2 + ' matches'}</span></div>`;
    return `<div class="col"><h4 data-tip="round:${r.id}" aria-describedby="tip" tabindex="0">Round ${i + 1}<br>${r.name}</h4>${ms}</div>`;
  });
  return `<div class="bracket">${cols.join('')}</div>`;
}
function bracketScreen() {
  const t = app.tournament, r = t.round, o = t.opponent;
  updateRoundCaps(LEVELS[t.level], t.noTimeLimit);
  show(`<div class="card"><h2>Round ${t.roundIndex + 1} of 5 &mdash; ${r.name}</h2><p>${r.desc}</p><p>${t.noTimeLimit ? '' : 'Time limit: '}<b>${roundLimitText(r, ui.roundCaps[r.id])}.</b> ${t.noTimeLimit ? NO_TIME_LIMIT_RULE : TIME_LIMIT_RULE}</p><p>Opponent: <b>${o.name}</b> (${o.difficulty}) &middot; Level: ${LEVEL_NAME[t.level]}</p>${TOUCH ? '<button class="btn" data-auto id="go">Begin Round</button>' : ''}${bracketHtml(t)}${TOUCH ? '' : '<button class="btn" data-auto id="go">Begin Round</button>'}</div>`);
  document.getElementById('go').onclick = () => startMatch({ roundId: r.id, seed: t.seed * 10 + t.roundIndex + 1, oppDiff: o.difficulty, unlimited: t.noTimeLimit, onEnd: won => afterMatch(won) });
}
async function afterMatch(won) {
  const t = app.tournament;
  show(`<div class="card"><h2>${won ? 'Round won' : 'Round lost'}</h2><p>Simulating the rest of the bracket&hellip;</p><div class="prog"><i id="pbar"></i></div><p id="ptxt"></p></div>`);
  await t.resolveAsync(won, { onProgress: (d, n) => { document.getElementById('pbar').style.width = (d / n * 100) + '%'; document.getElementById('ptxt').textContent = `${d} / ${n} matches`; } });
  if (!t.over) return bracketScreen();
  const champ = !!t.champion;
  show(`<div class="card"><h1 class="${champ ? 'win' : 'lose'}">${champ ? 'Champion!' : 'Eliminated'}</h1><p>${champ ? 'You won all five rounds and the knockout crown.' : `You fell in round ${t.lostIn + 1} (${ROUNDS[t.lostIn].name}).`}</p>${TOUCH ? '<button class="btn" data-auto id="again">Back to menu</button>' : ''}${bracketHtml(t)}${TOUCH ? '' : '<button class="btn" data-auto id="again">Back to menu</button>'}</div>`);
  document.getElementById('again').onclick = menu;
}
function startTournament() { app.tournament = createTournament(pickSeed(), level, { noTimeLimit }); bracketScreen(); }

function menu() {
  updateRoundCaps(LEVELS[level]);
  document.body.classList.remove('ingame');
  show(`<div class="card"><h1>Age of Knockout</h1><h2>A five-round elimination tournament in the spirit of Age of Empires (1997)</h2>
  <p>Thirty-two rulers enter; you face one AI empire per round, each round a different game type. Lose once and you are out.</p>
  ${TOUCH ? `<div class="keys"><b>Tap</b><span>select your unit or building; with a selection, tap a target to order it (move, gather, attack, build)</span><b>Drag / pinch</b><span>pan the map / zoom</span><b>Round buttons</b><span>next idle villager, Town Center, box-select, deselect</span></div>` : `<div class="keys"><b>Left click / drag</b><span>select units and buildings (double-click: all of a type)</span><b>Right click</b><span>move, gather, build, attack, or pick up relics</span>
  <b>WASD / arrows, wheel</b><span>pan, zoom</span><b>. (period), H</b><span>next idle villager, jump to Town Center</span><b>Space, Esc</b><span>pause, cancel</span></div>`}
  <div class="level">Difficulty: ${Object.keys(LEVELS).map(l => `<button class="btn${l === level ? ' on' : ''}" data-level="${l}">${LEVEL_NAME[l]}</button>`).join('')}<p id="leveldesc">${LEVEL_DESC[level]}</p></div>
  <label class="time-option"><input type="checkbox" id="no-time-limit" aria-describedby="time-limit-help" ${noTimeLimit ? 'checked' : ''}> No time limit</label>
  <p id="time-limit-help"><small>Applies to quick matches and all your tournament rounds. Wonder and relic countdowns still apply.</small></p>
  <button class="btn" data-auto id="start">Begin Tournament</button><br>
  ${ROUNDS.map((r, i) => `<button class="btn quick" data-i="${i}" data-tip="round:${r.id}" aria-describedby="tip" style="font-size:14px;padding:5px 12px">Quick: ${r.name}<small>${roundLimitText(r, ui.roundCaps[r.id])}</small></button>`).join('')}</div>`);
  document.getElementById('start').onclick = startTournament;
  const refreshOptions = () => {
    updateRoundCaps(LEVELS[level]);
    for (const quick of document.querySelectorAll('.quick')) { const r = ROUNDS[+quick.dataset.i]; quick.querySelector('small').textContent = roundLimitText(r, ui.roundCaps[r.id]); }
  };
  document.getElementById('no-time-limit').onchange = e => { setNoTimeLimit(e.target.checked); refreshOptions(); };
  for (const b of document.querySelectorAll('.level .btn')) b.onclick = () => {
    setLevel(b.dataset.level); document.getElementById('leveldesc').textContent = LEVEL_DESC[level];
    refreshOptions();
    for (const x of document.querySelectorAll('.level .btn')) x.classList.toggle('on', x === b);
  };
  // A quick match faces the opponent that round would have in a tournament at the chosen level.
  for (const b of document.querySelectorAll('.quick')) b.onclick = () => startMatch({ roundId: ROUNDS[+b.dataset.i].id, seed: pickSeed(), oppDiff: LEVELS[level][+b.dataset.i] });
}

if (params.get('round')) startMatch({ roundId: ROUNDS[+params.get('round') - 1].id, seed: pickSeed(), oppDiff: params.get('opp') || 'medium' });
else menu();
