import { UNITS } from '../data/units.js';
import { BUILDINGS, repairCost, workSpeed } from '../data/buildings.js';
import { TECHS } from '../data/techs.js';
import { AGES, AGE_COST, ageIndex, ageLabel, ageTitle, popLimit } from '../data/ages.js';
import { canAfford, ageUpProblem, ageUpNeed, popFullReason } from '../sim/commands.js';
import { ROUNDS, WONDER_TICKS, RELIC_TICKS } from '../rounds/index.js';
import { icon } from './icons.js';
import { COLORS, RES, costHtml, tipHtml, roundTipHtml, queueText } from './tips.js';
import { QUALITY } from '../render/quality.js';
import { isIdleWorker } from './input.js';

const REASONS = {
  'needs a fishing ship': 'Only Fishing Ships can fish',
  'transport full': 'The Transport Ship is full (8 aboard)',
  'bad transport': 'Not one of your Transport Ships',
  empty: 'Nobody is aboard',
  'no shore': 'No shore to land on there',
  resources: 'Not enough resources',
  'pop cap': 'Population cap reached - build Houses',
  'pop limit': 'Population limit of this Age reached - advance to raise it',
  age: 'Requires a later Age',
  placement: 'Cannot build there',
  'needs buildings': 'Advancing needs more finished buildings of your current Age',
  'queue full': 'Production queue is full',
  'no villagers': 'Select villagers first',
  'no units': 'Select units first',
  'bad target': 'Invalid target',
  'already researching': 'Already advancing',
  'needs town center': 'Requires a Town Center',
  'nothing to repair': 'Nothing to repair',
};
const TECHS_AT = new Set(Object.values(TECHS).map(tech => tech.building)); // buildings that research something
const SPEEDS = [1, 2, 4];
export const reasonText = reason => REASONS[reason] || reason;
// Game ticks (20 per second) as m:ss.
const fmtTime = ticks => {
  const seconds = Math.floor(ticks / 20);
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
};
// Tile colour class: buildings, AI Future content, workers, siege and other military each get their own tint.
const tintOf = def => {
  if (!def.cls) return 't-bld';
  if (def.age === 'future') return 't-fut';
  if (def.cls === 'civ') return 't-civ';
  return def.cls === 'siege' ? 't-siege' : 't-mil';
};
const shortOf = (player, cost) => RES.filter(resource => cost[resource] > player.res[resource]);
const capitalize = text => text[0].toUpperCase() + text.slice(1);
// Seconds left on a training or research timer, at the building's (damage-scaled) work speed.
const secondsLeft = (remaining, building) => Math.ceil(remaining / 20 / workSpeed(building));
const nameOf = entity => entity.kind === 'unit' ? UNITS[entity.type].name
  : entity.kind === 'building' ? BUILDINGS[entity.type].name : entity.type;
const hpBar = entity => `<div class="bar"><i style="width:${Math.max(0, entity.hp / entity.maxHp * 100)}%"></i></div>`;

// The objective line: the round's goal, or its live countdown / King status.
function objectiveText(game) {
  const round = game.rules, state = game.roundState;
  if (!round) return '';
  if (round.id === 'wonder') {
    return `Wonder countdown - you ${fmtTime(state.hold[0])}/${fmtTime(WONDER_TICKS)}`
      + ` | enemy ${fmtTime(state.hold[1])}/${fmtTime(WONDER_TICKS)}`;
  }
  if (round.id === 'relics') {
    return `Relics held - you ${state.count ? state.count[0] : 0} | enemy ${state.count ? state.count[1] : 0} of 5`
      + ` | hold ${fmtTime(state.hold[0])}/${fmtTime(RELIC_TICKS)}`;
  }
  if (round.id === 'regicide') return `Protect your King (${game.entities.has(state.kings[0]) ? 'alive' : 'DEAD'}). Kill theirs.`;
  return round.desc;
}

