import Phaser from 'phaser';
import { Enemy } from './Enemy.js';
import { getScaledBossHp } from '../data/enemies.js';

const TELEGRAPH_MS = 900;
const ATTACK_GAP_MS = 750;
const STUN_MS = 5000;
const MOVES_BEFORE_STUN = 8;
const ATTACKS = ['explosion', 'eruption', 'cannon', 'dash'];

/**
 * Volcanic Ridge boss — red cube with eyes.
 * All attack timers / held FX clear on death (wizard-style).
 */
export class KingMagmaCube extends Enemy {
  constructor(scene, x, y, wave) {
    super(scene, x, y, 'kingMagmaCube', wave);

    this.maxHp = getScaledBossHp(this.enemyData.hp, wave, 'kingMagmaCube');
    this.hp = this.maxHp;
    this.isBoss = true;
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
    this.attackDamage = this.enemyData.attackDamage || 52;
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
    } else if (this.phase !== 'dash' && this.phase !== 'stun') {
      this.clearTint();
    }

    this.updateHpBar();

    if (this.phase === 'dash') {
      this.updateDash(time, player);
      return;
    }

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
      attack = Math.random() < 0.55 ? 'dash' : 'cannon';
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
    g.fillStyle(0xff3300, 0.32);
    g.lineStyle(2, 0xff8844, 0.85);

    const attack = this.pendingAttack;
    if (attack === 'dash') {
      this.drawOrientedRect(g, this.x, this.y, this.aimAngle, 540, 72);
    } else if (attack === 'explosion') {
      g.fillCircle(this.x, this.y, 230);
      g.strokeCircle(this.x, this.y, 230);
    } else if (attack === 'eruption') {
      g.fillCircle(this.lockedX, this.lockedY, 110);
      g.strokeCircle(this.lockedX, this.lockedY, 110);
    } else if (attack === 'cannon') {
      const len = 480;
      this.drawOrientedRect(g, this.x, this.y, this.aimAngle, len, 36);
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

    if (attack === 'dash') {
      this.phase = 'dash';
      this.dashEndX = this.x + Math.cos(this.aimAngle) * 520;
      this.dashEndY = this.y + Math.sin(this.aimAngle) * 520;
      this.phaseEnd = time + 420;
      this.setTint(0xffaa66);
      this.spawnDashTrail();
      return;
    }

    if (attack === 'explosion') {
      this.castExplosion(player, time);
    } else if (attack === 'eruption') {
      this.castEruption(player, time);
    } else if (attack === 'cannon') {
      this.castLavaCannon(player, time);
    }

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
      this.scene.events.emit('boss-message', 'The King Magma Cube is stunned!');
      this.scene.events.emit('boss-stunned', this);
      return;
    }

