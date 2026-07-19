import Phaser from 'phaser';
import { Enemy } from './Enemy.js';

const ATTACKS = ['iceFall', 'iceSpikes', 'frostLine'];

/**
 * Frozen Tundra ice wizards (wave 11+).
 * High HP casters with frost fall, spike volleys, and slowing frost lines.
 */
export class IceWizard extends Enemy {
  constructor(scene, x, y, typeId, wave) {
    super(scene, x, y, typeId || 'iceWizard', wave);
    this.isWizard = true;
    this.isIceWizard = true;
    this.nextAttackTime = scene.time.now + 1400 + Math.random() * 1200;
    this.preferRange = this.enemyData.preferRange || 380;
    this.attackDamage = this.enemyData.attackDamage || 18;
    this.busy = false;
    this.attackTimers = [];
    this.heldFx = [];
    this.lastAttack = null;
  }

  get fx() {
    return this.scene.fx;
  }

  trackTimer(event) {
    if (event) this.attackTimers.push(event);
    return event;
  }

  holdTracked(obj) {
    if (obj) this.heldFx.push(obj);
    return obj;
  }

  untrackHeld(obj) {
    const i = this.heldFx.indexOf(obj);
    if (i >= 0) this.heldFx.splice(i, 1);
  }

  clearAttacks() {
    this.attackTimers.forEach((t) => {
      try {
        t.remove(false);
      } catch {
        /* already removed */
      }
    });
    this.attackTimers.length = 0;
    this.heldFx.forEach((obj) => {
      if (!obj) return;
      if (typeof obj.destroy === 'function' && obj.type !== undefined && !obj.setRadius) {
        try {
          obj.destroy();
        } catch {
          /* ignore */
        }
      } else {
        this.fx?.release(obj);
      }
    });
    this.heldFx.length = 0;
    this.busy = false;
  }

  isAttackAlive() {
    return (
      this.active &&
      !this.isDying &&
      (this.scene.gameState === 'playing' || this.scene.gameState === 'wave_pause')
    );
  }

