/**
 * Persistent client settings (audio + keybinds).
 * Shares localStorage key with MusicManager for backward compatibility.
 */
export const SETTINGS_KEY = 'blob_survivor_settings_v1';

export const DEFAULT_KEYBINDS = {
  up: 'W',
  down: 'S',
  left: 'A',
  right: 'D',
  special: 'Q',
  attack: 'LMB',
  shield: 'RMB',
};

const MOUSE_BINDS = new Set(['LMB', 'RMB', 'MMB']);

function clamp01(v) {
  return Math.max(0, Math.min(1, Number(v) || 0));
}

function normalizeKeybinds(raw) {
  const out = { ...DEFAULT_KEYBINDS };
  if (!raw || typeof raw !== 'object') return out;
  for (const key of Object.keys(DEFAULT_KEYBINDS)) {
    const v = raw[key];
    if (typeof v === 'string' && v.trim()) out[key] = v.trim().toUpperCase();
  }
  return out;
}

export function defaultGameSettings() {
  return {
    musicVolume: 0.5,
    keybinds: { ...DEFAULT_KEYBINDS },
  };
}

export function loadGameSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultGameSettings();
    const parsed = JSON.parse(raw);
    let musicVolume = 0.5;
    if (typeof parsed.musicVolume === 'number') musicVolume = clamp01(parsed.musicVolume);
    else if (parsed.musicMuted) musicVolume = 0;
    return {
      musicVolume,
      keybinds: normalizeKeybinds(parsed.keybinds),
    };
  } catch {
    return defaultGameSettings();
  }
}

export function saveGameSettings(partial = {}) {
  const current = loadGameSettings();
  const next = {
    musicVolume:
      partial.musicVolume !== undefined ? clamp01(partial.musicVolume) : current.musicVolume,
    keybinds: partial.keybinds ? normalizeKeybinds(partial.keybinds) : current.keybinds,
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

export function getKeybinds() {
  return loadGameSettings().keybinds;
}

export function setKeybinds(keybinds) {
  return saveGameSettings({ keybinds });
}

export function resetKeybinds() {
  return saveGameSettings({ keybinds: { ...DEFAULT_KEYBINDS } });
}

export function isMouseBind(bind) {
  return MOUSE_BINDS.has(String(bind || '').toUpperCase());
}

/** Map bind label → Phaser KeyCodes name, or null for mouse. */
export function bindToKeyCodeName(bind) {
  const b = String(bind || '').toUpperCase();
  if (MOUSE_BINDS.has(b)) return null;
  if (b.length === 1 && /[A-Z0-9]/.test(b)) return b;
  const aliases = {
    SPACE: 'SPACE',
    ESC: 'ESC',
    ESCAPE: 'ESC',
    SHIFT: 'SHIFT',
    CTRL: 'CTRL',
    CONTROL: 'CTRL',
    ALT: 'ALT',
    TAB: 'TAB',
    ENTER: 'ENTER',
    UP: 'UP',
    DOWN: 'DOWN',
    LEFT: 'LEFT',
    RIGHT: 'RIGHT',
  };
  return aliases[b] || b;
}

/** Pretty label for UI. */
export function formatBindLabel(bind) {
  const b = String(bind || '').toUpperCase();
  if (b === 'LMB') return 'Left Click';
  if (b === 'RMB') return 'Right Click';
  if (b === 'MMB') return 'Middle Click';
  return b;
}

/** Convert a keyboard event into a bind string. */
export function eventToBind(event) {
  if (!event) return null;
  const code = event.code || '';
  if (code.startsWith('Key') && code.length === 4) return code.slice(3);
  if (code.startsWith('Digit') && code.length === 6) return code.slice(5);
  const map = {
    Space: 'SPACE',
    Escape: 'ESC',
    ShiftLeft: 'SHIFT',
    ShiftRight: 'SHIFT',
    ControlLeft: 'CTRL',
    ControlRight: 'CTRL',
    AltLeft: 'ALT',
    AltRight: 'ALT',
    Tab: 'TAB',
    Enter: 'ENTER',
    ArrowUp: 'UP',
    ArrowDown: 'DOWN',
    ArrowLeft: 'LEFT',
    ArrowRight: 'RIGHT',
  };
  if (map[code]) return map[code];
  if (event.key && event.key.length === 1) return event.key.toUpperCase();
  return null;
}

/** Convert pointer button → bind string. */
export function pointerToBind(pointer) {
  if (!pointer) return null;
  if (typeof pointer.button === 'number') {
    if (pointer.button === 0) return 'LMB';
    if (pointer.button === 1) return 'MMB';
    if (pointer.button === 2) return 'RMB';
  }
  if (pointer.leftButtonDown?.()) return 'LMB';
  if (pointer.rightButtonDown?.()) return 'RMB';
  if (pointer.middleButtonDown?.()) return 'MMB';
  return null;
}