// Unit lines of the info panel: attack, armour, what it carries (resources, or a transport's passengers) and its order.
function unitDetails(unit) {
  const attack = `${unit.atk} ${unit.atkType === 'pierce' ? 'pierce' : 'melee'}`;
  const carrying = unit.carry?.amount > 0 ? `<br>Carrying ${Math.floor(unit.carry.amount)} ${unit.carry.type}` : '';
  const aboard = unit.cargo ? `<br>Aboard ${unit.cargo.length}/${UNITS[unit.type].carries}` : '';
  return ` &nbsp; Attack ${attack} &nbsp; Armor ${unit.marmor}/${unit.parmor}` + carrying + aboard
    + `<br>${capitalize(unit.order.type)}`;
}

// Building line of the info panel: construction progress, the training queue, or what is left to gather.
function buildingDetails(building) {
  if (!building.constructed) return `<br>Under construction ${Math.floor(building.progress * 100)}%`;
  if (building.queue.length) {
    return `<br>Training: ${queueText(building.queue)} (${secondsLeft(building.queue[0].remaining, building)}s)`;
  }
  if (!building.gatherType) return '';
  return `<br>${capitalize(building.gatherType)} left ${Math.floor(building.amount)}`
    + (building.maxAmount ? ' / ' + building.maxAmount : '');
}

// An own damaged building: how much slower it works and what villagers would pay to make it whole.
function repairDetails(building, player, touch) {
  const cost = repairCost(building.type, building.maxHp - building.hp, building.maxHp);
  const roundedCost = Object.fromEntries(Object.entries(cost).map(([resource, amount]) => [resource, Math.ceil(amount)]));
  let html = '';
  if (BUILDINGS[building.type].trains || TECHS_AT.has(building.type)) {
    html += `<br><span class="lose">Damaged: works at ${Math.round(workSpeed(building) * 100)}% speed</span>`;
  }
  return html + `<br>Repair: ${costHtml(roundedCost, shortOf(player, roundedCost), true)}`
    + (touch ? '' : ' <small>(right-click with villagers)</small>');
}

const needsRepair = (entity) => entity.kind === 'building' && entity.owner === 0 && entity.constructed
  && !entity.gatherType && entity.hp < entity.maxHp;

// The info panel for one entity, selected or inspected.
function describe(entity, player, touch) {
  const enemyTag = entity.owner === 1 ? ' <small class="lose">(enemy)</small>' : '';
  let html = `<h3>${nameOf(entity)}${enemyTag}</h3>` + hpBar(entity) + `HP ${Math.ceil(entity.hp)}/${entity.maxHp}`;
  if (entity.kind === 'unit') html += unitDetails(entity);
  if (entity.kind === 'building') html += buildingDetails(entity);
  if (needsRepair(entity)) html += repairDetails(entity, player, touch);
  // Phones have no tooltips and the Advance tile clips 4-resource costs, so the Town Center lists the next Age's full cost here.
  const next = AGES[ageIndex(player.age) + 1];
  if (touch && entity.type === 'town_center' && entity.owner === 0 && entity.constructed && next) {
    const cost = AGE_COST[next].cost;
    html += `<br>${ageTitle(next)}: ${costHtml(cost, shortOf(player, cost), true)}`;
  }
  return html;
}

// Several entities selected: a count per kind.
function selectionSummary(selected) {
  const counts = {};
  for (const entity of selected) counts[nameOf(entity)] = (counts[nameOf(entity)] || 0) + 1;
  const lines = Object.entries(counts).map(([name, count]) => `${count} x ${name}`);
  return `<h3>${selected.length} selected</h3>` + lines.join('<br>');
}

