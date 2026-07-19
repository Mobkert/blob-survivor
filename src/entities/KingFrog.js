import Phaser from 'phaser';
import { Enemy } from './Enemy.js';
import { getScaledBossHp } from '../data/enemies.js';
import { spawnAcidPuddle } from '../systems/SwampHazards.js';

const TELEGRAPH_MS = 750;
const ATTACK_GAP_MS = 700;
const STUN_MS = 5000;
const MOVES_BEFORE_STUN = 6;
const ATTACKS = ['slamJump', 'acidSpit', 'tongueWhip', 'dash'];

/**
 * Murk Swamp boss — King Frog.
 * Jump slam, big acid spit, triangular tongue whip, dash when far.
 */
export class KingFrog extends Enemy {
  constructor(scene, x, y, wave) {
    super(scene, x, y, 'kingFrog', wave);

    this.maxHp = getScaledBossHp(this.enemyData.hp, wave, 'kingFrog');
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
    this.attackDamage = this.enemyData.attackDamage || 48;
    this.farDistance = this.enemyData.farDistance || 480;
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
        /* ignore */
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
    if (this.telegraph) this.telegraph.clear();
  }

  isAttackAlive() {
    return this.active && !this.isDying;
  }

  takeDamage(damage, ignoreInstantKill = false) {
    let incoming = damage;
    if (this.phase !== 'stun' && this.damageReduction > 1) {
      incoming = damage / this.damageReduction;
    }
    const dead = super.takeDamage(incoming, ignoreInstantKill);
    this.scene.events.emit('boss-hp', this);
    return dead;
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

    if (this.phase === 'airborne') {
      this.setVelocity(0, 0);
      this.setAlpha(0.15);
      if (time >= this.phaseEnd) this.landSlam(player, time);
      return;
    }

    this.setAlpha(1);
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
      attack = Math.random() < 0.6 ? 'dash' : 'slamJump';
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
    const attack = this.pendingAttack;
    if (attack === 'slamJump') {
      g.fillStyle(0xff2222, 0.32);
      g.lineStyle(3, 0xff5555, 0.9);
      g.fillCircle(this.lockedX, this.lockedY, 110);
      g.strokeCircle(this.lockedX, this.lockedY, 110);
    } else if (attack === 'acidSpit') {
      g.fillStyle(0x88cc33, 0.28);
      g.lineStyle(2, 0xaaff55, 0.85);
      g.fillCircle(this.lockedX, this.lockedY, 95);
      g.strokeCircle(this.lockedX, this.lockedY, 95);
    } else if (attack === 'tongueWhip') {
      g.fillStyle(0xff6688, 0.3);
      g.lineStyle(2, 0xff99aa, 0.9);
      this.drawTriangle(g, this.x, this.y, this.aimAngle, 360, 140);
    } else if (attack === 'dash') {
      g.fillStyle(0x66aa44, 0.28);
      g.lineStyle(2, 0x88cc55, 0.85);
      this.drawOrientedRect(g, this.x, this.y, this.aimAngle, 460, 48);
    }
  }

  drawTriangle(g, x, y, angle, length, width) {
    const hx = Math.cos(angle);
    const hy = Math.sin(angle);
    const px = -hy;
    const py = hx;
    const tipX = x + hx * length;
    const tipY = y + hy * length;
    const hw = width / 2;
    g.fillTriangle(x + px * hw * 0.2, y + py * hw * 0.2, tipX, tipY, x - px * hw * 0.2, y - py * hw * 0.2);
    g.strokeTriangle(x + px * hw * 0.2, y + py * hw * 0.2, tipX, tipY, x - px * hw * 0.2, y - py * hw * 0.2);
    // Wider base flare for readability
    g.fillStyle(0xff6688, 0.18);
    g.fillTriangle(x + px * hw, y + py * hw, tipX, tipY, x - px * hw, y - py * hw);
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
    if (attack === 'slamJump') this.startSlamJump(player, time);
    else if (attack === 'acidSpit') this.castBigAcid(player, time);
    else if (attack === 'tongueWhip') this.castTongueWhip(player, time);
    else if (attack === 'dash') this.castDash(player, time);
  }