    this.phase = 'recover';
    this.phaseEnd = time + ATTACK_GAP_MS;
  }

  castExplosion(player, time) {
    if (!this.fx || !this.isAttackAlive()) return;
    const radius = 230;
    const core = this.holdTracked(this.fx.hold(this.x, this.y, 40, 0xff4400, 0.85, 14));
    const ring = this.holdTracked(this.fx.hold(this.x, this.y, 60, 0xff8800, 0.35, 13));
    if (core) core.setStrokeStyle(3, 0xffee88, 0.9);

    this.fx.burst(this.x, this.y, { count: 14, color: 0xff6622, speed: 160, life: 320, size: 5 });
    this.fx.flash(this.x, this.y, 50, 0xffaa44, 220, 90);

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
          const r = 40 + step * 24;
          if (core?.active) core.setRadius(r * 0.45);
          if (ring?.active) ring.setRadius(r);
          this.fx.burst(this.x, this.y, {
            count: 3,
            color: step % 2 ? 0xff2200 : 0xffaa33,
            speed: 120,
            life: 180,
            size: 4,
          });

          if (step < 8) return;

          if (player?.active && Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) <= radius) {
            player.takeDamage(this.attackDamage * 1.15, this.scene.time.now);
            player.applyBurn?.(this.scene.time.now, 5, 2400);
          }
          this.fx.release(core);
          this.fx.release(ring);
          this.untrackHeld(core);
          this.untrackHeld(ring);
          this.fx.flash(this.x, this.y, radius * 0.5, 0xff5522, 200, 40);
        },
      }),
    );
  }

  castEruption(player, time) {
    if (!this.fx || !this.isAttackAlive()) return;
    const tx = this.lockedX;
    const ty = this.lockedY;
    const radius = 115;

    const vent = this.holdTracked(this.fx.hold(tx, ty, 18, 0x441100, 0.7, 10));
    const glow = this.holdTracked(this.fx.hold(tx, ty, 28, 0xff4400, 0.4, 11));

    // Rising magma column telegraph
    this.fx.beam(tx, ty + 40, tx, ty - 80, 0xff6622, 280, 6);

    this.trackTimer(
      this.scene.time.delayedCall(280, () => {
        if (!this.isAttackAlive()) {
          this.fx?.release(vent);
          this.fx?.release(glow);
          this.untrackHeld(vent);
          this.untrackHeld(glow);
          return;
        }

        this.fx.burst(tx, ty, { count: 16, color: 0xff3300, speed: 200, life: 360, size: 6 });
        this.fx.flash(tx, ty, 30, 0xffaa44, 260, 100);
        this.fx.burst(tx, ty - 20, { count: 8, color: 0xffcc44, speed: 90, life: 280, size: 4 });

        if (glow?.active) glow.setRadius(radius);
        if (player?.active && Phaser.Math.Distance.Between(tx, ty, player.x, player.y) <= radius) {
          player.takeDamage(this.attackDamage * 1.1, time);
          player.applyBurn?.(time, 6, 2600);
        }

        this.trackTimer(
          this.scene.time.delayedCall(160, () => {
            this.fx?.release(vent);
            this.fx?.release(glow);
            this.untrackHeld(vent);
            this.untrackHeld(glow);
          }),
        );
      }),
    );
  }

  castLavaCannon(player, time) {
    if (!this.fx || !this.isAttackAlive() || !player?.active) return;
    const angle = this.aimAngle;
    const ball = this.holdTracked(this.fx.hold(this.x, this.y, 14, 0xff4400, 0.95, 13));
    if (!ball) return;
    ball.setStrokeStyle(3, 0xffcc66, 0.9);

    const speed = 420;
    const maxDist = 620;
    let traveled = 0;
    let x = this.x;
    let y = this.y;
    let spark = 0;

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

          spark += 35;
          if (spark >= 70) {
            spark = 0;
            this.fx.burst(x, y, { count: 3, color: 0xff6622, speed: 70, life: 140, size: 3 });
          }

          if (player.active && Phaser.Math.Distance.Between(x, y, player.x, player.y) < 28) {
            player.takeDamage(this.attackDamage, time);
            player.applyBurn?.(time, 5, 2200);
            this.fx.flash(player.x, player.y, 18, 0xffaa44, 180, 40);
            this.fx.burst(x, y, { count: 10, color: 0xff3300, speed: 140, life: 220, size: 5 });
            this.fx.release(ball);
            this.untrackHeld(ball);
            tick.remove(false);
            return;
          }

          if (traveled >= maxDist) {
            this.fx.flash(x, y, 22, 0xff5522, 160, 30);
            this.fx.release(ball);
            this.untrackHeld(ball);
            tick.remove(false);
          }
        },
      }),
    );
  }

  spawnDashTrail() {
    if (!this.fx) return;
    let pulses = 0;
    this.trackTimer(
      this.scene.time.addEvent({
        delay: 45,
        repeat: 8,
        callback: () => {
          if (!this.isAttackAlive()) return;
          pulses += 1;
          this.fx.burst(this.x, this.y, {
            count: 4,
            color: pulses % 2 ? 0xff4400 : 0xffaa33,
            speed: 80,
            life: 180,
            size: 4,
          });
          this.fx.flash(this.x, this.y, 16, 0xff6622, 120, 10);
        },
      }),
    );
  }

  updateDash(time, player) {
    const dist = Phaser.Math.Distance.Between(this.x, this.y, this.dashEndX, this.dashEndY);
    if (dist < 20 || time >= this.phaseEnd) {
      this.setVelocity(0, 0);
      this.clearTint();
      this.fx?.flash(this.x, this.y, 40, 0xff5522, 180, 50);
      this.onMoveFinished(time);
      return;
    }

    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.dashEndX, this.dashEndY);
    const speed = 920;
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    const pDist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    if (pDist < this.enemyData.radius + 26) {
      player.takeDamage(this.attackDamage * 1.1, time);
      player.applyBurn?.(time, 4, 2000);
    }
  }

  takeDamage(damage, ignoreInstantKill = false) {
    // Outside stun, the King Magma Cube takes 3x less damage.
    let incoming = damage;
    if (this.phase !== 'stun') {
      incoming = damage / 3;
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
    this.scene.events.emit('boss-message', 'King Magma Cube defeated!');
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