export function createHud(ui) {
  const $ = id => document.getElementById(id), top = $('topbar'), info = $('info'), cmds = $('cmds');
  let cmdKey = '', infoKey = '', updateKey = '', lastGame = null, revision = 0, toastTimer;
  const hud = {
    toast(message) {
      const toastEl = $('toast');
      toastEl.textContent = message;
      toastEl.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
    },
  };
  const menuHidden = () => $('gamemenu').classList.contains('hidden');

  // Glass command tile: icon orb + name + cost. Disabled tiles use .off / aria-disabled (not [disabled]) so they still
  // receive hover for the tooltip. tile() returns a descriptor: `key` (attributes + name + lock) changes only when the
  // tile set, its target building or a lock state changes (then the panel is rebuilt); otherwise `off` and `small`
  // (cost line) are patched in place so hover/glow animations and focus survive resource ticks.
  const tips = new Map();
  const roundTips = new Map(ROUNDS.map(round => [`round:${round.id}`, round]));
  const tile = (attrs, spec) => {
    const { kind, id, name, cost, tint, cls, ok, lockedAge, short = [], notes = [], next, age } = spec;
    const { extra = '', extraClass = '' } = spec;
    tips.set(`${kind}:${id}`, tipHtml({ kind, id, next, age, short, notes }));
    const lock = lockedAge ? `<span class="lock">${icon('lock')}</span>` : '';
    const small = lockedAge ? ageTitle(lockedAge) : costHtml(cost, short, true) + extra;
    const classes = `btn tile ${tint}${ok ? '' : ' off'}${lockedAge ? ' locked' : ''}${extraClass}`;
    return { key: `${attrs}|${name}|${lockedAge ? 'L' : ''}`, off: !ok, small,
      html: `<button class="${classes}" ${attrs} data-tip="${kind}:${id}" aria-describedby="tip" aria-disabled="${!ok}">`
        + `<span class="orb">${icon(id, cls)}${lock}</span>`
        + `<span class="lbl"><b>${name}</b><small>${small}</small></span></button>` };
  };

  // ----- tooltips -----
  const tipEl = $('tip');
  let tipKey = '', tipTarget = null;
  const hideTip = () => {
    tipKey = '';
    tipTarget = null;
    tipEl.classList.remove('show');
  };
  hud.hideTip = hideTip;
  // The tooltip takes the hovered tile's tint class (t-bld, t-mil, ...).
  const setTipTint = target => {
    const tint = [...target.classList].find(name => name.startsWith('t-')) || 't-bld';
    if (tipEl._tint === tint) return;
    if (tipEl._tint) tipEl.classList.remove(tipEl._tint);
    tipEl.classList.add(tint);
    tipEl._tint = tint;
  };
  // Centred above the target, or below it when there is no room above; always kept 8px inside the window.
  const placeTip = target => {
    const rect = target.getBoundingClientRect(), width = tipEl.offsetWidth, height = tipEl.offsetHeight;
    const above = rect.top - height - 10;
    tipEl.style.left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.left + rect.width / 2 - width / 2)) + 'px';
    tipEl.style.top = Math.max(8, Math.min(window.innerHeight - height - 8, above < 8 ? rect.bottom + 10 : above)) + 'px';
  };
  const showTip = (target, force) => {
    const round = roundTips.get(target.dataset.tip);
    const html = round ? roundTipHtml(round, ui.roundCaps?.[round.id]) : tips.get(target.dataset.tip);
    if (!html || ui.touch) return hideTip();
    const wasShown = tipEl.classList.contains('show');
    if (!force && wasShown && tipTarget === target) return;
    tipKey = target.dataset.tip;
    tipTarget = target;
    if (tipEl._html !== html) {
      tipEl.innerHTML = html;
      tipEl._html = html;
    }
    setTipTint(target);
    tipEl.classList.toggle('move', wasShown);
    placeTip(target);
    tipEl.classList.add('show');
  };
  document.addEventListener('mouseover', e => {
    const target = e.target.closest?.('[data-tip]');
    if (target) showTip(target);
    else if (tipKey) hideTip();
  });
  document.addEventListener('mouseout', e => { if (!e.relatedTarget) hideTip(); });
  document.addEventListener('focusin', e => {
    const target = e.target.closest?.('[data-tip]');
    if (target) showTip(target);
  });
  document.addEventListener('focusout', hideTip);
  document.addEventListener('scroll', hideTip, { passive: true, capture: true });
  document.addEventListener('click', hideTip);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hideTip(); });
  window.addEventListener('resize', hideTip);

  // ----- delete confirmation -----
  const deleteDialog = $('delete-confirmation');
  let deleteRequest = null;
  const finishDelete = () => {
    const request = deleteRequest;
    if (!request) return;
    deleteRequest = null;
    ui.deleteConfirmOpen = false;
    if (ui.game !== request.game) return;
    ui.paused = request.wasPaused;
    if (deleteDialog.returnValue === 'delete') request.confirm();
    if (request.focus?.isConnected) request.focus.focus({ preventScroll: true });
  };
  deleteDialog.addEventListener('close', () => { if (!deleteDialog.open) finishDelete(); });
  hud.confirmDelete = (building, confirm) => {
    if (deleteRequest || !ui.game || ui.game.result) return;
    hideTip();
    deleteRequest = { game: ui.game, wasPaused: ui.paused, focus: document.activeElement, confirm };
    ui.paused = true;
    ui.deleteConfirmOpen = true;
    $('delete-title').textContent = `Delete ${BUILDINGS[building.type].name}?`;
    deleteDialog.returnValue = 'cancel';
    deleteDialog.showModal();
  };
  hud.cancelDelete = () => {
    if (deleteDialog.open) deleteDialog.close('cancel');
    finishDelete();
  };
  hud.invalidate = () => { revision++; };
  hud.reset = () => {
    lastGame = null;
    updateKey = '';
    cmdKey = '';
    infoKey = '';
  };

  // ----- per-frame update -----
  // Everything the HUD shows depends only on these; when none changed since the last frame, update() does nothing.
  const updateStamp = game => `${game.time}|${!!game.result}|${[...ui.sel]}|${ui.inspect?.id}|${ui.placing}|${ui.paused}`
    + `|${ui.speed}|${ui.boxMode}|${ui.resignArmed}|${ui.deleteConfirmOpen}|${menuHidden()}|${revision}`;

  // The pause modal: shown for a player pause, not while the settings menu or delete dialog (which also pause) is up.
  const updatePauseModal = game => {
    const pauseEl = $('pausemodal');
    const showPause = ui.paused && !game.result && !ui.deleteConfirmOpen && menuHidden();
    if (showPause !== pauseEl.classList.contains('hidden')) return;
    pauseEl.classList.toggle('hidden', !showPause);
    if (!showPause) return;
    hideTip();
    pauseEl.querySelector('button').focus({ preventScroll: true });
  };

  const topBarControlsHtml = () =>
    SPEEDS.map(speed => `<button data-speed="${speed}" class="${ui.speed === speed ? 'on' : ''}">${speed}x</button>`).join('')
    + `<button data-pause="1" class="${ui.paused ? 'on' : ''}">${ui.paused ? 'Resume' : 'Pause'}</button>`
    + `<button data-resign="1" class="${ui.resignArmed ? 'on' : ''}">${ui.resignArmed ? 'Confirm resign?' : 'Resign'}</button>`;

  const topBarHtml = (game, player, objective) => {
    const round = game.rules;
    const resourcesHtml = RES.map(resource => `<span class="res"><i class="dot" style="background:${COLORS[resource]}"></i>`
      + `${Math.floor(player.res[resource])}</span>`).join('');
    const roundAttrs = round ? `data-tip="round:${round.id}" aria-describedby="tip" tabindex="0"` : '';
    const clockLabel = round ? (game.capTicks === Infinity ? ' / no time limit' : ' / time limit') : '';
    const clockHtml = `<span class="res match-clock" ${roundAttrs} aria-label="Elapsed game time${clockLabel}"></span>`;
    const popTitle = `title="Population (${ageTitle(player.age)} limit ${popLimit(player.age)})"`;
    if (ui.touch) {
      return resourcesHtml + `<span class="res" ${popTitle}>&#9823;${player.pop}/${player.popCap}</span>`
        + `<span class="res">${ageLabel(player.age)}${player.ageUp ? '&hellip;' : ''}</span>`
        + `<span style="flex:1"></span>${clockHtml}`
        + '<button data-menu="open" aria-label="Menu">&#9776;</button>';
    }
    return resourcesHtml
      + `<span class="res" ${popTitle}>Pop ${player.pop}/${player.popCap}</span>`
      + `<span class="res">${player.ageUp ? 'Advancing... ' : ''}${ageTitle(player.age)}</span>`
      + `<span class="grow" ${roundAttrs}><b>${round ? round.name : 'Match'}</b> - <span class="obj">${objective}</span></span>`
      + clockHtml
      + topBarControlsHtml()
      + '<button data-menu="open" aria-label="Game settings">Settings</button>';
  };

  const updateIdleBadge = game => {
    let idleCount = 0;
    for (const unit of game.units.values()) {
      if (isIdleWorker(unit)) idleCount++;
    }
    const badge = document.querySelector(ui.touch ? '#touchbar [data-act=idle] .badge' : '#idlebtn .badge');
    const badgeText = idleCount ? String(idleCount) : '';
    if (badge.textContent !== badgeText) badge.textContent = badgeText;
    if (!ui.touch) $('idlebtn').classList.toggle('has', idleCount > 0);
  };

  // Phone only: the objective line, the box-select toggle and the Place / Cancel bar.
  const updateTouchBars = (round, objective) => {
    const objectiveEl = $('objective'), text = round ? `${round.name}: ${objective}` : '';
    if (objectiveEl.textContent !== text) objectiveEl.textContent = text;
    document.querySelector('#touchbar [data-act=box]').classList.toggle('on', !!ui.boxMode);
    $('placebar').classList.toggle('hidden', !ui.placing);
    document.body.classList.toggle('placing', !!ui.placing);
  };

  const renderTopBar = html => {
    if (top._html === html) return;
    // Resource/countdown updates rebuild the bar; keep keyboard focus on its tooltip targets.
    const active = document.activeElement, focusedTip = top.contains(active) && active.matches('[data-tip]');
    const focusSelector = focusedTip ? (active.classList.contains('match-clock') ? '.match-clock' : '.grow') : null;
    const tipWasShown = tipEl.classList.contains('show');
    top.innerHTML = html;
    top._html = html;
    if (!focusSelector) return;
    top.querySelector(focusSelector)?.focus({ preventScroll: true });
    if (!tipWasShown) hideTip();
  };

  const updateClock = game => {
    const clock = top.querySelector('.match-clock');
    const limit = game.rules ? ` / ${game.capTicks === Infinity ? '∞' : fmtTime(game.capTicks)}` : '';
    const clockText = fmtTime(game.time) + limit;
    if (clock.textContent !== clockText) clock.textContent = clockText;
  };

  const DESKTOP_HELP = '<br><br><small>Left-click / drag to select. Right-click to order. WASD or Space + drag pans,'
    + ' wheel zooms. Esc pauses.</small>';
  const infoHtml = (game, player, selected) => {
    const round = game.rules, inspected = ui.inspect && game.entities.get(ui.inspect.id);
    if (selected.length === 1) return describe(selected[0], player, ui.touch);
    if (selected.length) return selectionSummary(selected);
    if (inspected) return describe(inspected, player, ui.touch);
    if (ui.inspect && ui.inspect.kind === 'resource') return `<h3>${ui.inspect.type}</h3>`;
    return `<h3>${round ? round.name : ''}</h3>${round ? round.desc : ''}` + DESKTOP_HELP;
  };

  const updateInfo = (game, player, selected) => {
    const html = infoHtml(game, player, selected);
    if (html === infoKey) return;
    info.innerHTML = html;
    infoKey = html;
  };

  // ----- command tiles -----
  // Changes whenever a tile, its state or its cost line would change: the selection, research timer, techs, Age,
  // resources (in steps of 25), pop cap and placement. The 5-stone Wall is finer than the 25-step buckets.
  const commandKey = (player, ferry, deletable, hasVillagers, building) => {
    const researchLeft = building && building.research ? 'R' + secondsLeft(building.research.remaining, building) : '';
    const queue = building ? building.id + ':' + building.queue.length : '';
    return `${ferry ? 'U' + ferry.id + ':' + ferry.cargo.length : ''}`
      + `${deletable ? 'D' + deletable.id : ''}${hasVillagers ? 'V' : ''}${queue}`
      + `${researchLeft}${player.techs.size}${player.age}${player.ageUp ? 'a' : ''}`
      + `${RES.map(resource => Math.floor(player.res[resource] / 25)).join(',')}`
      + `${canAfford(player, BUILDINGS.wall.cost) ? 'W' : ''}${player.pop >= player.popCap ? 'P' : ''}${ui.placing || ''}`;
  };

  const notesFor = (player, locked, def, short, popFull) => locked
    ? ['Requires ' + ageTitle(def.age)]
    : [...(short.length ? [reasonText('resources')] : []), ...(popFull ? [reasonText(popFullReason(player))] : [])];

  const buildTiles = (player, tiles) => {
    for (const [id, def] of Object.entries(BUILDINGS)) {
      const locked = ageIndex(def.age) > ageIndex(player.age), short = shortOf(player, def.cost);
      const ok = !locked && canAfford(player, def.cost);
      tiles.push(tile(`data-build="${id}"`, { kind: 'building', id, name: def.name, cost: def.cost, tint: tintOf(def), ok,
        lockedAge: locked ? def.age : '', short, notes: notesFor(player, locked, def, short), age: player.age }));
    }
  };

  const trainTiles = (player, building, tiles) => {
    for (const unitId of BUILDINGS[building.type].trains || []) {
      const def = UNITS[unitId], locked = ageIndex(def.age) > ageIndex(player.age), short = shortOf(player, def.cost);
      const popFull = player.pop >= player.popCap, ok = !locked && canAfford(player, def.cost) && !popFull;
      const notes = notesFor(player, locked, def, short, popFull);
      tiles.push(tile(`data-train="${unitId}" data-b="${building.id}"`, { kind: 'unit', id: unitId, name: def.name,
        cost: def.cost, tint: tintOf(def), cls: def.cls, ok, lockedAge: locked ? def.age : '', short, notes }));
    }
  };

  // Why a tech tile is disabled (or how long its research has left); empty when it can be researched.
  const techNotes = (tech, state) => {
    if (state.inProgress) return [`Researching (${secondsLeft(state.building.research.remaining, state.building)}s)`];
    if (state.locked) return ['Requires ' + ageTitle(tech.age)];
    if (state.needsRequired) return ['Needs ' + TECHS[tech.requires].name];
    if (state.busy) return ['Building is busy'];
    return state.short.length ? [reasonText('resources')] : [];
  };

  // Research upgrades for this building type, except those already researched.
  const researchTiles = (player, building, tiles) => {
    for (const [id, tech] of Object.entries(TECHS)) {
      if (tech.building !== building.type || player.techs.has(id)) continue;
      const inProgress = building.research?.tech === id, locked = ageIndex(player.age) < ageIndex(tech.age);
      const needsRequired = tech.requires && !player.techs.has(tech.requires);
      const short = shortOf(player, tech.cost), busy = building.research && !inProgress;
      const ok = !inProgress && !locked && !needsRequired && !busy && canAfford(player, tech.cost);
      const notes = techNotes(tech, { building, inProgress, locked, needsRequired, busy, short });
      tiles.push(tile(`data-research="${id}" data-b="${building.id}"`, { kind: 'tech', id, name: tech.name, cost: tech.cost,
        tint: 't-age', ok, lockedAge: locked ? tech.age : '', short, notes }));
    }
  };

  const ageTile = (player, tiles) => {
    const next = AGES[ageIndex(player.age) + 1];
    if (!next) return;
    const why = ageUpProblem(ui.game, 0), cost = AGE_COST[next].cost;
    const need = why === 'needs buildings' ? ageUpNeed(player.age) : 0;
    const extra = why === 'needs buildings' ? `<span class="c">+${need} bldg${need > 1 ? 's' : ''}</span>` : '';
    tiles.push(tile('data-age="1"', { kind: 'age', id: 'age', next, name: 'Advance: ' + ageLabel(next), cost, tint: 't-age',
      ok: !why, short: shortOf(player, cost), notes: why ? [reasonText(why)] : [], extra, extraClass: ' age' }));
  };

  const commandTiles = (player, villagers, building, ferry, deletable) => {
    const tiles = [];
    if (villagers.length) buildTiles(player, tiles);
    if (building) {
      trainTiles(player, building, tiles);
      researchTiles(player, building, tiles);
      if (building.type === 'town_center') ageTile(player, tiles);
    }
    if (ferry) {
      tiles.push(tile(`data-unload="${ferry.id}"`, { kind: 'unload', id: 'unload', name: 'Unload', cost: {}, tint: 't-age',
        ok: true, extra: `<span class="c">${ferry.cargo.length} aboard</span>` }));
    }
    if (deletable) {
      tiles.push(tile(`data-delete="${deletable.id}"`, { kind: 'delete', id: 'delete', name: 'Delete', cost: {}, tint: 't-del',
        ok: true, extra: '<span class="c">No refund</span>' }));
    }
    return tiles;
  };

  // Rebuild the panel only when the tile set changed; otherwise patch each tile's enabled state and cost line.
  const renderCommands = tiles => {
    const structure = tiles.map(entry => entry.key).join('|');
    if (structure !== cmds._struct) {
      cmds.innerHTML = tiles.map(entry => entry.html).join('');
      cmds._struct = structure;
    } else {
      for (let i = 0; i < tiles.length; i++) {
        const entry = tiles[i], tileEl = cmds.children[i], small = tileEl.querySelector('small');
        tileEl.classList.toggle('off', entry.off);
        tileEl.setAttribute('aria-disabled', entry.off);
        if (small.innerHTML !== entry.small) small.innerHTML = entry.small;
      }
    }
    if (!tipKey || roundTips.has(tipKey)) return;
    const hovered = cmds.querySelector(`[data-tip="${tipKey}"]`);
    if (hovered) showTip(hovered, true);
    else hideTip();
  };

  const updateCommands = (player, selected) => {
    const own = selected.filter(entity => entity.owner === 0), villagers = own.filter(entity => entity.type === 'villager');
    const building = own.find(entity => entity.kind === 'building' && entity.constructed);
    // Every selected own building, foundations too, uses the same confirmation dialog.
    const deletable = own.find(entity => entity.kind === 'building');
    const ferry = own.find(entity => entity.cargo?.length); // a loaded Transport Ship gets an Unload tile
    const key = commandKey(player, ferry, deletable, villagers.length, building);
    if (key === cmdKey) return;
    cmdKey = key;
    tips.clear();
    renderCommands(commandTiles(player, villagers, building, ferry, deletable));
  };

  hud.update = () => {
    const game = ui.game;
    if (!game) return;
    const stamp = updateStamp(game);
    if (lastGame === game && updateKey === stamp) return;
    lastGame = game;
    updateKey = stamp;
    const player = game.players[0], round = game.rules;
    updatePauseModal(game);
    const objective = objectiveText(game);
    const html = topBarHtml(game, player, objective);
    updateIdleBadge(game);
    if (ui.touch) updateTouchBars(round, objective);
    renderTopBar(html);
    updateClock(game);
    const selected = [...ui.sel].map(id => game.entities.get(id)).filter(Boolean);
    updateInfo(game, player, selected);
    updateCommands(player, selected);
    document.body.classList.toggle('has-cmds', cmds.children.length > 0);
  };

  // ----- settings menu -----
  const graphicsHtml = () => {
    const options = Object.entries(QUALITY).map(([id, option]) => {
      const on = ui.view?.quality === id;
      return `<button class="btn ${on ? 'on' : ''}" data-quality="${id}" aria-pressed="${on}">${option.label}</button>`;
    });
    return `<fieldset class="graphics"><legend>Graphics quality</legend><div class="quality-options">${options.join('')}</div>`
      + '<p>High adds richer lighting and grass. Ultra sharpens shadows and detail. Balanced uses less power.</p></fieldset>';
  };
  const menuHtml = () => {
    const speeds = SPEEDS.map(speed =>
      `<button class="btn ${ui.speed === speed ? 'on' : ''}" data-speed="${speed}">${speed}x</button>`);
    return `<div class="card"><h2>Menu</h2><button class="btn" data-menu="close">Resume game</button>`
      + `<div class="row">${speeds.join('')}</div>`
      + `<button class="btn" data-resign="1">${ui.resignArmed ? 'Confirm resign?' : 'Resign'}</button>`
      + `<button class="btn" data-quit="1">${ui.quitArmed ? 'Confirm quit?' : 'Quit to menu'}</button></div>`;
  };
  // Opens the menu, or re-renders it in place when it is already open (after a speed / quality / arming click).
  hud.openMenu = () => {
    const menuEl = $('gamemenu'), opening = menuEl.classList.contains('hidden');
    if (opening) {
      ui._menuFocus = document.activeElement;
      ui._wasPaused = ui.paused;
      ui.paused = true;
    }
    menuEl.innerHTML = menuHtml();
    menuEl.querySelector('.card').insertAdjacentHTML('beforeend', graphicsHtml());
    menuEl.setAttribute('role', 'dialog');
    menuEl.setAttribute('aria-modal', 'true');
    menuEl.setAttribute('aria-label', 'Game settings');
    menuEl.classList.remove('hidden');
    if (opening) menuEl.querySelector('[data-menu="close"]').focus();
  };
  hud.closeMenu = () => {
    const menuEl = $('gamemenu');
    if (menuEl.classList.contains('hidden')) return;
    menuEl.classList.add('hidden');
    ui.paused = !!ui._wasPaused;
    (ui._menuFocus?.isConnected ? ui._menuFocus : top.querySelector('[data-menu="open"]'))?.focus();
  };
  // Esc closes the menu; Tab and Shift+Tab cycle through its buttons.
  $('gamemenu').addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      hud.closeMenu();
    }
    if (e.key !== 'Tab') return;
    const buttons = [...$('gamemenu').querySelectorAll('button')], first = buttons[0], last = buttons.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  // ----- button clicks -----
  // Quit and Resign ask twice: the first click arms the button for 3 seconds.
  const arm = field => {
    ui[field] = true;
    setTimeout(() => { ui[field] = false; }, 3000);
  };
  const onQuality = quality => {
    ui.view?.setQuality(quality);
    hud.openMenu();
    $('gamemenu').querySelector(`[data-quality="${ui.view.quality}"]`)?.focus();
  };
  const onQuit = () => {
    if (ui.quitArmed) {
      ui.quitArmed = false;
      hud.closeMenu();
      return ui.quit();
    }
    arm('quitArmed');
    return hud.openMenu();
  };
  const onResign = () => {
    if (ui.resignArmed) {
      ui.resignArmed = false;
      ui.game.command(0, { type: 'resign' });
      hud.closeMenu();
      return;
    }
    arm('resignArmed');
    if (!menuHidden()) hud.openMenu();
  };
  // Shift-click queues five.
  const onTrain = (button, shiftKey) => {
    const count = shiftKey ? 5 : 1;
    for (let i = 0; i < count; i++) {
      const result = ui.cmd({ type: 'train', buildingId: +button.dataset.b, unit: button.dataset.train });
      if (!result.ok) break;
    }
  };
  // Tile clicks change what the panel shows, so they also force a rebuild of the command tiles.
  const onTileClick = (button, e) => {
    const data = button.dataset;
    if (data.delete) ui.actions?.delete(+data.delete);
    else if (data.unload) ui.cmd({ type: 'unload', transportId: +data.unload });
    else if (data.build) return ui.startPlacing(data.build);
    else if (data.train) onTrain(button, e.shiftKey);
    else if (data.research) ui.cmd({ type: 'research', buildingId: +data.b, tech: data.research });
    else if (data.age) ui.cmd({ type: 'age' });
    else return;
    cmdKey = '';
  };
  document.addEventListener('click', e => {
    const button = e.target.closest('button');
    if (!button || button.classList.contains('off')) return;
    const data = button.dataset;
    if (data.menu === 'open') return hud.openMenu();
    if (data.menu === 'close') return hud.closeMenu();
    if (data.quality) return onQuality(data.quality);
    if (data.act) return ui.actions?.[data.act]?.();
    if (data.quit) return onQuit();
    if (data.speed) ui.setSpeed(+data.speed);
    else if (data.pause) ui.togglePause();
    else if (data.resign) onResign();
    else onTileClick(button, e);
  });
  return hud;
}