  finishMove(time, recoverMs = ATTACK_GAP_MS) {
    this.moveCount += 1;
    if (this.moveCount >= MOVES_BEFORE_STUN) {
      this.phase = 'stun';
      this.phaseEnd = time + STUN_MS;
      this.setTint(0x88aa66);
      this.scene.events.emit('boss-message', 'The King Frog is stunned!');
      this.scene.events.emit('boss-stunned', this);
    } else {
      this.phase = 'recover';
      this.phaseEnd = time + recoverMs;
    }
  }

  startSlamJump(player, time) {
    this.phase = 'airborne';
    this.phaseEnd = time + 700;
    this.setVelocity(0, 0);
    this.fx?.burst(this.x, this.y, { count: 16, color: 0x66aa44, speed: 160, life: 320, size: 5 });
    this.fx?.flash(this.x, this.y, 30, 0x88cc55, 280, 70);
    // Shadow marker at land zone
    const shadow = this.holdTracked(this.fx?.hold(this.lockedX, this.lockedY, 110, 0xff2222, 0.25, 4));
    if (shadow) shadow.setStrokeStyle(3, 0xff5555, 0.8);
  }

  landSlam(player, time) {
    this.heldFx.forEach((obj) => this.fx?.release(obj));
    this.heldFx.length = 0;

    this.x = this.lockedX;
    this.y = this.lockedY;
    this.setAlpha(1);
    this.fx?.burst(this.x, this.y, { count: 28, color: 0x55aa33, speed: 220, life: 420, size: 7 });
    this.fx?.burst(this.x, this.y, { count: 14, color: 0xaaff66, speed: 160, life: 300, size: 4 });
    this.fx?.flash(this.x, this.y, 40, 0x88ee55, 360, 120);
    this.scene.cameras.main.shake(220, 0.01);

    if (player?.active) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      if (dist <= 115) {
        player.takeDamage(this.attackDamage + 8, time);
        const ang = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        player.applyKnockback?.(ang, 520);
      }
    }
    this.finishMove(time, 900);
  }

  castBigAcid(player, time) {
    this.phase = 'recover';
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.lockedX, this.lockedY);
    const orb = this.holdTracked(this.fx?.hold(this.x, this.y, 14, 0x88ee44, 0.95, 12));
    if (!orb) {
      this.finishMove(time);
      return;
    }
    orb.setStrokeStyle(3, 0xccff66, 0.9);

    const speed = 340;
    const maxDist = 520;
    let traveled = 0;
    let x = this.x;
    let y = this.y;

    const tick = this.trackTimer(
      this.scene.time.addEvent({
        delay: 40,
        loop: true,
        callback: () => {
          if (!this.isAttackAlive() || !orb?.active) {
            this.fx?.release(orb);
            this.untrackHeld(orb);
            tick.remove(false);
            return;
          }
          x += Math.cos(angle) * speed * 0.04;
          y += Math.sin(angle) * speed * 0.04;
          traveled += speed * 0.04;
          orb.setPosition(x, y);

          const hit =
            player?.active && Phaser.Math.Distance.Between(x, y, player.x, player.y) < 28;
          if (hit || traveled >= maxDist) {
            this.fx?.release(orb);
            this.untrackHeld(orb);
            tick.remove(false);
            if (hit) player.takeDamage(this.attackDamage, this.scene.time.now);
            spawnAcidPuddle(this.scene, x, y, {
              radius: 115,
              tickDamage: 12,
              durationMs: 3600 + Math.random() * 1200,
            });
            this.fx?.burst(x, y, { count: 20, color: 0x88ee44, speed: 180, life: 380, size: 6 });
          }
        },
      }),
    );
    this.finishMove(time, 800);
  }

  castTongueWhip(player, time) {
    this.phase = 'recover';
    const angle = this.aimAngle;
    const length = 360;
    const width = 140;
    const tipX = this.x + Math.cos(angle) * length;
    const tipY = this.y + Math.sin(angle) * length;

    const g = this.scene.add.graphics().setDepth(12);
    g.fillStyle(0xff5577, 0.85);
    g.fillTriangle(
      this.x + Math.cos(angle + Math.PI / 2) * 18,
      this.y + Math.sin(angle + Math.PI / 2) * 18,
      tipX,
      tipY,
      this.x + Math.cos(angle - Math.PI / 2) * 18,
      this.y + Math.sin(angle - Math.PI / 2) * 18,
    );
    g.lineStyle(3, 0xffaacc, 0.95);
    g.strokeTriangle(
      this.x + Math.cos(angle + Math.PI / 2) * 18,
      this.y + Math.sin(angle + Math.PI / 2) * 18,
      tipX,
      tipY,
      this.x + Math.cos(angle - Math.PI / 2) * 18,
      this.y + Math.sin(angle - Math.PI / 2) * 18,
    );

    this.fx?.burst(tipX, tipY, { count: 12, color: 0xff6688, speed: 140, life: 280, size: 4 });
    this.fx?.beam(this.x, this.y, tipX, tipY, 0xff6688, 220, 5);

    if (player?.active && pointInTriangle(player.x, player.y, this.x, this.y, tipX, tipY, width, angle)) {
      player.takeDamage(this.attackDamage, time);
      const pull = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
      player.applyKnockback?.(pull, 380);
    }

    this.trackTimer(
      this.scene.time.delayedCall(220, () => {
        try {
          g.destroy();
        } catch {
          /* ignore */
        }
      }),
    );
    this.finishMove(time, 750);
  }

  castDash(player, time) {
    this.phase = 'recover';
    const angle = this.aimAngle;
    const dist = Math.min(420, Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) + 40);
    const tx = this.x + Math.cos(angle) * dist;
    const ty = this.y + Math.sin(angle) * dist;

    this.fx?.burst(this.x, this.y, { count: 12, color: 0x66aa44, speed: 180, life: 260, size: 5 });

    this.scene.tweens.add({
      targets: this,
      x: tx,
      y: ty,
      duration: 320,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        if (!player?.active || this.isDying) return;
        if (Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) < 70) {
          if (!this._dashHit) {
            this._dashHit = true;
            player.takeDamage(this.attackDamage - 4, this.scene.time.now);
            this.fx?.flash(player.x, player.y, 16, 0x88cc55, 200, 40);
          }
        }
      },
      onComplete: () => {
        this._dashHit = false;
        this.fx?.burst(this.x, this.y, { count: 10, color: 0x88cc55, speed: 120, life: 240, size: 4 });
      },
    });
    this.finishMove(time, 900);
  }

  markDying() {
    this.clearAttacks();
    this.telegraph?.destroy();
    this.telegraph = null;
    this.scene.events.emit('boss-defeated', this);
    this.scene.events.emit('boss-message', 'King Frog defeated!');
    super.markDying();
  }

  destroy(fromScene) {
    this.clearAttacks();
    this.telegraph?.destroy();
    this.telegraph = null;
    super.destroy(fromScene);
  }
}

function pointInTriangle(px, py, bx, by, tipX, tipY, width, angle) {
  const hx = Math.cos(angle);
  const hy = Math.sin(angle);
  const pxn = -hy;
  const pyn = hx;
  const ax = bx + pxn * (width / 2);
  const ay = by + pyn * (width / 2);
  const cx = bx - pxn * (width / 2);
  const cy = by - pyn * (width / 2);
  return pointInTri(px, py, ax, ay, tipX, tipY, cx, cy);
}

function pointInTri(px, py, x1, y1, x2, y2, x3, y3) {
  const d1 = sign(px, py, x1, y1, x2, y2);
  const d2 = sign(px, py, x2, y2, x3, y3);
  const d3 = sign(px, py, x3, y3, x1, y1);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function sign(px, py, x1, y1, x2, y2) {
  return (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
}
