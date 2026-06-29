/**
 * BuildingRegistry — persistent store for building definitions.
 *
 * Each building:
 *   { name: string, w: number, h: number, pixels: (string|null)[] }
 *   pixels = flat array [(w*16) * (h*16)] of hex color strings or null (transparent)
 *
 * Persisted to localStorage so buildings survive page refreshes.
 * This file is GAME CODE — it is NOT removed when dev-editor.js is removed.
 */
class BuildingRegistry {
  constructor() {
    this.buildings = {};
    this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem('rts_buildings');
      if (raw) this.buildings = JSON.parse(raw);
    } catch {
      this.buildings = {};
    }
  }

  _persist() {
    localStorage.setItem('rts_buildings', JSON.stringify(this.buildings));
  }

  /** Save or overwrite a building definition. */
  register(def) {
    this.buildings[def.name] = def;
    this._persist();
  }

  /** Delete a building by name. */
  remove(name) {
    delete this.buildings[name];
    this._persist();
  }

  /** Load buildings from an exported JSON object (merges, does not wipe). */
  importJSON(obj) {
    Object.assign(this.buildings, obj);
    this._persist();
  }

  get(name)  { return this.buildings[name] ?? null; }
  has(name)  { return name in this.buildings; }
  getAll()   { return Object.values(this.buildings); }
}

const buildingRegistry = new BuildingRegistry();
