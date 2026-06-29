/**
 * Grid — infinite tile map with occupancy tracking.
 *
 * The world extends in all directions (positive and negative col/row).
 * Only the tiles visible inside the viewport are rendered each frame.
 *
 * Coordinates:
 *   col  — column index (can be negative)
 *   row  — row    index (can be negative)
 */
class Grid {
  /**
   * @param {number} tileSize  Pixel size of each square tile
   */
  constructor(tileSize) {
    this.tileSize = tileSize;

    // Sparse map of occupied cells: key = "col,row" → { buildingId, rootCol, rootRow, w, h }
    this._occupied = new Map();
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  /** Deterministic grass colour from col/row — same tile always same shade. */
  _grassColor(col, row) {
    // Fast integer hash (no random — revisiting a tile gives the same colour)
    let h = (col * 1619 + row * 31337) ^ (col * 31337 + row * 1619);
    h = ((h >>> 16) ^ h) * 0x45d9f3b;
    h = ((h >>> 16) ^ h) & 0xffff;
    const green = 82 + (h % 22); // 82-103
    return `rgb(34,${green},34)`;
  }

  _key(col, row) { return `${col},${row}`; }

  // ── Coordinate helpers ────────────────────────────────────────────────────

  /**
   * Convert a screen position to world cell, given camera offset.
   * @param {number} screenX
   * @param {number} screenY
   * @param {number} camX  Camera x offset in pixels
   * @param {number} camY  Camera y offset in pixels
   */
  screenToCell(screenX, screenY, camX, camY) {
    const worldX = screenX + camX;
    const worldY = screenY + camY;
    return {
      col: Math.floor(worldX / this.tileSize),
      row: Math.floor(worldY / this.tileSize),
    };
  }

  // ── Occupancy API ─────────────────────────────────────────────────────────

  /** Returns true if every cell in the rectangle (col, row, w, h) is free. */
  canPlace(col, row, w, h) {
    for (let r = row; r < row + h; r++) {
      for (let c = col; c < col + w; c++) {
        if (this._occupied.has(this._key(c, r))) return false;
      }
    }
    return true;
  }

  /** Mark a rectangle of cells as occupied by a building. */
  occupy(col, row, w, h, buildingId) {
    for (let r = row; r < row + h; r++) {
      for (let c = col; c < col + w; c++) {
        this._occupied.set(this._key(c, r), { buildingId, rootCol: col, rootRow: row, w, h });
      }
    }
  }

  /** Free all cells in the rectangle. */
  vacate(col, row, w, h) {
    for (let r = row; r < row + h; r++) {
      for (let c = col; c < col + w; c++) {
        this._occupied.delete(this._key(c, r));
      }
    }
  }

  getCellData(col, row) {
    return this._occupied.get(this._key(col, row)) ?? null;
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  /**
   * Draw only the tiles that are visible in the current viewport.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} camX
   * @param {number} camY
   * @param {number} viewW
   * @param {number} viewH
   * @param {{ col, row } | null} hoverCell
   * @param {OffscreenCanvas[]} grassTiles  4 grass texture variants
   */
  draw(ctx, camX, camY, viewW, viewH, hoverCell, grassTiles) {
    const ts = this.tileSize;

    const startCol = Math.floor(camX / ts);
    const startRow = Math.floor(camY / ts);
    const endCol   = Math.ceil((camX + viewW) / ts);
    const endRow   = Math.ceil((camY + viewH) / ts);

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const sx = c * ts - camX;
        const sy = r * ts - camY;

        // Grass background
        if (grassTiles) {
          ctx.drawImage(grassTiles(c, r), sx, sy);
        } else {
          ctx.fillStyle = this._grassColor(c, r);
          ctx.fillRect(sx, sy, ts, ts);
        }

        // Hover highlight (unoccupied tiles only)
        if (hoverCell && hoverCell.col === c && hoverCell.row === r
            && !this._occupied.has(this._key(c, r))) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
          ctx.fillRect(sx, sy, ts, ts);
        }

        // Grid line
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.20)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(sx, sy, ts, ts);
      }
    }
  }
}
