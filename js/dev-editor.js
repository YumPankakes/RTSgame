// ─────────────────────────────────────────────────────────────────────────────
// DEV EDITOR  —  REMOVE THIS FILE + its <script> tag in index.html to disable.
// Buildings you save here are written to buildingRegistry (buildings.js) and
// localStorage — they will survive after this file is removed.
// ─────────────────────────────────────────────────────────────────────────────
;(() => {
  'use strict';

  // ── Medieval palette ────────────────────────────────────────────────────────
  // null = transparent / eraser
  const PALETTE = [
    null,
    '#1A1A1A', '#3A2818', '#6A5848', '#9A8870', '#C8B898', '#F0E8D0',
    '#5A3820', '#8B6040', '#B08050',
    '#C89030', '#E8C040',
    '#8B1A1A', '#B83020', '#D06040',
    '#2D5A1B', '#4E8A3C', '#8EBC70',
    '#1E3A5F', '#4A7AB5',
    '#607080', '#A0A8B0',
    // Stone wall colours
    '#2E2C32', '#4A484E', '#5E5C64', '#74727A', '#9E9CA4', '#B4B2BA',
    '#F0F0F0',
  ];

  const PALETTE_LABELS = [
    'Erase',
    'Black', 'Deep Shadow', 'Dark Stone', 'Stone', 'Light Stone', 'Parchment',
    'Dark Wood', 'Wood', 'Light Wood',
    'Straw', 'Gold',
    'Dark Red', 'Red', 'Terracotta',
    'Dark Green', 'Green', 'Light Green',
    'Dark Blue', 'Blue',
    'Iron', 'Silver',
    'Wall Mortar', 'Wall Dark', 'Wall Mid-Dark', 'Wall Medium', 'Wall Light', 'Wall Highlight',
    'White',
  ];

  // ── State ───────────────────────────────────────────────────────────────────
  let building      = null;   // { name, w, h, pixels: (string|null)[] }
  let selColor      = '#1A1A1A';
  let isDrawing     = false;
  let paintColor    = null;   // color committed at mousedown (prevents mid-drag swatch changes)
  let zoom          = 8;
  let hoverPx       = null;   // { x, y } in pixel-art coordinates
  let history       = [];     // undo stack — array of pixel snapshots

  // ── Inject CSS ──────────────────────────────────────────────────────────────
  const css = document.createElement('style');
  css.id = 'dev-editor-styles';
  css.textContent = `
    #dev-btn {
      position:fixed; top:12px; right:12px; z-index:9000;
      background:#2d2d2d; color:#f0e8d0; border:1px solid #6a5848;
      padding:6px 14px; font:bold 13px monospace; cursor:pointer;
      border-radius:4px; letter-spacing:1px; user-select:none;
    }
    #dev-btn:hover { background:#4a3828; }
    #dev-panel {
      position:fixed; top:0; right:0; bottom:0; width:430px;
      background:#1e1e1e; color:#e0d8c8; font:13px/1.5 monospace;
      border-left:2px solid #4a3828; z-index:8999;
      display:none; flex-direction:column; overflow:hidden;
    }
    #dev-panel-header {
      display:flex; justify-content:space-between; align-items:center;
      background:#2a2a2a; padding:10px 14px;
      border-bottom:1px solid #4a3828; flex-shrink:0;
    }
    #dev-panel-header .dev-title { font-weight:bold; font-size:13px; color:#c89030; letter-spacing:2px; }
    #dev-close { background:none; border:none; color:#a08870; font-size:18px; cursor:pointer; padding:0 4px; line-height:1; }
    #dev-close:hover { color:#f0e8d0; }
    #dev-panel-body { flex:1; overflow-y:auto; padding:12px; display:flex; flex-direction:column; gap:10px; }
    .dev-section {
      background:#252525; border:1px solid #333; border-radius:6px; padding:11px;
    }
    .dev-section h3 {
      margin:0 0 9px; font-size:10px; text-transform:uppercase;
      letter-spacing:1.5px; color:#9a8870; border-bottom:1px solid #333; padding-bottom:6px;
    }
    .dev-row { display:flex; align-items:center; gap:7px; margin-bottom:7px; }
    .dev-row:last-child { margin-bottom:0; }
    .dev-label { color:#9a8870; min-width:44px; flex-shrink:0; }
    #dev-panel input[type=text], #dev-panel input[type=number] {
      background:#1a1a1a; color:#f0e8d0; border:1px solid #4a3828;
      padding:4px 8px; font:13px monospace; border-radius:3px; outline:none;
    }
    #dev-panel input[type=text] { width:200px; }
    #dev-panel input[type=number] { width:48px; text-align:center; }
    #dev-panel input:focus { border-color:#c89030; }
    .dev-dim-sep { color:#6a5848; }
    .dev-btn {
      background:#3a3020; color:#f0e8d0; border:1px solid #8b6040;
      padding:4px 13px; font:13px monospace; cursor:pointer; border-radius:3px;
    }
    .dev-btn:hover { background:#5a4830; }
    .dev-btn-save {
      background:#2d5a1b; color:#f0e8d0; border:1px solid #4e8a3c;
      padding:7px 0; font:bold 13px monospace; cursor:pointer;
      border-radius:3px; width:100%; margin-top:10px;
    }
    .dev-btn-save:hover { background:#3d7a2b; }
    .dev-btn-export {
      background:#1e3a5f; color:#f0e8d0; border:1px solid #4a7ab5;
      padding:4px 13px; font:12px monospace; cursor:pointer; border-radius:3px;
    }
    .dev-btn-export:hover { background:#2e5080; }
    /* Palette */
    #dev-palette { display:flex; flex-wrap:wrap; gap:4px; }
    .dev-swatch {
      width:28px; height:28px; border:2px solid #333;
      cursor:pointer; border-radius:3px; box-sizing:border-box;
      position:relative; flex-shrink:0;
    }
    .dev-swatch:hover { border-color:#c89030; }
    .dev-swatch.sel { border-color:#f0e8d0; box-shadow:0 0 0 1px #f0e8d0; }
    .dev-swatch.eraser {
      background: repeating-conic-gradient(#555 0% 25%, #333 0% 50%) 0 0 / 12px 12px;
    }
    .dev-swatch.eraser.sel { border-color:#b83020; box-shadow:0 0 0 1px #b83020; }
    /* Canvas */
    #dev-canvas-wrap {
      overflow:auto; max-height:420px; border:1px solid #333;
      border-radius:3px; cursor:crosshair; background:#1a1a1a; margin-top:8px;
    }
    #dev-canvas { display:block; image-rendering:pixelated; }
    /* Saved list */
    .dev-building-row {
      display:flex; justify-content:space-between; align-items:center;
      padding:5px 8px; background:#1a1a1a; border-radius:3px; margin-bottom:4px;
    }
    .dev-building-row:last-child { margin-bottom:0; }
    .dev-bname { color:#c8b898; font-size:12px; }
    .dev-bsize { color:#6a5848; font-size:11px; }
    .dev-bdel {
      background:none; border:none; color:#6a2020; cursor:pointer;
      font-size:15px; padding:0 2px; line-height:1;
    }
    .dev-bdel:hover { color:#c0392b; }    .dev-bview {
      background:#1e3028; color:#4e8a3c; border:1px solid #2d5a1b;
      padding:2px 8px; font:11px monospace; cursor:pointer; border-radius:3px;
    }
    .dev-bview:hover { background:#2d5a1b; color:#8ebc70; }
    .dev-building-row-btns { display:flex; align-items:center; gap:5px; }    .dev-empty { color:#555; font-size:12px; }
    .dev-saved-footer { display:flex; justify-content:flex-end; margin-top:8px; }
    .dev-draw-hdr { display:flex; justify-content:space-between; align-items:center; }
    .dev-building-label { font-size:11px; color:#c89030; margin-bottom:8px; }
    .dev-btn-clear {
      background:none; border:1px solid #6a2020; color:#8b1a1a;
      padding:3px 10px; font:12px monospace; cursor:pointer; border-radius:3px;
    }
    .dev-btn-clear:hover { border-color:#c0392b; color:#c0392b; }
    .dev-btn-undo {
      background:none; border:1px solid #4a3828; color:#9a8870;
      padding:3px 10px; font:12px monospace; cursor:pointer; border-radius:3px;
    }
    .dev-btn-undo:hover { border-color:#c89030; color:#f0e8d0; }
    .dev-btn-undo:disabled { opacity:0.3; cursor:default; }
  `;
  document.head.appendChild(css);

  // ── Build DOM ────────────────────────────────────────────────────────────────
  const btn = document.createElement('button');
  btn.id = 'dev-btn';
  btn.textContent = 'DEV';

  const panel = document.createElement('div');
  panel.id = 'dev-panel';
  panel.innerHTML = `
    <div id="dev-panel-header">
      <span class="dev-title">&#9776; DEV EDITOR</span>
      <button id="dev-close">&#x2715;</button>
    </div>
    <div id="dev-panel-body">

      <div class="dev-section" id="dev-new-section">
        <h3>New Building</h3>
        <div class="dev-row">
          <span class="dev-label">Name</span>
          <input type="text" id="dev-name" placeholder="e.g. Barracks" maxlength="32" />
        </div>
        <div class="dev-row">
          <span class="dev-label">Size</span>
          <input type="number" id="dev-w" min="1" max="8" value="1" />
          <span class="dev-dim-sep">&#215; tiles wide</span>
          <input type="number" id="dev-h" min="1" max="8" value="1" />
          <span class="dev-dim-sep">tall</span>
          <button class="dev-btn" id="dev-create">Create</button>
        </div>
      </div>

      <div class="dev-section" id="dev-draw-section" style="display:none">
        <div class="dev-draw-hdr">
          <h3 style="border:none;padding:0;margin:0" id="dev-draw-hdr-title">Pixel Art</h3>
          <div style="display:flex;gap:5px">
            <button class="dev-btn-undo" id="dev-undo" disabled>Undo</button>
            <button class="dev-btn-clear" id="dev-clear">Clear</button>
          </div>
        </div>
        <div class="dev-building-label" id="dev-draw-label"></div>

        <div class="dev-section" style="margin:0 0 8px;background:#1e1e1e">
          <h3>Palette</h3>
          <div id="dev-palette"></div>
        </div>

        <div id="dev-canvas-wrap">
          <canvas id="dev-canvas"></canvas>
        </div>
        <button class="dev-btn-save" id="dev-save">Save Building</button>
      </div>

      <div class="dev-section" id="dev-saved-section">
        <h3>Saved Buildings</h3>
        <div id="dev-saved-list"></div>
        <div class="dev-saved-footer">
          <button class="dev-btn-export" id="dev-export">Export JSON</button>
        </div>
      </div>

    </div>
  `;
  document.body.appendChild(btn);
  document.body.appendChild(panel);

  // ── Element refs ─────────────────────────────────────────────────────────────
  const nameIn      = panel.querySelector('#dev-name');
  const wIn         = panel.querySelector('#dev-w');
  const hIn         = panel.querySelector('#dev-h');
  const createBtn   = panel.querySelector('#dev-create');
  const drawSection = panel.querySelector('#dev-draw-section');
  const drawLabel   = panel.querySelector('#dev-draw-label');
  const paletteEl   = panel.querySelector('#dev-palette');
  const canvasEl    = panel.querySelector('#dev-canvas');
  const ctx         = canvasEl.getContext('2d');
  const saveBtn     = panel.querySelector('#dev-save');
  const clearBtn    = panel.querySelector('#dev-clear');
  const undoBtn     = panel.querySelector('#dev-undo');
  const savedList   = panel.querySelector('#dev-saved-list');
  const exportBtn   = panel.querySelector('#dev-export');

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function calcZoom(w, h) {
    const maxDim = Math.max(w * 16, h * 16);
    return clamp(Math.floor(380 / maxDim), 4, 24);
  }

  function pixelAt(e) {
    const r = canvasEl.getBoundingClientRect();
    return {
      x: Math.floor((e.clientX - r.left)  / zoom),
      y: Math.floor((e.clientY - r.top)   / zoom),
    };
  }

  // ── Palette ──────────────────────────────────────────────────────────────────
  function buildPalette() {
    paletteEl.innerHTML = '';
    PALETTE.forEach((hex, i) => {
      const sw = document.createElement('div');
      sw.className = 'dev-swatch' + (hex === selColor ? ' sel' : '');
      sw.title = PALETTE_LABELS[i];
      if (hex === null) {
        sw.classList.add('eraser');
      } else {
        sw.style.backgroundColor = hex;
      }
      sw.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        selColor = hex;
        buildPalette();
      });
      paletteEl.appendChild(sw);
    });
  }

  // ── Canvas render ─────────────────────────────────────────────────────────────
  function renderCanvas() {
    if (!building) return;
    const { w, h, pixels } = building;
    const pw = w * 16;
    const ph = h * 16;
    canvasEl.width  = pw * zoom;
    canvasEl.height = ph * zoom;

    // Pixels
    for (let py = 0; py < ph; py++) {
      for (let px = 0; px < pw; px++) {
        const col = pixels[py * pw + px];
        if (!col) {
          ctx.fillStyle = ((px + py) % 2 === 0) ? '#3a3a3a' : '#2a2a2a';
        } else {
          ctx.fillStyle = col;
        }
        ctx.fillRect(px * zoom, py * zoom, zoom, zoom);
      }
    }

    // Hover highlight
    if (hoverPx) {
      const { x, y } = hoverPx;
      if (x >= 0 && x < pw && y >= 0 && y < ph) {
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
      }
    }

    // Pixel grid (subtle, only when zoomed enough)
    if (zoom >= 6) {
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 0.5;
      for (let px = 0; px <= pw; px++) {
        ctx.beginPath(); ctx.moveTo(px * zoom, 0); ctx.lineTo(px * zoom, ph * zoom); ctx.stroke();
      }
      for (let py = 0; py <= ph; py++) {
        ctx.beginPath(); ctx.moveTo(0, py * zoom); ctx.lineTo(pw * zoom, py * zoom); ctx.stroke();
      }
    }

    // Tile boundary lines (gold, prominent)
    ctx.strokeStyle = 'rgba(200,144,48,0.55)';
    ctx.lineWidth = 1;
    for (let tx = 0; tx <= w; tx++) {
      const sx = tx * 16 * zoom;
      ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, ph * zoom); ctx.stroke();
    }
    for (let ty = 0; ty <= h; ty++) {
      const sy = ty * 16 * zoom;
      ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(pw * zoom, sy); ctx.stroke();
    }
  }

  // ── Painting ─────────────────────────────────────────────────────────────────
  function paint(e) {
    if (!building) return;
    const { x, y } = pixelAt(e);
    const pw = building.w * 16;
    const ph = building.h * 16;
    if (x < 0 || x >= pw || y < 0 || y >= ph) return;
    building.pixels[y * pw + x] = paintColor;
    renderCanvas();
  }

  function undo() {
    if (!building || history.length === 0) return;
    building.pixels = history.pop();
    undoBtn.disabled = history.length === 0;
    renderCanvas();
  }

  canvasEl.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isDrawing  = true;
    paintColor = e.button === 2 ? null : selColor;
    // snapshot before stroke for undo
    history.push(building.pixels.slice());
    if (history.length > 50) history.shift();
    undoBtn.disabled = false;
    paint(e);
  });

  canvasEl.addEventListener('mousemove', (e) => {
    hoverPx = pixelAt(e);
    if (isDrawing) paint(e);
    else renderCanvas();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDrawing || e.target === canvasEl) return;
    paint(e);
  });

  window.addEventListener('mouseup', () => { isDrawing = false; });

  canvasEl.addEventListener('mouseleave', () => {
    if (!isDrawing) { hoverPx = null; renderCanvas(); }
  });

  canvasEl.addEventListener('contextmenu', (e) => e.preventDefault());

  // ── Load a saved building into the editor ────────────────────────────────────
  function loadBuilding(def) {
    history  = [];
    building = { name: def.name, w: def.w, h: def.h, pixels: Array.from(def.pixels) };
    zoom     = calcZoom(def.w, def.h);
    undoBtn.disabled = true;
    drawLabel.textContent = `"${def.name}" — ${def.w}\u00d7${def.h} tiles  (${def.w*16}\u00d7${def.h*16} pixels)`;
    drawSection.style.display = '';
    buildPalette();
    renderCanvas();
    drawSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── Saved buildings list ──────────────────────────────────────────────────────
  function refreshSaved() {
    const all = buildingRegistry.getAll();
    if (all.length === 0) {
      savedList.innerHTML = '<div class="dev-empty">No buildings saved yet.</div>';
      return;
    }
    savedList.innerHTML = '';
    all.forEach(b => {
      const row = document.createElement('div');
      row.className = 'dev-building-row';
      row.innerHTML = `
        <span class="dev-bname">${b.name}</span>
        <span class="dev-bsize">${b.w}&times;${b.h} tiles</span>
        <div class="dev-building-row-btns">
          <button class="dev-bview" title="View / edit ${b.name}">View</button>
          <button class="dev-bdel" title="Delete ${b.name}">&times;</button>
        </div>
      `;
      row.querySelector('.dev-bview').addEventListener('click', () => loadBuilding(b));
      row.querySelector('.dev-bdel').addEventListener('click', () => {
        if (confirm(`Delete building "${b.name}"?`)) {
          buildingRegistry.remove(b.name);
          refreshSaved();
        }
      });
      savedList.appendChild(row);
    });
  }

  // ── Panel toggle ─────────────────────────────────────────────────────────────
  btn.addEventListener('click', () => {
    const open = panel.style.display !== 'flex';
    panel.style.display = open ? 'flex' : 'none';
    if (open) { buildPalette(); refreshSaved(); }
  });

  panel.querySelector('#dev-close').addEventListener('click', () => {
    panel.style.display = 'none';
  });

  // ── Create ────────────────────────────────────────────────────────────────────
  createBtn.addEventListener('click', () => {
    const name = nameIn.value.trim();
    if (!name) { nameIn.focus(); return; }
    const w = clamp(parseInt(wIn.value) || 1, 1, 8);
    const h = clamp(parseInt(hIn.value) || 1, 1, 8);
    const pw = w * 16, ph = h * 16;

    building = { name, w, h, pixels: new Array(pw * ph).fill(null) };
    zoom     = calcZoom(w, h);

    drawLabel.textContent = `"${name}" — ${w}×${h} tiles  (${pw}×${ph} pixels)`;
    drawSection.style.display = '';
    buildPalette();
    renderCanvas();
    drawSection.scrollIntoView({ behavior: 'smooth' });
  });

  // ── Undo ──────────────────────────────────────────────────────────────────────
  undoBtn.addEventListener('click', undo);

  window.addEventListener('keydown', (e) => {
    if (panel.style.display === 'none') return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
  });

  // ── Clear ─────────────────────────────────────────────────────────────────────
  clearBtn.addEventListener('click', () => {
    if (!building) return;
    if (!confirm('Clear all pixels?')) return;
    history.push(building.pixels.slice());
    undoBtn.disabled = false;
    building.pixels.fill(null);
    renderCanvas();
  });

  // ── Save ──────────────────────────────────────────────────────────────────────
  saveBtn.addEventListener('click', () => {
    if (!building) return;
    buildingRegistry.register({
      name:   building.name,
      w:      building.w,
      h:      building.h,
      pixels: Array.from(building.pixels),
    });
    refreshSaved();
    saveBtn.textContent       = '&#10003; Saved!';
    saveBtn.style.background  = '#1a4a0a';
    saveBtn.style.borderColor = '#2d7a1b';
    setTimeout(() => {
      saveBtn.textContent      = 'Save Building';
      saveBtn.style.background = '';
      saveBtn.style.borderColor = '';
    }, 1400);
  });

  // ── Export JSON ───────────────────────────────────────────────────────────────
  exportBtn.addEventListener('click', () => {
    const data = JSON.stringify(buildingRegistry.buildings, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'rts-buildings.json'; a.click();
    URL.revokeObjectURL(url);
  });

  // ── Init ──────────────────────────────────────────────────────────────────────
  buildPalette();
  refreshSaved();

})();
