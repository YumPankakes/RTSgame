// js/menu.js  —  pixel-art build menu (left side)
(function () {
  'use strict';

  // ── State ────────────────────────────────────────────────────────────────
  let _activeTool = null;
  let _activeCat  = null;
  window.selectedBuilding = null;

  // ── Data ─────────────────────────────────────────────────────────────────
  const CATS = {
    defence: {
      label: 'DEFENCE',
      items: [
        { name: 'Stone Wall', label: 'WALL' },
      ]
    }
  };

  // ── CSS ──────────────────────────────────────────────────────────────────
  const CSS = `
    #rts-menu {
      position: fixed;
      top: 0; left: 0;
      height: 100vh;
      display: flex;
      z-index: 200;
      pointer-events: none;
      font-family: 'Courier New', Courier, monospace;
      user-select: none;
    }

    /* ── Sidebar strip ───────────────────────────────────────────────────── */
    #rts-sidebar {
      width: 44px;
      height: 100vh;
      background: #0E0C12;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      pointer-events: all;
      /* right border: deep shadow + highlight */
      box-shadow:
        inset -1px 0 0 #0A0A0C,
        inset -3px 0 0 #1E1C24;
    }

    /* logo strip at top */
    .sb-logo {
      width: 44px; height: 44px;
      flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      border-bottom: 2px solid #0A0A0C;
      box-shadow: 0 1px 0 #1E1C24;
      color: #2E2C36;
      font-size: 20px;
      line-height: 1;
    }

    /* sidebar tool buttons */
    .sb-btn {
      width: 38px;
      margin: 6px 0 0;
      padding: 7px 0 8px;
      background: #17151C;
      border: 0; outline: 0;
      cursor: pointer;
      display: flex; flex-direction: column;
      align-items: center; gap: 4px;
      /* raised bevel */
      box-shadow:
        inset -1px -1px 0 #0A0A0C,
        inset  1px  1px 0 #28262E;
      color: #5A5860;
    }
    .sb-btn:hover {
      background: #1E1C24;
      color: #9E9CA4;
      box-shadow:
        inset -1px -1px 0 #0A0A0C,
        inset  1px  1px 0 #38363E;
    }
    .sb-btn.active {
      background: #0E0C14;
      color: #E8C040;
      /* sunken bevel */
      box-shadow:
        inset  1px  1px 0 #0A0A0C,
        inset -1px -1px 0 #28262E;
    }
    .sb-btn .sb-icon  { font-size: 15px; line-height: 1; }
    .sb-btn .sb-label {
      font-size: 7px; font-weight: bold;
      letter-spacing: 1px; text-transform: uppercase;
    }

    /* ── Sliding panels ──────────────────────────────────────────────────── */
    .menu-panel {
      height: 100vh;
      width: 0; overflow: hidden;
      background: #12101A;
      flex-shrink: 0;
      pointer-events: none;
      display: flex; flex-direction: column;
      /* right border */
      box-shadow:
        inset -1px 0 0 #0A0A0C,
        inset -3px 0 0 #1E1C24;
      transition: width 0.11s steps(6, end);
    }
    .menu-panel.open { pointer-events: all; }
    #menu-l1.open { width: 124px; }
    #menu-l2.open { width: 148px; }

    /* panel title bar */
    .p-hdr {
      height: 32px; flex-shrink: 0;
      display: flex; align-items: center;
      padding: 0 10px;
      border-bottom: 2px solid #0A0A0C;
      box-shadow: 0 1px 0 #1E1C24;
    }
    .p-hdr-txt {
      font-size: 8px; font-weight: bold;
      letter-spacing: 2.5px; text-transform: uppercase;
      color: #38363E;
      white-space: nowrap;
    }

    /* thin decorative line below header */
    .p-hdr::after {
      content: '';
      display: block;
    }

    /* ── Category rows ───────────────────────────────────────────────────── */
    .cat-row {
      width: 100%;
      padding: 9px 10px 9px 12px;
      background: transparent; border: 0; outline: 0;
      border-bottom: 1px solid #0A0A0C;
      box-shadow: 0 1px 0 #18161E;
      display: flex; align-items: center; justify-content: space-between;
      cursor: pointer; white-space: nowrap;
      color: #9E9CA4;
      font-family: 'Courier New', Courier, monospace;
      font-size: 10px; font-weight: bold;
      letter-spacing: 0.5px; text-transform: uppercase;
      text-align: left;
    }
    .cat-row:hover  { background: #1C1A22; color: #C8B898; }
    .cat-row.active { background: #17151F; color: #E8C040; }
    .cat-row .arrow { font-size: 7px; color: #2E2C36; flex-shrink: 0; }
    .cat-row:hover  .arrow { color: #5A5860; }
    .cat-row.active .arrow { color: #E8C040; }

    /* ── Building item rows ──────────────────────────────────────────────── */
    .bld-row {
      width: 100%;
      padding: 5px 8px;
      background: transparent; border: 0; outline: 0;
      border-bottom: 1px solid #0A0A0C;
      box-shadow: 0 1px 0 #18161E;
      display: flex; align-items: center; gap: 8px;
      cursor: pointer; white-space: nowrap;
    }
    .bld-row:hover    { background: #1C1A22; }
    .bld-row.selected {
      background: #17151F;
      box-shadow: inset 2px 0 0 #E8C040, 0 1px 0 #18161E;
    }

    /* pixel-art preview thumbnail */
    .bld-row canvas {
      width: 24px; height: 24px;
      image-rendering: pixelated;
      flex-shrink: 0;
      background: #0A0A0C;
      box-shadow:
        inset  1px  1px 0 #0A0A0C,
        inset -1px -1px 0 #28262E;
    }

    .bld-row .bld-name {
      font-family: 'Courier New', Courier, monospace;
      font-size: 9px; font-weight: bold;
      letter-spacing: 0.5px; text-transform: uppercase;
      color: #9E9CA4;
    }
    .bld-row:hover    .bld-name { color: #C8B898; }
    .bld-row.selected .bld-name { color: #E8C040; }

    /* ── Separator dots (decorative) ─────────────────────────────────────── */
    .p-sep {
      height: 4px; flex-shrink: 0;
      background: repeating-linear-gradient(
        90deg,
        #1E1C24 0px, #1E1C24 4px,
        #0A0A0C 4px, #0A0A0C 8px
      );
    }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  // ── HTML skeleton ─────────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.id = 'rts-menu';
  root.innerHTML = `
    <div id="rts-sidebar">
      <div class="sb-logo">◆</div>
      <button class="sb-btn" id="btn-build">
        <span class="sb-icon">⌂</span>
        <span class="sb-label">BUILD</span>
      </button>
    </div>

    <div class="menu-panel" id="menu-l1">
      <div class="p-hdr"><span class="p-hdr-txt">STRUCTURES</span></div>
      <div class="p-sep"></div>
    </div>

    <div class="menu-panel" id="menu-l2">
      <div class="p-hdr"><span class="p-hdr-txt" id="l2-title"></span></div>
      <div class="p-sep"></div>
      <div id="l2-items"></div>
    </div>
  `;
  document.body.appendChild(root);

  // ── Populate L1 category rows ─────────────────────────────────────────────
  const l1Panel = document.getElementById('menu-l1');
  Object.entries(CATS).forEach(([id, cat]) => {
    const btn = document.createElement('button');
    btn.className = 'cat-row';
    btn.id = `cat-${id}`;
    const txt = document.createTextNode(cat.label + ' ');
    btn.appendChild(txt);
    const arrow = document.createElement('span');
    arrow.className = 'arrow';
    arrow.textContent = '▶';
    btn.appendChild(arrow);
    btn.addEventListener('click', () => _selectCat(id));
    l1Panel.appendChild(btn);
  });

  document.getElementById('btn-build').addEventListener('click', _toggleBuild);

  // ── Logic ─────────────────────────────────────────────────────────────────
  function _toggleBuild() {
    if (_activeTool === 'build') {
      _activeTool = null;
      _activeCat  = null;
      window.selectedBuilding = null;
      document.getElementById('btn-build').classList.remove('active');
      document.getElementById('menu-l1').classList.remove('open');
      document.getElementById('menu-l2').classList.remove('open');
      document.querySelectorAll('.cat-row').forEach(el => el.classList.remove('active'));
      _syncCursor();
    } else {
      _activeTool = 'build';
      document.getElementById('btn-build').classList.add('active');
      document.getElementById('menu-l1').classList.add('open');
    }
  }

  function _selectCat(id) {
    if (_activeCat === id) {
      _activeCat = null;
      window.selectedBuilding = null;
      document.getElementById(`cat-${id}`).classList.remove('active');
      document.getElementById('menu-l2').classList.remove('open');
      _syncCursor();
      return;
    }
    _activeCat = id;
    window.selectedBuilding = null;
    document.querySelectorAll('.cat-row').forEach(el => el.classList.remove('active'));
    document.getElementById(`cat-${id}`).classList.add('active');

    // Build L2 items
    const cat = CATS[id];
    document.getElementById('l2-title').textContent = cat.label;
    const container = document.getElementById('l2-items');
    container.innerHTML = '';
    cat.items.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'bld-row';
      btn.dataset.name = item.name;
      btn.appendChild(_makePreview(item.name, 24));
      const label = document.createElement('span');
      label.className = 'bld-name';
      label.textContent = item.label;
      btn.appendChild(label);
      btn.addEventListener('click', () => _selectBuilding(item.name, btn));
      container.appendChild(btn);
    });

    document.getElementById('menu-l2').classList.add('open');
    _syncCursor();
  }

  function _selectBuilding(name, btn) {
    if (window.selectedBuilding === name) {
      window.selectedBuilding = null;
      document.querySelectorAll('.bld-row').forEach(el => el.classList.remove('selected'));
    } else {
      window.selectedBuilding = name;
      document.querySelectorAll('.bld-row').forEach(el => el.classList.remove('selected'));
      btn.classList.add('selected');
    }
    _syncCursor();
  }

  function _syncCursor() {
    const canvas = document.getElementById('gameCanvas');
    if (canvas) canvas.style.cursor = window.selectedBuilding ? 'crosshair' : 'default';
  }

  // Pixel-art preview thumbnail
  function _makePreview(name, size) {
    // 'Stone Wall' is a virtual auto-tile entry; use H tile as thumbnail
    const lookupName = name === 'Stone Wall' ? 'Stone Wall H' : name;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const def = buildingRegistry.get(lookupName);
    if (!def) return c;
    const ctx = c.getContext('2d');
    const sc = size / 16;
    ctx.fillStyle = '#0A0A0C';
    ctx.fillRect(0, 0, size, size);
    for (let py = 0; py < 16; py++) {
      for (let px = 0; px < 16; px++) {
        const color = def.pixels[py * 16 + px];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(
          Math.floor(px * sc), Math.floor(py * sc),
          Math.ceil(sc),       Math.ceil(sc)
        );
      }
    }
    return c;
  }

  // ESC cancels placement
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && window.selectedBuilding) {
      window.selectedBuilding = null;
      document.querySelectorAll('.bld-row').forEach(el => el.classList.remove('selected'));
      _syncCursor();
    }
  });

}());
