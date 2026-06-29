// ── Config ────────────────────────────────────────────────────────────────
const TILE_SIZE = 48;   // pixels per tile

// ── Canvas setup — fills the window ──────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ── Grid ─────────────────────────────────────────────────────────────────
const grid = new Grid(TILE_SIZE);

// ── Building rendering ────────────────────────────────────────────────────
const _imgCache      = new Map();
const placedBuildings = [];   // { col, row, def }

/** Pre-render a building's pixel art to an OffscreenCanvas at map scale. */
function _getBuildingImage(def) {
  if (_imgCache.has(def.name)) return _imgCache.get(def.name);
  const scale = TILE_SIZE / 16;   // 3 map-pixels per pixel-art-pixel
  const oc    = new OffscreenCanvas(def.w * TILE_SIZE, def.h * TILE_SIZE);
  const octx  = oc.getContext('2d');
  const pixW  = def.w * 16, pixH = def.h * 16;
  for (let py = 0; py < pixH; py++) {
    for (let px = 0; px < pixW; px++) {
      const color = def.pixels[py * pixW + px];
      if (!color) continue;
      octx.fillStyle = color;
      octx.fillRect(px * scale, py * scale, scale, scale);
    }
  }
  _imgCache.set(def.name, oc);
  return oc;
}

// ── Grass tile generation ─────────────────────────────────────────────────
// Tiles are generated in WORLD space so there are no seams or diagonal
// artifacts at tile boundaries.  Each (col,row) is generated once and cached.

function _makeGrassTile(col, row) {
  const SRC   = 16;              // pixel-art resolution
  const scale = TILE_SIZE / SRC; // 3 screen-pixels per art-pixel
  const oc    = new OffscreenCanvas(TILE_SIZE, TILE_SIZE);
  const oc_ctx = oc.getContext('2d');

  // Wang hash — strong avalanche, no diagonal correlation
  function wang(n) {
    n = ((n ^ 61) ^ (n >>> 16)) >>> 0;
    n = (n + (n << 3))           >>> 0;
    n = (n ^ (n >>> 4))          >>> 0;
    n = Math.imul(n, 0x27d4eb2d) >>> 0;
    n = (n ^ (n >>> 15))         >>> 0;
    return n;
  }
  function rand01(wx, wy, layer) {
    return wang(wang(wx * 73856093 ^ wy * 19349663) ^ (layer * 83492791)) / 0x100000000;
  }
  // Bilinear value noise — smooth, no grid artefacts
  function vNoise(wx, wy, period, layer) {
    const gx = wx / period, gy = wy / period;
    const x0 = Math.floor(gx), x1 = x0 + 1;
    const y0 = Math.floor(gy), y1 = y0 + 1;
    const tx = gx - x0, ty = gy - y0;
    const sx = tx * tx * (3 - 2 * tx);  // smoothstep
    const sy = ty * ty * (3 - 2 * ty);
    return rand01(x0, y0, layer) * (1-sx) * (1-sy)
         + rand01(x1, y0, layer) *    sx  * (1-sy)
         + rand01(x0, y1, layer) * (1-sx) *    sy
         + rand01(x1, y1, layer) *    sx  *    sy;
  }

  // Original palette
  const C = [
    '#1B5209','#235E10','#2B6A18','#347520',
    '#3D8028','#478A32','#52943D','#5C9E47',
    '#67A852','#72B25D',
  ];

  const WX = col * SRC, WY = row * SRC;

  for (let py = 0; py < SRC; py++) {
    for (let px = 0; px < SRC; px++) {
      const wx = WX + px, wy = WY + py;
      // Three octaves: coarse blobs + medium patches + fine grain
      const v0 = vNoise(wx, wy, 5, 0);   // smaller blobs
      const v1 = vNoise(wx, wy, 2, 1);   // medium variation
      const v2 = rand01(wx, wy, 2);       // per-pixel grain
      const val = v0 * 0.30 + v1 * 0.25 + v2 * 0.45;
      oc_ctx.fillStyle = C[Math.min(C.length - 1, Math.floor(val * C.length))];
      oc_ctx.fillRect(px * scale, py * scale, scale, scale);
    }
  }
  return oc;
}

const _grassCache = new Map();
function _getGrassTile(col, row) {
  const key = `${col},${row}`;
  if (!_grassCache.has(key)) _grassCache.set(key, _makeGrassTile(col, row));
  return _grassCache.get(key);
}

/** Place a building from the registry onto the grid. */
function placeBuilding(name, col, row) {
  const def = buildingRegistry.get(name);
  if (!def || !grid.canPlace(col, row, def.w, def.h)) return false;
  grid.occupy(col, row, def.w, def.h, name);
  placedBuildings.push({ col, row, def });
  return true;
}

// ── Initial building placement ────────────────────────────────────────────
// 5 wooden walls in a horizontal row just below centre
(function seedMap() {
  for (let i = -2; i <= 2; i++) placeBuilding('Wooden Wall', i, 1);
})();

// ── Camera (world-space pixel offset of the top-left corner) ─────────────
// Start centred on tile (0,0)
let camX = -Math.floor(window.innerWidth  / 2) + TILE_SIZE / 2;
let camY = -Math.floor(window.innerHeight / 2) + TILE_SIZE / 2;

// ── Input state ──────────────────────────────────────────────────────────
let hoverCell  = null;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let camStartX  = 0;
let camStartY  = 0;

canvas.addEventListener('mousedown', (e) => {
  isDragging = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  camStartX  = camX;
  camStartY  = camY;
  canvas.style.cursor = 'grabbing';
});

window.addEventListener('mouseup', () => {
  isDragging = false;
  canvas.style.cursor = 'default';
});

window.addEventListener('mousemove', (e) => {
  if (isDragging) {
    camX = camStartX - (e.clientX - dragStartX);
    camY = camStartY - (e.clientY - dragStartY);
  } else {
    const rect = canvas.getBoundingClientRect();
    hoverCell = grid.screenToCell(
      e.clientX - rect.left,
      e.clientY - rect.top,
      camX, camY
    );
  }
});

canvas.addEventListener('mouseleave', () => {
  if (!isDragging) hoverCell = null;
});

// ── Main loop ────────────────────────────────────────────────────────────
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  grid.draw(ctx, camX, camY, canvas.width, canvas.height, isDragging ? null : hoverCell, _getGrassTile);

  // Draw placed buildings on top of the grid
  placedBuildings.forEach(pb => {
    const sx = pb.col * TILE_SIZE - camX;
    const sy = pb.row * TILE_SIZE - camY;
    if (sx + pb.def.w * TILE_SIZE < 0 || sx > canvas.width)  return;
    if (sy + pb.def.h * TILE_SIZE < 0 || sy > canvas.height) return;
    ctx.drawImage(_getBuildingImage(pb.def), sx, sy);
  });

  requestAnimationFrame(gameLoop);
}

gameLoop();
