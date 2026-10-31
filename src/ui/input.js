import { BUILDINGS } from '../data/buildings.js';
import { UNITS } from '../data/units.js';
import { canPlace, canAfford } from '../sim/commands.js';
import { lineTiles } from '../sim/util.js';

// A worker of the player's with nothing to do: a villager or Fishing Ship standing idle (not riding a transport).
// The idle button counts and cycles through these.
export const isIdleWorker = unit => unit.owner === 0 && (unit.type === 'villager' || unit.type === 'fishing_ship')
  && unit.order.type === 'idle' && !unit.aboard;

// The ghost line for a wall: ok[i] is canPlace for tiles[i], the per-tile check the wall command uses; a repeated tile is listed
// (and counted) once. Placement only: stone is not checked here, the command's 'resources' toast covers that. DOM-free.
export function wallPlan(game, pid, tiles) {
  const seen = new Set(), uniqueTiles = [], ok = [];
  let count = 0;
  for (const tile of tiles) {
    const key = `${tile.x},${tile.y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const placeable = canPlace(game, pid, 'wall', tile.x, tile.y);
    if (placeable) count++;
    uniqueTiles.push(tile);
    ok.push(placeable);
  }
  return { tiles: uniqueTiles, ok, count };
}

// Buttons and keyboard shortcuts share this confirmation gate. Recheck the captured match/target before deleting.
export function requestBuildingDeletion(ui, id) {
  const game = ui.game, building = game?.entities.get(id);
  if (!building || building.kind !== 'building' || building.owner !== 0 || game.result) return;
  ui.confirmDelete?.(building, () => {
    if (ui.game !== game || game.result || game.entities.get(id) !== building || building.owner !== 0) return;
    if (ui.cmd({ type: 'delete', id }).ok) {
      ui.sel.delete(id);
      ui.toast?.(`${BUILDINGS[building.type].name} deleted`);
    }
  });
}

// Own, finished and damaged: villagers ordered onto it repair it (a Farm or Mine is gathered from instead).
const repairable = target => target && target.kind === 'building' && target.owner === 0 && target.constructed
  && !target.gatherType && target.hp < target.maxHp;

// Mouse + keyboard (desktop) and touch (phone) input. Both paths share selectOwn/orderAt so behaviour matches.
export function createInput(ui) {
  const viewportEl = document.getElementById('viewport'), dragBox = document.getElementById('dragbox');
  const keys = new Set(), drag = { on: false, x: 0, y: 0, moved: false };
  let mouse = { x: 0, y: 0 }, lastClick = { t: 0, id: -1 }, shiftDown = false;
  // desktop wall drag: the start tile while the button is held, and the last tile under the cursor
  let wallDragStart = null, wallDragEnd = null;
  let spaceDown = false, grab = null; // hold Space and left-drag to pan: grab is the last cursor point while dragging
  const game = () => ui.game;
  const isVillager = id => game().entities.get(id).type === 'villager';
  const walks = id => !game().entities.get(id).naval;
  // Villagers and Fishing Ships both gather; the command sends each only to its own kind of resource (fish are the ships').
  const gathers = id => {
    const entity = game().entities.get(id);
    return entity.type === 'villager' || UNITS[entity.type].capacity;
  };
  const isLoadedTransport = id => game().entities.get(id).cargo?.length;
  const selectedUnitIds = () => [...ui.sel].filter(id => game().entities.get(id)?.kind === 'unit');
  const selectedVillagerIds = () => selectedUnitIds().filter(isVillager);
  const setSelection = ids => {
    ui.sel.clear();
    for (const id of ids) ui.sel.add(id);
    ui.inspect = null;
  };
  // The building the Delete tile and key act on: the first own building in the selection, finished or not (same pick as the HUD).
  const selectedBuilding = () => [...ui.sel].map(id => game().entities.get(id))
    .find(entity => entity && entity.kind === 'building' && entity.owner === 0) || null;
  const onScreen = unit => {
    const point = ui.view.project(unit.x, unit.y), rect = viewportEl.getBoundingClientRect();
    return point.x > rect.left && point.x < rect.right && point.y > rect.top && point.y < rect.bottom;
  };
  // The top-left tile of the building being placed, centred on the ground under a screen point.
  const tileForPlacing = (screenX, screenY) => {
    const ground = ui.view.pickGround(screenX, screenY);
    if (!ground) return null;
    const size = BUILDINGS[ui.placing].size;
    return { x: Math.round(ground.x - size / 2), y: Math.round(ground.y - size / 2) };
  };
  const showDragBox = (fromX, fromY, toX, toY) => {
    dragBox.classList.remove('hidden');
    Object.assign(dragBox.style, {
      left: Math.min(fromX, toX) + 'px', top: Math.min(fromY, toY) + 'px',
      width: Math.abs(toX - fromX) + 'px', height: Math.abs(toY - fromY) + 'px',
    });
  };
  const hideDragBox = () => dragBox.classList.add('hidden');
  const keepPlacing = () => shiftDown && !ui.touch;

  // ----- shared logic -----
  // Left-click / tap on an own entity: select, double-click selects all of that type on screen.
  function selectOwn(entity, additive) {
    const now = performance.now();
    if (additive) {
      if (ui.sel.has(entity.id)) ui.sel.delete(entity.id);
      else ui.sel.add(entity.id);
    } else if (entity.kind === 'unit' && now - lastClick.t < 350 && lastClick.id === entity.id) {
      const sameType = game().visibleEntities(0).filter(unit => unit.owner === 0 && unit.type === entity.type && onScreen(unit));
      setSelection(sameType.map(unit => unit.id));
    } else setSelection([entity.id]);
    lastClick = { t: now, id: entity.id };
  }
  // The order for right-clicking (or tapping) an entity, or null when the click is just a move to that spot.
  function contextCommand(target, ids) {
    const kind = target.kind, villagerIds = ids.filter(isVillager);
    // Own Transport Ship under the pointer: everyone selected who walks goes aboard.
    const walkerIds = ids.filter(walks);
    if (kind === 'unit' && target.owner === 0 && target.cargo && walkerIds.length) {
      return { type: 'board', ids: walkerIds, transportId: target.id };
    }
    if ((kind === 'unit' || kind === 'building') && target.owner != null && target.owner !== 0) {
      return { type: 'attack', ids, targetId: target.id };
    }
    if (kind === 'resource') return { type: 'gather', ids: ids.filter(gathers), resourceId: target.id };
    const ownBuilding = kind === 'building' && target.owner === 0;
    if (ownBuilding && target.gatherType && target.constructed) {
      return { type: 'gather', ids: villagerIds, resourceId: target.id };
    }
    if (ownBuilding && !target.constructed) return { type: 'construct', ids: villagerIds, targetId: target.id };
    if (villagerIds.length && repairable(target)) return { type: 'repair', ids: villagerIds, targetId: target.id };
    if (kind === 'relic') return { type: 'relic', ids, relicId: target.id };
    return null;
  }
  // Loaded transports sent onto ground land everyone there (the rest of the selection moves as usual).
  function unloadAt(ground, ids, loaded) {
    let result = null;
    for (const id of loaded) result = ui.cmd({ type: 'unload', transportId: id, x: ground.x, y: ground.y });
    const rest = ids.filter(id => !loaded.includes(id));
    return rest.length ? ui.cmd({ type: 'move', ids: rest, x: ground.x, y: ground.y, ferry: true }) : result;
  }
  const isDeepWater = ground => {
    const map = game().map;
    return map.tiles[Math.floor(ground.y) * map.size + Math.floor(ground.x)] === 1;
  };
  // Right-click / tap-with-selection: the context order for whatever is under the pointer.
  function orderAt(target, ground, ids) {
    const command = target ? contextCommand(target, ids) : null;
    if (command) return ui.cmd(command);
    const loaded = ids.filter(isLoadedTransport);
    if (ground && loaded.length && !isDeepWater(ground)) return unloadAt(ground, ids, loaded);
    // Walkers sent to another island are ferried over by the free Transport Ships (commands.js ferryPlan).
    if (ground) return ui.cmd({ type: 'move', ids, x: ground.x, y: ground.y, ferry: true });
    return null;
  }
  // Orders the selected units at a screen point and drops a marker on the ground when the order took.
  function orderAtPoint(entity, ground, ids) {
    const result = orderAt(entity, ground, ids);
    if (result && result.ok && ground) ui.marker(ground.x, ground.y);
  }
  function boxSelect(x0, y0, x1, y1, additive) {
    const left = Math.min(x0, x1), right = Math.max(x0, x1), top = Math.min(y0, y1), bottom = Math.max(y0, y1);
    const inBox = entity => {
      const centre = entity.kind === 'building' ? { x: entity.x + entity.size / 2, y: entity.y + entity.size / 2 } : entity;
      const point = ui.view.project(centre.x, centre.y);
      return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom;
    };
    const mine = game().visibleEntities(0).filter(entity => entity.owner === 0 && inBox(entity));
    // Units win over buildings; with no unit in the box, the first building is picked.
    const units = mine.filter(entity => entity.kind === 'unit');
    const picked = units.length ? units : mine.filter(entity => entity.kind === 'building').slice(0, 1);
    if (additive) for (const entity of picked) ui.sel.add(entity.id);
    else setSelection(picked.map(entity => entity.id));
  }
  function place(tile) {
    if (!tile) return;
    const result = ui.cmd({ type: 'build', ids: selectedVillagerIds(), building: ui.placing, x: tile.x, y: tile.y });
    if (result.ok && !keepPlacing()) ui.stopPlacing();
  }
  // Issue a wall line from tile `from` to tile `to`; toasts the placed count and stone spent (ui.cmd toasts a failure's reason).
  function placeWall(from, to) {
    const tiles = lineTiles(from, to);
    const result = ui.cmd({ type: 'wall', ids: selectedVillagerIds(), tiles });
    if (result.ok) {
      const placed = result.placed < tiles.length ? `${result.placed} of ${tiles.length}` : result.placed;
      const stone = result.placed * BUILDINGS.wall.cost.stone;
      ui.toast?.(`Wall: ${placed} tile${tiles.length > 1 ? 's' : ''} placed, ${stone} stone`);
    }
    if (result.ok && !keepPlacing()) ui.stopPlacing();
    return result;
  }
  // Phone: the first tap sets the start, the second the end; a third starts a new line. Place (place-ok) issues it.
  function wallTap(x, y) {
    const tile = tileForPlacing(x, y);
    if (!tile) return;
    if (!ui.wallStart || ui.wallEnd) {
      ui.wallStart = tile;
      ui.wallEnd = null;
    } else ui.wallEnd = tile;
  }
  const idleWorkers = () => game().visibleEntities(0).filter(isIdleWorker);
  ui.actions = {
    idle() { // cycles through the idle villagers and Fishing Ships, one per press
      const idle = idleWorkers();
      if (!idle.length) return ui.toast?.('No idle villagers or fishing ships');
      ui.idleIdx = (ui.idleIdx || 0) % idle.length;
      const worker = idle[ui.idleIdx++];
      setSelection([worker.id]);
      ui.view.centerOn(worker.x, worker.y);
    },
    home() {
      const townCenter = [...game().buildings.values()].find(building => building.owner === 0 && building.type === 'town_center');
      if (!townCenter) return;
      ui.view.centerOn(townCenter.x + 1.5, townCenter.y + 1.5);
      setSelection([townCenter.id]);
    },
    box() { ui.boxMode = !ui.boxMode; },
    clear() {
      ui.stopPlacing();
      ui.boxMode = false;
      setSelection([]);
    },
    'place-ok'() {
      if (ui.placing === 'wall') {
        if (!ui.wallStart) return ui.toast?.('Tap where the wall starts');
        if (!ui.wallEnd) return ui.toast?.('Tap where the wall ends');
        return placeWall(ui.wallStart, ui.wallEnd);
      }
      if (ui.placing && ui.placeTile) place(ui.placeTile);
    },
    'place-cancel'() { ui.stopPlacing(); },
    delete(id) { requestBuildingDeletion(ui, id); },
  };

  // ----- mouse (desktop) -----
  viewportEl.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    if (spaceDown && ui.game) {
      grab = { x: e.clientX, y: e.clientY };
      viewportEl.classList.add('grabbing');
      return;
    }
    drag.on = true;
    drag.x = e.clientX;
    drag.y = e.clientY;
    drag.moved = false;
    if (ui.game && ui.placing === 'wall') wallDragStart = wallDragEnd = tileForPlacing(e.clientX, e.clientY);
  });
  window.addEventListener('mousemove', e => {
    mouse = { x: e.clientX, y: e.clientY };
    if (grab) {
      if (ui.game) panBy(grab, mouse);
      grab = mouse;
      return;
    }
    if (!drag.on) return;
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) drag.moved = true;
    if (drag.moved && !ui.placing) showDragBox(drag.x, drag.y, e.clientX, e.clientY);
  });
  window.addEventListener('mouseup', e => {
    if (e.button === 0 && grab) {
      grab = null;
      viewportEl.classList.remove('grabbing');
      return;
    }
    if (e.button !== 0 || !drag.on) return;
    drag.on = false;
    hideDragBox();
    const start = wallDragStart;
    wallDragStart = null;
    // a wall drag ends wherever the button is let go, even over the HUD: the ghost line showed the ground tile under the cursor
    if (start && ui.game && ui.placing === 'wall') {
      return placeWall(start, tileForPlacing(e.clientX, e.clientY) || wallDragEnd || start);
    }
    if (!viewportEl.contains(e.target) || !ui.game) return;
    if (ui.placing === 'wall') return;
    if (ui.placing) return place(tileForPlacing(e.clientX, e.clientY));
    if (drag.moved) return boxSelect(drag.x, drag.y, e.clientX, e.clientY, shiftDown);
    clickAt(e);
  });
  // A plain left click: select an own unit or building, or inspect anything else.
  function clickAt(e) {
    const entity = ui.view.pickEntity(e.clientX, e.clientY);
    if (!entity) return setSelection([]);
    if (entity.owner === 0 && (entity.kind === 'unit' || entity.kind === 'building')) selectOwn(entity, e.shiftKey);
    else {
      setSelection([]);
      ui.inspect = entity;
    }
  }
  window.addEventListener('keydown', e => {
    if (ui.deleteConfirmOpen) return;
    shiftDown = e.shiftKey;
    keys.add(e.key.toLowerCase());
    onKey(e);
  });
  window.addEventListener('keyup', e => {
    shiftDown = e.shiftKey;
    keys.delete(e.key.toLowerCase());
    if (e.key === ' ' && spaceDown) { // Firefox clicks a focused button on Space keyup
      e.preventDefault();
      setSpace(false);
    }
  });
  window.addEventListener('blur', () => {
    keys.clear();
    setSpace(false);
  });
  function setSpace(on) {
    spaceDown = on;
    viewportEl.classList.toggle('grab', on);
    if (on) return;
    grab = null;
    viewportEl.classList.remove('grabbing');
  }
  viewportEl.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (!ui.game) return;
    if (ui.placing) {
      cancelDrag();
      return ui.stopPlacing();
    }
    const ids = selectedUnitIds();
    if (!ids.length) return;
    const result = orderAt(ui.view.pickEntity(e.clientX, e.clientY), ui.view.pickGround(e.clientX, e.clientY), ids);
    const ground = ui.view.pickGround(e.clientX, e.clientY);
    if (result && result.ok && ground) ui.marker(ground.x, ground.y);
  });
  viewportEl.addEventListener('wheel', e => {
    e.preventDefault();
    if (ui.view) ui.view.setZoom(ui.view.zoom * (e.deltaY > 0 ? 1.1 : 0.9));
  }, { passive: false });
  // Cancelling a placement mid-drag (Esc / right-click) also ends the drag, so letting go of the button neither places
  // nor box-selects.
  function cancelDrag() {
    drag.on = false;
    wallDragStart = null;
    hideDragBox();
  }
  function onKey(e) {
    if (!ui.game) return;
    // Esc cancels a placement first; otherwise it pauses and resumes. While paused (the pause modal) other shortcuts wait.
    if (e.key === 'Escape') return onEscape(e);
    if (ui.paused) return;
    if (e.key === ' ') { // held Space + left-drag pans the map
      e.preventDefault();
      if (!e.repeat) setSpace(true);
    } else if (e.key === 'Delete' || e.key === 'Backspace') deleteKey(e);
    else if (e.key === '.') ui.actions.idle();
    else if (e.key.toLowerCase() === 'h') ui.actions.home();
    else if (e.key === '+' || e.key === '=') ui.view.setZoom(ui.view.zoom * 0.9);
    else if (e.key === '-') ui.view.setZoom(ui.view.zoom * 1.1);
  }
  function onEscape(e) {
    if (ui.placing) {
      cancelDrag();
      ui.stopPlacing();
    } else if (!ui.game.result) {
      e.preventDefault();
      ui.togglePause();
    }
  }
  // Backspace is the Mac "delete" key; held keys must not auto-repeat requests.
  function deleteKey(e) {
    const building = selectedBuilding();
    if (!building) return;
    e.preventDefault();
    if (!e.repeat) ui.actions.delete(building.id);
  }

  // ----- minimap (mouse + touch) -----
  const minimapEl = document.getElementById('minimap');
  const minimapPoint = (screenX, screenY) => {
    const rect = minimapEl.getBoundingClientRect();
    const canvasX = (screenX - rect.left) * minimapEl.width / rect.width;
    const canvasY = (screenY - rect.top) * minimapEl.height / rect.height;
    return ui.minimap.toWorld(canvasX, canvasY);
  };
  minimapEl.addEventListener('mousedown', e => {
    if (!ui.game) return;
    const world = minimapPoint(e.clientX, e.clientY);
    if (e.button === 0) ui.view.centerOn(world.x, world.y);
    else if (e.button === 2) { // right-click on the minimap moves the selected units there (by sea, if need be)
      const ids = selectedUnitIds();
      if (ids.length) ui.cmd({ type: 'move', ids, x: world.x, y: world.y, ferry: true });
    }
  });
  minimapEl.addEventListener('contextmenu', e => e.preventDefault());
  const minimapTouch = e => {
    e.preventDefault();
    if (!ui.game) return;
    const touch = e.touches[0] || e.changedTouches[0];
    const world = minimapPoint(touch.clientX, touch.clientY);
    ui.view.centerOn(world.x, world.y);
  };
  minimapEl.addEventListener('touchstart', minimapTouch, { passive: false });
  minimapEl.addEventListener('touchmove', minimapTouch, { passive: false });

  // ----- touch (phone) -----
  // 1 finger: tap = select / order, drag = pan (or box-select in box mode). 2 fingers: pinch-zoom + pan.
  const gesture = { start: null, last: null, moved: false, pinch: null };
  const touchPoints = e => [...e.touches].map(touch => ({ x: touch.clientX, y: touch.clientY }));
  const pinchOf = (a, b) => ({ distance: Math.hypot(a.x - b.x, a.y - b.y), centre: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } });
  const resetGesture = () => {
    gesture.start = null;
    gesture.pinch = null;
    gesture.moved = false;
  };
  function panBy(prev, cur) { // keep the world point under the finger fixed
    const view = ui.view, from = view.pickGround(prev.x, prev.y), to = view.pickGround(cur.x, cur.y);
    if (!from || !to) return;
    view.pan(from.x - to.x, from.y - to.y);
    view.refreshCamera();
  }
  function setPlaceTile(x, y) {
    const tile = tileForPlacing(x, y);
    if (tile) ui.placeTile = tile;
  }
  function tap(x, y) {
    if (ui.placing === 'wall') return wallTap(x, y);
    if (ui.placing) return setPlaceTile(x, y);
    const entity = ui.view.pickEntity(x, y), ground = ui.view.pickGround(x, y), ids = selectedUnitIds();
    const own = entity && entity.owner === 0 && (entity.kind === 'unit' || entity.kind === 'building');
    // Tapping an own building the selected villagers can work on (build, gather from, repair) orders them there
    // instead of selecting it.
    const villagersCanWork = own && entity.kind === 'building' && ids.some(isVillager)
      && (!entity.constructed || (entity.gatherType && entity.constructed) || repairable(entity));
    const boards = own && entity.cargo && ids.some(walks); // a tap on own transport with walkers selected: board it
    if (own && !villagersCanWork && !boards) return selectOwn(entity, false);
    if (ids.length) return orderAtPoint(entity, ground, ids);
    setSelection([]);
    if (entity) ui.inspect = entity;
  }
  viewportEl.addEventListener('touchstart', e => {
    e.preventDefault();
    if (!ui.game) return;
    const points = touchPoints(e);
    if (points.length >= 2) {
      gesture.moved = true;
      hideDragBox();
      const [a, b] = points;
      gesture.pinch = pinchOf(a, b);
      gesture.last = null;
      return;
    }
    gesture.start = { ...points[0], t: performance.now() };
    gesture.last = points[0];
    gesture.moved = false;
    gesture.pinch = null;
    // a wall end is set only by a finished tap (touchEnd), so pans and pinches leave it alone
    if (ui.placing && ui.placing !== 'wall') setPlaceTile(points[0].x, points[0].y);
  }, { passive: false });
  // Two fingers: zoom about the pinch centre, so the world point under the fingers stays under them.
  function pinchMove(a, b) {
    const pinch = pinchOf(a, b);
    const view = ui.view, anchor = view.pickGround(gesture.pinch.centre.x, gesture.pinch.centre.y);
    if (pinch.distance > 8 && gesture.pinch.distance > 8) {
      view.setZoom(view.zoom * gesture.pinch.distance / pinch.distance);
      view.refreshCamera();
    }
    const now = view.pickGround(pinch.centre.x, pinch.centre.y);
    if (anchor && now) {
      view.pan(anchor.x - now.x, anchor.y - now.y);
      view.refreshCamera();
    }
    gesture.pinch = pinch;
  }
  viewportEl.addEventListener('touchmove', e => {
    e.preventDefault();
    if (!ui.game) return;
    const points = touchPoints(e);
    if (points.length >= 2 && gesture.pinch) {
      const [a, b] = points;
      return pinchMove(a, b);
    }
    if (points.length !== 1 || !gesture.start) return;
    const cur = points[0], start = gesture.start;
    if (!gesture.moved && Math.hypot(cur.x - start.x, cur.y - start.y) > 10) gesture.moved = true;
    if (!gesture.moved) return;
    if (ui.placing && ui.placing !== 'wall') setPlaceTile(cur.x, cur.y);
    else if (ui.boxMode && !ui.placing) showDragBox(start.x, start.y, cur.x, cur.y);
    else panBy(gesture.last, cur);
    gesture.last = cur;
  }, { passive: false });
  const touchEnd = e => {
    e.preventDefault();
    hideDragBox();
    if (e.touches.length > 0) { // one finger of a gesture lifted
      gesture.pinch = null;
      gesture.moved = true;
      gesture.start = null;
      return;
    }
    if (gesture.start && ui.game) {
      const start = gesture.start, last = gesture.last || start;
      if (!gesture.moved && performance.now() - start.t < 500) tap(start.x, start.y);
      else if (gesture.moved && ui.boxMode && !ui.placing) boxSelect(start.x, start.y, last.x, last.y, false);
    }
    resetGesture();
  };
  viewportEl.addEventListener('touchend', touchEnd, { passive: false });
  viewportEl.addEventListener('touchcancel', e => {
    e.preventDefault();
    hideDragBox();
    resetGesture();
  }, { passive: false });
  // stop iOS from zooming / scrolling the page underneath the game
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(type, e => e.preventDefault());

  // ----- per frame: keyboard panning and the placement ghosts -----
  function panWithKeys(dt) {
    const step = 22 * dt * (ui.view.halfExtents()[1] / 14); // pan by what is on screen, not the raw zoom level
    let dx = 0, dz = 0;
    if (keys.has('a') || keys.has('arrowleft')) { dx -= 1; dz += 1; }
    if (keys.has('d') || keys.has('arrowright')) { dx += 1; dz -= 1; }
    if (keys.has('w') || keys.has('arrowup')) { dx -= 1; dz -= 1; }
    if (keys.has('s') || keys.has('arrowdown')) { dx += 1; dz += 1; }
    if (dx || dz) ui.view.pan(dx * step * 0.7, dz * step * 0.7);
  }
  // desktop: the hovered tile, or the dragged line; phone: the start tile, then the tapped line
  function showWallGhost() {
    ui.view.showGhost(null);
    let from, to;
    if (ui.touch) {
      from = ui.wallStart;
      to = ui.wallEnd || from;
    } else {
      const hovered = tileForPlacing(mouse.x, mouse.y);
      if (hovered) wallDragEnd = hovered;
      from = wallDragStart || hovered;
      to = wallDragStart ? wallDragEnd : hovered;
    }
    if (!from || !to) return ui.view.showGhostLine(null);
    const plan = wallPlan(game(), 0, lineTiles(from, to));
    ui.view.showGhostLine(plan.tiles, plan.ok);
  }
  function showBuildingGhost() {
    ui.view.showGhostLine(null);
    const tile = ui.touch ? ui.placeTile : tileForPlacing(mouse.x, mouse.y);
    if (!tile) return;
    const ok = canPlace(game(), 0, ui.placing, tile.x, tile.y) && canAfford(game().players[0], BUILDINGS[ui.placing].cost);
    ui.view.showGhost(ui.placing, tile.x, tile.y, ok);
  }

  return { update(dt) {
    if (!ui.game) return;
    if (ui.deleteConfirmOpen) {
      keys.clear();
      return;
    }
    panWithKeys(dt);
    if (ui.placing === 'wall') showWallGhost();
    else if (ui.placing) showBuildingGhost();
    else wallDragStart = null;
  } };
}
