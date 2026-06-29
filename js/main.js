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
  requestAnimationFrame(gameLoop);
}

gameLoop();
