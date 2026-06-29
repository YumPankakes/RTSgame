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
  grid.draw(ctx, camX, camY, canvas.width, canvas.height, isDragging ? null : hoverCell);

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
