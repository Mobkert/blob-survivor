import Phaser from 'phaser';
import { Enemy } from './Enemy.js';
import { getScaledBossHp } from '../data/enemies.js';

const TELEGRAPH_MS = 900;
const ATTACK_GAP_MS = 750;
const STUN_MS = 5000;
const MOVES_BEFORE_STUN = 6;
const ATTACKS = ['blast', 'spikeRain', 'frostNova', 'avalanche', 'blizzard'];

/**
 * Frozen Tundra boss — Yeti.
 * 5 attack types with VFX; after 6 finished moves → stun.
 * Outside stun: 3× less damage (5× on the final wave-21 fight).
 */
export class Yeti extends Enemy {
  constructor(scene, x, y, wave) {
    super(scene, x, y, 'yeti', wave);

    this.maxHp = getScaledBossHp(this.enemyData.hp, wave, 'yeti');
    this.hp = this.maxHp;
    this.isBoss = true;
    this.encounter = Math.max(1, Math.floor(wave / 7));
    this.damageReduction = this.encounter >= 3 ? 5 : 3;
    this.setDepth(6);
    const r = this.enemyData.radius;
    this.setCircle(r);
    this.body.setSize(r * 2, r * 2);
    this.body.setOffset((this.width - r * 2) / 2, (this.height - r * 2) / 2);

    this.phase = 'idle';
    this.phaseEnd = 0;
    this.moveCount = 0;
    this.lastAttack = null;
    this.pendingAttack = null;
    this.aimAngle = 0;
    this.lockedX = 0;
    this.lockedY = 0;
    this.attackDamage = this.enemyData.attackDamage || 50;
    this.farDistance = this.enemyData.farDistance || 500;
    this.attackTimers = [];
    this.heldFx = [];

    this.telegraph = scene.add.graphics().setDepth(4);

    scene.events.emit('boss-spawned', this);
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
      this.fx?.release(obj);
    });
    this.heldFx.length = 0;

    if (this.telegraph) this.telegraph.clear();
  }

  isAttackAlive() {
    return this.active && !this.isDying;
  }

  update(time, player) {
    if (this.isDying || !this.active) return;

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
    } else if (this.phase !== 'stun') {
      this.clearTint();
    }

    this.updateHpBar();

    const half = (this.scene.arenaSize || 2400) / 2 - 80;
    this.x = Phaser.Math.Clamp(this.x, -half, half);
    this.y = Phaser.Math.Clamp(this.y, -half, half);
    this.setVelocity(0, 0);

    if (this.phase === 'stun') {
      if (time >= this.phaseEnd) {
        this.phase = 'idle';
        this.moveCount = 0;
        this.clearTint();
        this.scene.events.emit('boss-message', '');
      }
      return;
    }

    if (this.phase === 'telegraph') {
      this.drawTelegraph();
      if (time >= this.phaseEnd) {
        this.clearTelegraph();
        this.executeAttack(player, time);
      }
      return;
    }

    if (this.phase === 'recover') {
      if (time >= this.phaseEnd) this.phase = 'idle';
      return;
    }

    if (this.phase === 'idle' && time >= this.phaseEnd) {
      this.beginAttack(player, time);
    }
  }

  beginAttack(player, time) {
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    let attack;

    if (dist > this.farDistance) {
      attack = Math.random() < 0.55 ? 'blast' : 'spikeRain';
    } else {
      const pool = ATTACKS.filter((a) => a !== this.lastAttack);
      attack = pool[Math.floor(Math.random() * pool.length)];
    }

    this.pendingAttack = attack;
    this.aimAngle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    this.lockedX = player.x;
    this.lockedY = player.y;
    this.phase = 'telegraph';
    this.phaseEnd = time + TELEGRAPH_MS;
    this.drawTelegraph();
  }

  drawTelegraph() {
    const g = this.telegraph;
    g.clear();
    g.fillStyle(0x66aadd, 0.28);
    g.lineStyle(2, 0xaaddff, 0.85);

    const attack = this.pendingAttack;
    if (attack === 'blast') {
      this.drawOrientedRect(g, this.x, this.y, this.aimAngle, 500, 34);
    } else if (attack === 'spikeRain') {
      g.fillCircle(this.lockedX, this.lockedY, 95);
      g.strokeCircle(this.lockedX, this.lockedY, 95);
    } else if (attack === 'frostNova') {
      g.fillCircle(this.x, this.y, 240);
      g.strokeCircle(this.x, this.y, 240);
    } else if (attack === 'avalanche') {
      g.fillCircle(this.lockedX, this.lockedY, 120);
      g.strokeCircle(this.lockedX, this.lockedY, 120);
    } else if (attack === 'blizzard') {
      this.drawOrientedRect(g, this.x, this.y, this.aimAngle, 420, 110);
    }
  }

  drawOrientedRect(g, x, y, angle, length, width) {
    const hx = Math.cos(angle);
    const hy = Math.sin(angle);
    const px = -hy;
    const py = hx;
    const hw = width / 2;
    const points = [
      { x: x + px * hw, y: y + py * hw },
      { x: x + hx * length + px * hw, y: y + hy * length + py * hw },
      { x: x + hx * length - px * hw, y: y + hy * length - py * hw },
      { x: x - px * hw, y: y - py * hw },
    ];
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
    g.closePath();
    g.fillPath();
    g.strokePath();
  }

  clearTelegraph() {
    this.telegraph?.clear();
  }

  executeAttack(player, time) {
    const attack = this.pendingAttack;
    this.lastAttack = attack;

    if (attack === 'blast') this.castIceBlast(player, time);
    else if (attack === 'spikeRain') this.castSpikeRain(player, time);
    else if (attack === 'frostNova') this.castFrostNova(player, time);
    else if (attack === 'avalanche') this.castAvalanche(player, time);
    else if (attack === 'blizzard') this.castBlizzard(player, time);

    this.onMoveFinished(time);
  }

  onMoveFinished(time) {
    this.moveCount += 1;
    this.pendingAttack = null;

    if (this.moveCount >= MOVES_BEFORE_STUN) {
      this.phase = 'stun';
      this.phaseEnd = time + STUN_MS;
      this.setVelocity(0, 0);
      this.setTint(0x88aaff);
      this.scene.events.emit('boss-message', 'The Yeti is stunned!');
      this.scene.events.emit('boss-stunned', this);
      return;
    }

    this.phase = 'recover';
    this.phaseEnd = time + ATTACK_GAP_MS;
  }

  /** Ranged ice blast projectile. */
  castIceBlast(player, time) {
    if (!this.fx || !this.isAttackAlive() || !player?.active) return;
    const angle = this.aimAngle;
    const ball = this.holdTracked(this.fx.hold(this.x, this.y, 14, 0x88ddff, 0.95, 13));
    if (!ball) return;
    ball.setStrokeStyle(3, 0xffffff, 0.85);

    const speed = 400;
    const maxDist = 640;
    let traveled = 0;
    let x = this.x;
    let y = this.y;

    const tick = this.trackTimer(
      this.scene.time.addEvent({
        delay: 35,
        loop: true,
        callback: () => {
          if (!this.isAttackAlive() || !ball.active) {
            this.fx?.release(ball);
            this.untrackHeld(ball);
            tick.remove(false);
            return;
          }

          const step = speed * 0.035;
          x += Math.cos(angle) * step;
          y += Math.sin(angle) * step;
          traveled += step;
          ball.setPosition(x, y);

          if (Math.random() < 0.4) {
            this.fx.burst(x, y, { count: 2, color: 0xaaddff, speed: 50, life: 120, size: 2 });
          }

          if (player.active && Phaser.Math.Distance.Between(x, y, player.x, player.y) < 28) {
            player.takeDamage(this.attackDamage, time);
            player.applyChill?.(time, 1400, 0.5);
            this.fx.flash(player.x, player.y, 18, 0xaaddff, 180, 40);
            this.fx.burst(x, y, { count: 10, color: 0xffffff, speed: 130, life: 220, size: 4 });
            this.fx.release(ball);
            this.untrackHeld(ball);
            tick.remove(false);
            return;
          }

          if (traveled >= maxDist) {
            this.fx.flash(x, y, 20, 0x88ccff, 140, 28);
            this.fx.release(ball);
            this.untrackHeld(ball);
            tick.remove(false);
          }
        },
      }),
    );
  }

  /** Ice spikes appear above the player, then fall after 0.5s. */
  castSpikeRain(player, time) {
    if (!this.fx || !this.isAttackAlive()) return;
    const cx = this.lockedX;
    const cy = this.lockedY;
    const spots = [];
    for (let i = 0; i < 7; i++) {
      const a = (Math.PI * 2 * i) / 7 + Math.random() * 0.3;
      const r = 20 + Math.random() * 70;
      spots.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    spots.push({ x: cx, y: cy });

    const markers = [];
    spots.forEach((s) => {
      const tip = this.holdTracked(this.fx.hold(s.x, s.y - 90, 8, 0xccf0ff, 0.75, 14));
      if (tip) {
        tip.setStrokeStyle(2, 0xffffff, 0.7);
        markers.push({ tip, x: s.x, y: s.y });
      }
      // Shadow mark on ground
      this.fx.flash(s.x, s.y, 10, 0x4488aa, 500, 8);
    });

    this.trackTimer(
      this.scene.time.delayedCall(500, () => {
        if (!this.isAttackAlive()) {
          markers.forEach((m) => {
            this.fx?.release(m.tip);
            this.untrackHeld(m.tip);
          });
          return;
        }

        markers.forEach((m) => {
          this.fx?.release(m.tip);
          this.untrackHeld(m.tip);

          // Falling spike VFX
          if (this.scene.textures.exists('fx_ice_spike')) {
            const spike = this.scene.add.image(m.x, m.y - 100, 'fx_ice_spike').setDepth(12).setAlpha(0.95);
            this.scene.tweens.add({
              targets: spike,
              y: m.y,
              duration: 120,
              ease: 'Quad.easeIn',
              onComplete: () => spike.destroy(),
            });
          }

          this.fx.burst(m.x, m.y, { count: 8, color: 0xaaddff, speed: 110, life: 260, size: 4 });
          this.fx.flash(m.x, m.y, 16, 0xffffff, 160, 36);

          if (player?.active && Phaser.Math.Distance.Between(m.x, m.y, player.x, player.y) < 32) {
            player.takeDamage(this.attackDamage * 0.85, this.scene.time.now);
            player.applyChill?.(this.scene.time.now, 1200, 0.55);
          }
        });
      }),
    );
  }

  /** Expanding frost nova ring. */
  castFrostNova(player, time) {
    if (!this.fx || !this.isAttackAlive()) return;
    const radius = 240;
    const core = this.holdTracked(this.fx.hold(this.x, this.y, 36, 0x88ddff, 0.8, 14));
    const ring = this.holdTracked(this.fx.hold(this.x, this.y, 55, 0xffffff, 0.3, 13));
    if (core) core.setStrokeStyle(3, 0xffffff, 0.9);

    this.fx.burst(this.x, this.y, { count: 16, color: 0xaaddff, speed: 170, life: 340, size: 5 });
    this.fx.flash(this.x, this.y, 48, 0xccf0ff, 240, 90);

    let step = 0;
    this.trackTimer(
      this.scene.time.addEvent({
        delay: 40,
        repeat: 7,
        callback: () => {
          if (!this.isAttackAlive()) {
            this.fx?.release(core);
            this.fx?.release(ring);
            this.untrackHeld(core);
            this.untrackHeld(ring);
            return;
          }
          step += 1;
          const r = 40 + step * 26;
          if (core?.active) core.setRadius(r * 0.4);
          if (ring?.active) ring.setRadius(r);
          this.fx.burst(this.x, this.y, {
            count: 3,
            color: step % 2 ? 0x88ccff : 0xffffff,
            speed: 100,
            life: 160,
            size: 3,
          });

          if (step < 8) return;

          if (player?.active && Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) <= radius) {
            player.takeDamage(this.attackDamage * 1.1, this.scene.time.now);
            player.applyFreeze?.(this.scene.time.now, 400);
          }
          this.fx.release(core);
          this.fx.release(ring);
          this.untrackHeld(core);
          this.untrackHeld(ring);
          this.fx.flash(this.x, this.y, radius * 0.45, 0xaaddff, 200, 40);
        },
      }),
    );
  }

  /** Avalanche stomp at locked player position. */
  castAvalanche(player, time) {
    if (!this.fx || !this.isAttackAlive()) return;
    const tx = this.lockedX;
    const ty = this.lockedY;
    const radius = 120;

    const mark = this.holdTracked(this.fx.hold(tx, ty, 22, 0x446688, 0.65, 10));
    const glow = this.holdTracked(this.fx.hold(tx, ty, 34, 0x88ccff, 0.35, 11));

    this.fx.beam(tx, ty - 100, tx, ty + 10, 0xaaddff, 320, 8);
    this.fx.burst(tx, ty - 60, { count: 6, color: 0xffffff, speed: 40, life: 280, size: 3 });

    this.trackTimer(
      this.scene.time.delayedCall(300, () => {
        if (!this.isAttackAlive()) {
          this.fx?.release(mark);
          this.fx?.release(glow);
          this.untrackHeld(mark);
          this.untrackHeld(glow);
          return;
        }

        this.fx.burst(tx, ty, { count: 18, color: 0xccf0ff, speed: 190, life: 380, size: 6 });
        this.fx.flash(tx, ty, 36, 0xffffff, 280, 100);
        this.fx.burst(tx, ty - 10, { count: 10, color: 0x88aadd, speed: 80, life: 260, size: 4 });

        if (glow?.active) glow.setRadius(radius);
        if (player?.active && Phaser.Math.Distance.Between(tx, ty, player.x, player.y) <= radius) {
          player.takeDamage(this.attackDamage * 1.15, time);
          const ang = Phaser.Math.Angle.Between(tx, ty, player.x, player.y);
          player.applyKnockback?.(ang, 380);
          player.applyChill?.(time, 1600, 0.4);
        }

        this.trackTimer(
          this.scene.time.delayedCall(160, () => {
            this.fx?.release(mark);
            this.fx?.release(glow);
            this.untrackHeld(mark);
            this.untrackHeld(glow);
          }),
        );
      }),
    );
  }

  /** Cone blizzard breath. */
  castBlizzard(player, time) {
    if (!this.fx || !this.isAttackAlive()) return;
    const angle = this.aimAngle;
    const length = 400;
    const halfWidth = 55;

    this.fx.burst(this.x, this.y, { count: 12, color: 0xaaddff, speed: 140, life: 280, size: 4 });

    let step = 0;
    this.trackTimer(
      this.scene.time.addEvent({
        delay: 45,
        repeat: 10,
        callback: () => {
          if (!this.isAttackAlive()) return;
          step += 1;
          const dist = 40 + step * 34;
          const px = this.x + Math.cos(angle) * dist;
          const py = this.y + Math.sin(angle) * dist;
          this.fx.burst(px, py, {
            count: 5,
            color: step % 2 ? 0xffffff : 0x88ccff,
            speed: 90,
            life: 200,
            size: 3,
          });
          this.fx.flash(px, py, 14, 0xccf0ff, 100, 12);

          if (player?.active) {
            const toPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
            if (toPlayer < length) {
              const angTo = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
              let diff = Phaser.Math.Angle.Wrap(angTo - angle);
              const lateral = Math.abs(Math.sin(diff) * toPlayer);
              if (Math.abs(diff) < 0.55 && lateral < halfWidth) {
                if (!player._yetiBlizHit || this.scene.time.now - player._yetiBlizHit > 400) {
                  player._yetiBlizHit = this.scene.time.now;
                  player.takeDamage(this.attackDamage * 0.7, this.scene.time.now);
                  player.applyChill?.(this.scene.time.now, 1500, 0.45);
                }
              }
            }
          }
        },
      }),
    );
  }

  takeDamage(damage, ignoreInstantKill = false) {
    let incoming = damage;
    if (this.phase !== 'stun') {
      incoming = damage / (this.damageReduction || 3);
    }
    const killed = super.takeDamage(incoming, ignoreInstantKill);
    this.scene.events.emit('boss-hp', this);
    return killed;
  }

  markDying() {
    this.clearAttacks();
    super.markDying();
    if (this.telegraph) {
      this.telegraph.destroy();
      this.telegraph = null;
    }
    this.scene.events.emit('boss-defeated', this);
    this.scene.events.emit('boss-message', 'Yeti defeated!');
  }

  destroy(fromScene) {
    this.clearAttacks();
    if (this.telegraph) {
      this.telegraph.destroy();
      this.telegraph = null;
    }
    super.destroy(fromScene);
  }
}
