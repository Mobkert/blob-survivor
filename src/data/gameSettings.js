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

const DIGIT_CODES = {
  '0': 'ZERO',
  '1': 'ONE',
  '2': 'TWO',
  '3': 'THREE',
  '4': 'FOUR',
  '5': 'FIVE',
  '6': 'SIX',
  '7': 'SEVEN',
  '8': 'EIGHT',
  '9': 'NINE',
};

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

/**
 * Map bind label → Phaser KeyCodes property name, or null for mouse.
 * Digits map to ONE/TWO/… which Phaser expects.
 */
export function bindToKeyCodeName(bind) {
  const b = String(bind || '').toUpperCase();
  if (MOUSE_BINDS.has(b)) return null;
  if (DIGIT_CODES[b]) return DIGIT_CODES[b];
  if (b.length === 1 && /[A-Z]/.test(b)) return b;
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
  if (b === 'UP') return '↑';
  if (b === 'DOWN') return '↓';
  if (b === 'LEFT') return '←';
  if (b === 'RIGHT') return '→';
  if (b === 'SPACE') return 'Space';
  return b;
}

/** Convert a keyboard event into a bind string. */
export function eventToBind(event) {
  if (!event) return null;
  // Phaser sometimes wraps the native event.
  const e = event.originalEvent || event;
  const code = e.code || '';
  if (code.startsWith('Key') && code.length === 4) return code.slice(3);
  if (code.startsWith('Digit') && code.length === 6) return code.slice(5);
  if (code.startsWith('Numpad') && code.length === 7 && /\d/.test(code.slice(6))) {
    return code.slice(6);
  }
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
    NumpadEnter: 'ENTER',
    ArrowUp: 'UP',
    ArrowDown: 'DOWN',
    ArrowLeft: 'LEFT',
    ArrowRight: 'RIGHT',
  };
  if (map[code]) return map[code];
  if (e.key === ' ') return 'SPACE';
  if (e.key && e.key.length === 1) return e.key.toUpperCase();
  return null;
}

/** Convert pointer button → bind string. Prefer event.button on pointerdown. */
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

/** Apply a new bind, swapping if another action already uses it. */
export function applyKeybindChange(actionId, bind) {
  const current = getKeybinds();
  const next = { ...current };
  const prev = current[actionId];
  const normalized = String(bind || '').trim().toUpperCase();
  if (!normalized) return current;

  for (const [k, v] of Object.entries(next)) {
    if (k !== actionId && v === normalized) {
      next[k] = prev;
    }
  }
  next[actionId] = normalized;
  return setKeybinds(next).keybinds;
}