  update(time, player) {
    if (this.isDying || !this.active) return;

    if (time < this.slowEndTime) {
      this.slowMultiplier = this.slowStrength || 0.5;
    } else {
      this.slowMultiplier = 1;
    }

    if (time < this.poisonEndTime) {
      if (time >= this.poisonTickTime) {
        this.poisonTickTime = time + 500;
        this.takeDamage(this.poisonDamage || 3, true);
      }
      this.setTint(0x88ff44);
    } else if (time < this.burnEndTime) {
      if (time >= this.burnTickTime) {
        this.burnTickTime = time + 500;
        this.takeDamage(this.burnDamage || 4, true);
      }
      this.setTint(0xff6622);
    } else if (time >= this.slowEndTime) {
      this.clearTint();
    }

    this.updateHpBar();

    if (time < (this.sandStunUntil || 0)) {
      this.setVelocity(0, 0);
      this.setTint(0xd4b483);
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const speed = this.chaseSpeed * this.slowMultiplier;

    if (dist > this.preferRange + 40) {
      this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    } else if (dist < this.preferRange - 55) {
      this.setVelocity(-Math.cos(angle) * speed * 0.9, -Math.sin(angle) * speed * 0.9);
    } else {
      this.setVelocity(-Math.sin(angle) * speed * 0.4, Math.cos(angle) * speed * 0.4);
    }

    // Only attack while visible in the player's camera view.
    if (!this.busy && time >= this.nextAttackTime && this.isOnPlayerScreen()) {
      this.performAttack(time, player, dist);
    }
  }

  /** True when this wizard is inside the active camera viewport (with a small margin). */
  isOnPlayerScreen() {
    const cam = this.scene.cameras?.main;
    if (!cam) return true;
    const margin = 40;
    const left = cam.worldView.x - margin;
    const right = cam.worldView.right + margin;
    const top = cam.worldView.y - margin;
    const bottom = cam.worldView.bottom + margin;
    return this.x >= left && this.x <= right && this.y >= top && this.y <= bottom;
  }

  performAttack(time, player, dist = 0) {
    if (!player?.active || !this.isAttackAlive()) {
      this.nextAttackTime = time + 800;
      return;
    }

    let pool = ATTACKS.filter((a) => a !== this.lastAttack);
    if (dist > 420) {
      pool = pool.filter((a) => a !== 'frostLine');
      if (pool.length === 0) pool = ['iceFall', 'iceSpikes'];
    }
    const attack = pool[Math.floor(Math.random() * pool.length)];
    this.lastAttack = attack;

    if (attack === 'iceFall') {
      this.castIceFall(player, time);
      this.nextAttackTime = time + 4800 + Math.random() * 800;
    } else if (attack === 'iceSpikes') {
      this.castIceSpikes(player, time);
      this.nextAttackTime = time + 4200 + Math.random() * 700;
    } else {
      this.castFrostLine(player, time);
      this.nextAttackTime = time + 5800 + Math.random() * 900;
    }
  }

  /** Ice cubes appear above the player and fall after 0.45s (no danger telegraph). */
  castIceFall(player, time) {
    if (!this.fx || !this.isAttackAlive()) return;
    const cx = player.x;
    const cy = player.y;
    const spots = [];
    for (let i = 0; i < 5; i++) {
      const a = (Math.PI * 2 * i) / 5 + Math.random() * 0.4;
      const r = 12 + Math.random() * 48;
      spots.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    spots.push({ x: cx, y: cy });

    const markers = [];
    spots.forEach((s) => {
      const cube = this.holdTracked(this.fx.hold(s.x, s.y - 95, 10, 0xaaddff, 0.85, 14));
      if (cube) {
        cube.setStrokeStyle(2, 0xffffff, 0.75);
        markers.push({ cube, x: s.x, y: s.y });
      }
      this.fx.burst(s.x, s.y - 95, { count: 3, color: 0xccf0ff, speed: 30, life: 200, size: 2 });
    });

    this.trackTimer(
      this.scene.time.delayedCall(450, () => {
        if (!this.isAttackAlive()) {
          markers.forEach((m) => {
            this.fx?.release(m.cube);
            this.untrackHeld(m.cube);
          });
          return;
        }

        markers.forEach((m) => {
          this.fx?.release(m.cube);
          this.untrackHeld(m.cube);

          if (this.scene.textures.exists('fx_ice_spike')) {
            const drop = this.scene.add
              .image(m.x, m.y - 90, 'enemy_iceCubeSmall')
              .setDepth(12)
              .setDisplaySize(22, 22)
              .setAlpha(0.95);
            this.scene.tweens.add({
              targets: drop,
              y: m.y,
              duration: 110,
              ease: 'Quad.easeIn',
              onComplete: () => drop.destroy(),
            });
          }

          this.fx.burst(m.x, m.y, { count: 8, color: 0xaaddff, speed: 100, life: 240, size: 3 });
          this.fx.flash(m.x, m.y, 14, 0xffffff, 150, 30);

          if (player?.active && Phaser.Math.Distance.Between(m.x, m.y, player.x, player.y) < 30) {
            player.takeDamage(this.attackDamage * 0.9, this.scene.time.now);
            player.applyChill?.(this.scene.time.now, 1200, 0.5);
          }
        });
      }),
    );
  }

  /** Fire 3 ice spikes toward the player. */
  castIceSpikes(player, time) {
    if (!this.fx || !player?.active || !this.isAttackAlive()) return;
    const base = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const spreads = [-0.22, 0, 0.22];

    spreads.forEach((spread, i) => {
      this.trackTimer(
        this.scene.time.delayedCall(i * 70, () => {
          if (!this.isAttackAlive() || !player?.active) return;
          this.fireSpike(base + spread, player);
        }),
      );
    });
  }

  fireSpike(angle, player) {
    if (!this.fx || !this.isAttackAlive()) return;

    let spike = null;
    if (this.scene.textures.exists('fx_ice_spike')) {
      spike = this.scene.add.image(this.x, this.y, 'fx_ice_spike').setDepth(12).setAlpha(0.95);
      spike.setRotation(angle + Math.PI / 2);
      this.holdTracked(spike);
    } else {
      spike = this.holdTracked(this.fx.hold(this.x, this.y, 7, 0x88ddff, 0.95, 12));
      if (spike) spike.setStrokeStyle(2, 0xffffff, 0.8);
    }

    if (!spike) return;

    const speed = 420;
    const maxDist = 560;
    let traveled = 0;
    let x = this.x;
    let y = this.y;

    const tick = this.trackTimer(
      this.scene.time.addEvent({
        delay: 35,
        loop: true,
        callback: () => {
          if (!this.isAttackAlive() || !spike.active) {
            this.releaseSpike(spike);
            tick.remove(false);
            return;
          }

          const step = speed * 0.035;
          x += Math.cos(angle) * step;
          y += Math.sin(angle) * step;
          traveled += step;
          spike.setPosition(x, y);
          if (spike.rotation != null && spike.setRotation) {
            spike.setRotation(angle + Math.PI / 2);
          }

          if (Math.random() < 0.35) {
            this.fx.burst(x, y, { count: 2, color: 0xaaddff, speed: 40, life: 100, size: 2 });
          }

          if (player.active && Phaser.Math.Distance.Between(x, y, player.x, player.y) < 24) {
            player.takeDamage(this.attackDamage * 0.75, this.scene.time.now);
            player.applyChill?.(this.scene.time.now, 1000, 0.55);
            this.fx.flash(player.x, player.y, 12, 0xaaddff, 140, 28);
            this.releaseSpike(spike);
            tick.remove(false);
            return;
          }

          if (traveled >= maxDist) {
            this.releaseSpike(spike);
            tick.remove(false);
          }
        },
      }),
    );
  }

  releaseSpike(spike) {
    if (!spike) return;
    if (spike.texture) {
      this.untrackHeld(spike);
      spike.destroy();
    } else {
      this.fx?.release(spike);
      this.untrackHeld(spike);
    }
  }

  /** Long frost line that slows everything it touches. */
  castFrostLine(player, time) {
    if (!this.fx || !player?.active || !this.isAttackAlive()) return;
    this.busy = true;

    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const length = 420;
    const halfWidth = 36;
    const durationMs = 2200;
    const start = this.scene.time.now;

    // Ground frost beam visual
    const ex = this.x + Math.cos(angle) * length;
    const ey = this.y + Math.sin(angle) * length;
    this.fx.beam(this.x, this.y, ex, ey, 0xaaddff, durationMs, 14);
    this.fx.beam(this.x, this.y, ex, ey, 0xffffff, durationMs, 5);

    // Soft corridor glow
    const g = this.scene.add.graphics().setDepth(8).setAlpha(0.35);
    this.holdTracked(g);
    const hx = Math.cos(angle);
    const hy = Math.sin(angle);
    const px = -hy;
    const py = hx;
    const pts = [
      { x: this.x + px * halfWidth, y: this.y + py * halfWidth },
      { x: this.x + hx * length + px * halfWidth, y: this.y + hy * length + py * halfWidth },
      { x: this.x + hx * length - px * halfWidth, y: this.y + hy * length - py * halfWidth },
      { x: this.x - px * halfWidth, y: this.y - py * halfWidth },
    ];
    g.fillStyle(0x88ccff, 0.35);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.closePath();
    g.fillPath();
    g.lineStyle(2, 0xffffff, 0.55);
    g.strokePath();

    const ox = this.x;
    const oy = this.y;

    const tick = this.trackTimer(
      this.scene.time.addEvent({
        delay: 60,
        loop: true,
        callback: () => {
          if (!this.isAttackAlive() || this.scene.time.now - start >= durationMs) {
            if (g?.active) {
              this.untrackHeld(g);
              g.destroy();
            }
            tick.remove(false);
            this.busy = false;
            return;
          }

          // Sparkle VFX along the line
          const t = Math.random();
          const sx = ox + hx * length * t + px * (Math.random() - 0.5) * halfWidth * 1.4;
          const sy = oy + hy * length * t + py * (Math.random() - 0.5) * halfWidth * 1.4;
          this.fx.burst(sx, sy, {
            count: 2,
            color: Math.random() < 0.5 ? 0xffffff : 0x88ddff,
            speed: 35,
            life: 180,
            size: 2,
          });

          const inCorridor = (tx, ty) => {
            const dx = tx - ox;
            const dy = ty - oy;
            const along = dx * hx + dy * hy;
            if (along < 0 || along > length) return false;
            const lat = Math.abs(dx * px + dy * py);
            return lat <= halfWidth;
          };

          if (player?.active && inCorridor(player.x, player.y)) {
            player.applyChill?.(this.scene.time.now, 400, 0.35);
            if (!player._frostLineHit || this.scene.time.now - player._frostLineHit > 450) {
              player._frostLineHit = this.scene.time.now;
              player.takeDamage(Math.max(4, this.attackDamage * 0.25), this.scene.time.now);
              this.fx.flash(player.x, player.y, 10, 0xccf0ff, 100, 18);
            }
          }

          // Slow everything (other enemies) in the frost corridor
          this.scene.waveManager?.enemies?.getChildren()?.forEach((enemy) => {
            if (!enemy.active || enemy.isDying || enemy === this) return;
            if (inCorridor(enemy.x, enemy.y)) {
              enemy.applySlow?.(this.scene.time.now, 200, 0.35);
            }
          });
        },
      }),
    );
  }

  markDying() {
    this.clearAttacks();
    super.markDying();
  }

  destroy(fromScene) {
    this.clearAttacks();
    super.destroy(fromScene);
  }
}

export function isIceWizardType(typeId) {
  return typeId === 'iceWizard';
}
