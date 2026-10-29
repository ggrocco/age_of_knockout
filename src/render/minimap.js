import { OWNER_COLOR } from './view.js';

// Land, water, gold vein, quarry, shallows (by tile value).
const TILE_COLORS = ['#4a7a35', '#2b5f8c', '#8a7a3a', '#7d7d78', '#5f93a8'];
const RESOURCE_COLORS = { tree: '#1f4d1f', berry: '#b0208f', gold: '#facc15', stone: '#9ca3af', fish: '#9be7ff' };
const hex = color => '#' + color.toString(16).padStart(6, '0');

function layerCanvas(width, height) {
  const layer = document.createElement('canvas');
  layer.width = width;
  layer.height = height;
  return { layer, context: layer.getContext('2d') };
}

// Diamond (isometric) minimap. Sim (x,y) -> canvas via rotation so it matches the main view orientation.
export function createMinimap(canvas, game, view) {
  const size = game.map.size, ctx = canvas.getContext('2d'), width = canvas.width, height = canvas.height;
  const scale = width / (2 * size) * 0.98; // canvas pixels per tile, along the diamond's half-width
  const toCanvas = (x, y) => ({ x: width / 2 + (x - y) * scale, y: height / 2 + (x + y - size) * scale * 0.5 });
  const toWorld = (canvasX, canvasY) => {
    const across = (canvasX - width / 2) / scale, down = (canvasY - height / 2) / (scale * 0.5) + size;
    return { x: (across + down) / 2, y: (down - across) / 2 };
  };

  // Ore patches come and go, so the terrain layer is redrawn whenever terrainVersion moves on.
  const terrain = layerCanvas(width, height);
  let terrainStamp = -1;
  const updateTerrain = () => {
    if (game.terrainVersion === terrainStamp) return;
    terrainStamp = game.terrainVersion;
    terrain.context.clearRect(0, 0, width, height);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const at = toCanvas(x + 0.5, y + 0.5);
      terrain.context.fillStyle = TILE_COLORS[game.map.tiles[y * size + x]] ?? TILE_COLORS[0];
      terrain.context.fillRect(at.x - scale, at.y - scale * 0.5, scale * 2 + 0.5, scale + 0.5);
    }
  };

  // Fog shading is redrawn only when vision changes (every 4 ticks), not on every minimap draw.
  const fog = layerCanvas(width, height);
  let fogStamp = -1;
  const updateFog = player => {
    if (game.time === fogStamp || game.time % 4 !== 0 && fogStamp >= 0) return;
    fogStamp = game.time;
    fog.context.clearRect(0, 0, width, height);
    for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
      const i = y * size + x;
      if (player.visible[i]) continue;
      const at = toCanvas(x + 0.5, y + 0.5);
      fog.context.fillStyle = player.explored[i] ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.88)';
      fog.context.fillRect(at.x - scale, at.y - scale * 0.5, scale * 2, scale);
    }
  };

  // Resources the player knows of, then relics and every visible unit and building in its owner's colour.
  const drawEntities = () => {
    for (const resource of game.knownResources(0)) {
      const at = toCanvas(resource.x, resource.y);
      ctx.fillStyle = RESOURCE_COLORS[resource.type];
      ctx.fillRect(at.x - 1, at.y - 1, 2, 2);
    }
    for (const e of game.visibleEntities(0)) {
      if (e.kind === 'relic') {
        const at = toCanvas(e.x, e.y);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(at.x - 2, at.y - 2, 4, 4);
        continue;
      }
      const building = e.kind === 'building';
      const at = building ? toCanvas(e.x + e.size / 2, e.y + e.size / 2) : toCanvas(e.x, e.y), dot = building ? 4 : 2.5;
      ctx.fillStyle = hex(OWNER_COLOR[e.owner]);
      ctx.fillRect(at.x - dot / 2, at.y - dot / 2, dot, dot);
    }
  };

  // The main view's footprint as a white frame.
  const drawViewport = () => {
    const focus = view.focus, [halfX, halfY] = view.halfExtents();
    const centre = toCanvas(focus.x, focus.z), frameW = halfX * scale * 0.7, frameH = halfY * scale * 0.75;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(centre.x - frameW, centre.y - frameH, frameW * 2, frameH * 2);
  };

  // Nothing is redrawn until the sim, the terrain, the entity count or the camera moves on.
  let drawStamp = -1, focusX, focusZ, halfX, halfY, entityCount, drawTerrainStamp;
  const unchanged = (extentX, extentY) => drawTerrainStamp === game.terrainVersion && drawStamp === game.time
    && entityCount === game.entities.size && focusX === view.focus.x && focusZ === view.focus.z
    && halfX === extentX && halfY === extentY;
  const minimap = {
    draw() {
      const [extentX, extentY] = view.halfExtents();
      if (unchanged(extentX, extentY)) return;
      drawTerrainStamp = game.terrainVersion; drawStamp = game.time; entityCount = game.entities.size;
      focusX = view.focus.x; focusZ = view.focus.z; halfX = extentX; halfY = extentY;
      updateTerrain();
      ctx.fillStyle = '#0a0d09';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(terrain.layer, 0, 0);
      drawEntities();
      updateFog(game.players[0]);
      ctx.drawImage(fog.layer, 0, 0);
      drawViewport();
    },
    toWorld,
  };
  return minimap;
}
