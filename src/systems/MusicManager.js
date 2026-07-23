/**
 * Lightweight procedural music — no external audio files needed.
 * Themes: chill (menu/loading), jazz (shop), synth (diamonds).
 *
 * Volume slider: 0..1 where 0.5 = current default loudness, 1.0 = 2x that.
 */
import { loadGameSettings, saveGameSettings } from '../data/gameSettings.js';

const HALF_GAIN = 0.38;
const MAX_GAIN = HALF_GAIN * 2;

function clamp01(v) {
  return Math.max(0, Math.min(1, Number(v) || 0));
}

class MusicManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.current = null;
    this.pendingTheme = null;
    this.timer = null;
    this.step = 0;
    this.unlocked = false;
    this.voices = [];
    this.volume = loadGameSettings().musicVolume;
  }

  /** Slider value 0..1 (0.5 = previous default volume). */
  getVolume() {
    return this.volume;
  }

  /** Map slider 0..1 to Web Audio gain. */
  gainFromVolume(vol = this.volume) {
    return clamp01(vol) * MAX_GAIN;
  }

  setVolume(vol) {
    const prev = this.volume;
    this.volume = clamp01(vol);
    saveGameSettings({ musicVolume: this.volume });
    this.ensureContext();
    if (this.master) {
      this.master.gain.value = this.gainFromVolume();
    }

    if (this.volume <= 0.001) {
      this.pause();
    } else if (prev <= 0.001 && (this.current || this.pendingTheme)) {
      const theme = this.pendingTheme || this.current;
      this.current = null;
      this.play(theme);
    }
  }

  unlock() {
    this.ensureContext();
    if (!this.ctx) return;
    const startPending = () => {
      this.unlocked = true;
      if (this.volume <= 0.001) return;
      if (this.pendingTheme) {
        const theme = this.pendingTheme;
        this.pendingTheme = null;
        this.play(theme);
      } else if (this.current && !this.timer) {
        const theme = this.current;
        this.current = null;
        this.play(theme);
      }
    };
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(startPending).catch(() => {});
    } else {
      startPending();
    }
  }

  ensureContext() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.gainFromVolume();
    this.master.connect(this.ctx.destination);
  }

  /** @param {'chill'|'jazz'|'synth'|null} theme */
  play(theme) {
    this.ensureContext();
    if (!this.ctx) return;

    if (theme == null) {
      this.pendingTheme = null;
      this.stop();
      return;
    }

    // Remember desired theme even when volume is 0.
    if (this.volume <= 0.001) {
      this.pendingTheme = theme;
      this.current = theme;
      this.pause();
      return;
    }

    if (this.ctx.state === 'suspended') {
      this.pendingTheme = theme;
      this.ctx.resume().catch(() => {});
      if (this.current === theme && this.timer) return;
      this.current = theme;
      return;
    }

    if (this.current === theme && this.timer) {
      return;
    }

    this.stop();
    this.current = theme;
    this.step = 0;

    if (theme === 'chill') this.startLoop(this.tickChill.bind(this), 380);
    else if (theme === 'jazz') this.startLoop(this.tickJazz.bind(this), 280);
    else if (theme === 'synth') this.startLoop(this.tickSynth.bind(this), 200);
  }

  startLoop(tickFn, intervalMs) {
    tickFn();
    this.timer = window.setInterval(tickFn, intervalMs);
  }

  stop() {
    if (this.timer != null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.voices.forEach((v) => {
      try {
        v.stop();
      } catch {
        // already stopped
      }
    });
    this.voices = [];
    this.current = null;
  }

  pause() {
    if (this.timer != null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.voices.forEach((v) => {
      try {
        v.stop();
      } catch {
        // ignore
      }
    });
    this.voices = [];
    // keep this.current so resume can restart same theme
  }

  resume() {
    if (!this.current) return;
    const theme = this.current;
    this.current = null;
    this.play(theme);
  }

  tone(freq, duration, type = 'sine', gain = 0.08, when = 0) {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = type === 'sawtooth' || type === 'square' ? 2200 : 1800;

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);

    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), t0 + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    osc.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
    this.voices.push(osc);
    // prune old refs
    if (this.voices.length > 40) {
      this.voices = this.voices.slice(-20);
    }
  }

  chord(freqs, duration, type, gain) {
    freqs.forEach((f, i) => this.tone(f, duration, type, gain * (1 - i * 0.08), i * 0.01));
  }

  midi(n) {
    return 440 * 2 ** ((n - 69) / 12);
  }

  tickChill() {
    const s = this.step % 24;
    // Calm lo-fi: soft Cmaj7 / Am7 / Fmaj7 / Gsus pads
    if (s % 6 === 0) {
      const pads = [
        [48, 52, 55, 59], // Cmaj7
        [45, 48, 52, 55], // Am7
        [41, 45, 48, 52], // Fmaj7
        [43, 48, 50, 55], // Gsus-ish
      ];
      const c = pads[Math.floor(s / 6) % 4];
      this.chord(
        c.map((n) => this.midi(n)),
        2.6,
        'sine',
        0.075,
      );
      this.chord(
        c.map((n) => this.midi(n + 12)),
        2.2,
        'triangle',
        0.035,
      );
    }

    // Sparse Rhodes-like melody
    const melody = [67, null, 64, null, 62, 64, null, 59, 60, null, 62, null];
    const note = melody[s % melody.length];
    if (note != null && s % 2 === 0) {
      this.tone(this.midi(note), 0.85, 'triangle', 0.06);
      this.tone(this.midi(note - 12), 1.0, 'sine', 0.03);
    }

    // Soft heartbeat bass every 6
    if (s % 6 === 0) {
      this.tone(this.midi(36), 0.4, 'sine', 0.07);
    }
    this.step += 1;
  }

  tickJazz() {
    const s = this.step % 16;
    // Walking bass in swing-ish steps
    const bass = [45, 48, 50, 52, 53, 52, 50, 48, 45, 43, 45, 48, 50, 53, 55, 52];
    this.tone(this.midi(bass[s]), 0.26, 'triangle', 0.14);

    // Soft jazz chords every 4 steps: Dm7 - G7 - Cmaj7 - A7
    if (s % 4 === 0) {
      const jazzChords = [
        [50, 53, 57, 60], // Dm7
        [55, 59, 62, 65], // G7
        [48, 52, 55, 59], // Cmaj7
        [57, 61, 64, 67], // A7
      ];
      const c = jazzChords[(s / 4) % 4];
      this.chord(
        c.map((n) => this.midi(n)),
        1.05,
        'sine',
        0.07,
      );
    }

    // Light snare-ish brush click (noise-ish via short square)
    if (s % 2 === 1) {
      this.tone(180 + (s % 4) * 20, 0.04, 'square', 0.025);
    }
    this.step += 1;
  }

  tickSynth() {
    const s = this.step % 24;
    // Spacey Em9 / Cmaj7 pads (slower, less harsh)
    if (s === 0) {
      this.chord(
        [this.midi(52), this.midi(55), this.midi(59), this.midi(62)],
        2.4,
        'triangle',
        0.07,
      );
      this.tone(this.midi(40), 2.4, 'sine', 0.06);
    }
    if (s === 12) {
      this.chord(
        [this.midi(48), this.midi(52), this.midi(55), this.midi(59)],
        2.4,
        'triangle',
        0.07,
      );
      this.tone(this.midi(36), 2.4, 'sine', 0.055);
    }

    // Soft crystal lead (not saw buzz)
    const lead = [71, 74, 76, 79, 76, 74, 71, 67, 69, 71, 74, 76];
    if (s % 2 === 0) {
      const n = lead[(s / 2) % lead.length];
      this.tone(this.midi(n), 0.35, 'sine', 0.065);
      this.tone(this.midi(n + 12), 0.25, 'triangle', 0.03);
    }

    // Subtle pulse kick every 6
    if (s % 6 === 0) {
      this.tone(this.midi(28), 0.28, 'sine', 0.09);
    }
    this.step += 1;
  }

  /** Short coin / purchase chime (shop buys & gold exchange). */
  playBuySound() {
    this.unlock();
    this.ensureContext();
    if (!this.ctx || !this.master) return;
    if (this.volume <= 0.001) return;

    // Bright ascending coin blips
    const notes = [72, 76, 79, 84];
    notes.forEach((n, i) => {
      this.tone(this.midi(n), 0.12, 'square', 0.09, i * 0.05);
      this.tone(this.midi(n), 0.18, 'triangle', 0.07, i * 0.05);
    });
    // Soft low “cash drawer” thud
    this.tone(this.midi(48), 0.2, 'sine', 0.06, 0.22);
  }
}

export const Music = new MusicManager();

/** Call once from a scene to unlock audio on first user gesture. */
export function bindMusicUnlock(scene) {
  const unlock = () => Music.unlock();
  scene.input?.once?.('pointerdown', unlock);
  scene.input?.keyboard?.once?.('keydown', unlock);
}
