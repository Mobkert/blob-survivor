import Phaser from 'phaser';
import { Enemy } from './Enemy.js';
import { getScaledBossHp } from '../data/enemies.js';

const TELEGRAPH_MS = 1000;
const STUN_MS = 10000;
const MOVES_BEFORE_STUN = 4;
const ATTACK_GAP_MS = 900;

const ATTACKS = ['line', 'cone', 'aoe', 'normal', 'bomb'];

export class GoblinKing extends Enemy {
  constructor(scene, x, y, wave) {
    super(scene, x, y, 'goblinKing', wave);

    this.maxHp = getScaledBossHp(this.enemyData.hp, wave, 'goblinKing');
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
    this.attackDamage = this.enemyData.attackDamage || 48;
    this.farDistance = this.enemyData.farDistance || 520;

    this.telegraph = scene.add.graphics().setDepth(4);
    this.stunText = null;

    scene.events.emit('boss-spawned', this);
  }

  update(time, player) {
    if (this.isDying || !this.active) return;

    if (time < this.poisonEndTime) {
      if (time >= this.poisonTickTime) {
        this.poisonTickTime = time + 500;
        this.takeDamage(this.poisonDamage || 3, true);
      }
      this.setTint(0x88ff44);
    } else if (this.phase !== 'stun' && this.phase !== 'dash') {
      this.clearTint();
    }

    this.updateHpBar();

    if (this.phase === 'dash') {
      this.updateDash(time, player);
      return;
    }

    // Keep boss inside the arena
    const half = (this.scene.arenaSize || 2400) / 2 - 80;
    this.x = Phaser.Math.Clamp(this.x, -half, half);
    this.y = Phaser.Math.Clamp(this.y, -half, half);

    if (this.phase === 'stun') {
      this.setVelocity(0, 0);
      if (time >= this.phaseEnd) {
        this.phase = 'idle';
        this.moveCount = 0;
        this.clearTint();
        this.scene.events.emit('boss-message', '');
      }
      return;
    }

    this.setVelocity(0, 0);

    if (this.phase === 'telegraph') {
      this.drawTelegraph();
      if (time >= this.phaseEnd) {
        this.clearTelegraph();
        this.executeAttack(player, time);
      }
      return;
    }

    if (this.phase === 'recover') {
      if (time >= this.phaseEnd) {
        this.phase = 'idle';
      }
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
      attack = 'dash';
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
    g.fillStyle(0xff2222, 0.35);
    g.lineStyle(2, 0xff4444, 0.8);

    const attack = this.pendingAttack;
    if (attack === 'line' || attack === 'dash') {
      const len = attack === 'dash' ? 560 : 520;
      const width = attack === 'dash' ? 70 : 56;
      this.drawOrientedRect(g, this.x, this.y, this.aimAngle, len, width);
    } else if (attack === 'cone') {
      this.drawCone(g, this.x, this.y, this.aimAngle, 340, Phaser.Math.DegToRad(55));
    } else if (attack === 'aoe') {
      g.fillCircle(this.x, this.y, 200);
      g.strokeCircle(this.x, this.y, 200);
    } else if (attack === 'normal') {
      const nx = this.x + Math.cos(this.aimAngle) * 70;
      const ny = this.y + Math.sin(this.aimAngle) * 70;
      g.fillCircle(nx, ny, 110);
      g.strokeCircle(nx, ny, 110);
    } else if (attack === 'bomb') {
      g.fillCircle(this.lockedX, this.lockedY, 95);
      g.strokeCircle(this.lockedX, this.lockedY, 95);
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

  drawCone(g, x, y, angle, range, halfWidth) {
    const steps = 10;
    g.beginPath();
    g.moveTo(x, y);
    for (let i = 0; i <= steps; i++) {
      const a = angle - halfWidth + (halfWidth * 2 * i) / steps;
      g.lineTo(x + Math.cos(a) * range, y + Math.sin(a) * range);
    }
    g.closePath();
    g.fillPath();
    g.strokePath();
  }

  clearTelegraph() {
    this.telegraph.clear();
  }

  executeAttack(player, time) {
    const attack = this.pendingAttack;
    this.lastAttack = attack === 'dash' ? 'dash' : attack;

    if (attack === 'dash') {
      this.phase = 'dash';
      this.dashEndX = this.x + Math.cos(this.aimAngle) * 520;
      this.dashEndY = this.y + Math.sin(this.aimAngle) * 520;
      this.phaseEnd = time + 450;
      this.setTint(0xff8866);
      this.hitPlayerInShape(player, time, 'line', 560, 70);
      return;
    }

    if (attack === 'line') {
      this.hitPlayerInShape(player, time, 'line', 520, 56);
    } else if (attack === 'cone') {
      this.hitPlayerInShape(player, time, 'cone', 340, Phaser.Math.DegToRad(55));
    } else if (attack === 'aoe') {
      this.hitPlayerInShape(player, time, 'aoe', 200);
    } else if (attack === 'normal') {
      this.hitPlayerInShape(player, time, 'normal', 110);
    } else if (attack === 'bomb') {
      this.spawnBombVisual(this.lockedX, this.lockedY);
      this.hitPlayerInShape(player, time, 'bomb', 95);
    }

    this.onMoveFinished(time);
  }

  updateDash(time, player) {
    const dist = Phaser.Math.Distance.Between(this.x, this.y, this.dashEndX, this.dashEndY);
    if (dist < 20 || time >= this.phaseEnd) {
      this.setVelocity(0, 0);
      this.clearTint();
      this.onMoveFinished(time);
      return;
    }
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.dashEndX, this.dashEndY);
    const speed = 900;
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    const pDist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    if (pDist < this.enemyData.radius + 24) {
      player.takeDamage(this.attackDamage * 1.1, time);
    }
  }

  onMoveFinished(time) {
    this.moveCount += 1;
    this.pendingAttack = null;

    if (this.moveCount >= MOVES_BEFORE_STUN) {
      this.phase = 'stun';
      this.phaseEnd = time + STUN_MS;
      this.setVelocity(0, 0);
      this.setTint(0x88aaff);
      this.scene.events.emit('boss-message', 'The Goblin King is stunned!');
      this.scene.events.emit('boss-stunned', this);
      return;
    }

    this.phase = 'recover';
    this.phaseEnd = time + ATTACK_GAP_MS;
  }

  hitPlayerInShape(player, time, shape, a, b = 0) {
    const px = player.x;
    const py = player.y;
    let hit = false;

    if (shape === 'line') {
      hit = this.pointInOrientedRect(px, py, this.x, this.y, this.aimAngle, a, b);
    } else if (shape === 'cone') {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, px, py);
      const ang = Phaser.Math.Angle.Between(this.x, this.y, px, py);
      const diff = Math.abs(Phaser.Math.Angle.Wrap(ang - this.aimAngle));
      hit = dist <= a && diff <= b;
    } else if (shape === 'aoe') {
      hit = Phaser.Math.Distance.Between(this.x, this.y, px, py) <= a;
    } else if (shape === 'normal') {
      const nx = this.x + Math.cos(this.aimAngle) * 70;
      const ny = this.y + Math.sin(this.aimAngle) * 70;
      hit = Phaser.Math.Distance.Between(nx, ny, px, py) <= a;
    } else if (shape === 'bomb') {
      hit = Phaser.Math.Distance.Between(this.lockedX, this.lockedY, px, py) <= a;
    }

    if (hit) {
      const mult = shape === 'bomb' ? 1.15 : shape === 'aoe' ? 1.05 : 1;
      player.takeDamage(this.attackDamage * mult, time);
    }
  }

  pointInOrientedRect(px, py, x, y, angle, length, width) {
    const dx = px - x;
    const dy = py - y;
    const localX = dx * Math.cos(angle) + dy * Math.sin(angle);
    const localY = -dx * Math.sin(angle) + dy * Math.cos(angle);
    return localX >= 0 && localX <= length && Math.abs(localY) <= width / 2;
  }

  spawnBombVisual(x, y) {
    const ring = this.scene.add.circle(x, y, 12, 0xff5522, 0.7).setDepth(9);
    this.scene.tweens.add({
      targets: ring,
      radius: 95,
      alpha: 0,
      duration: 280,
      onComplete: () => ring.destroy(),
    });
  }

  takeDamage(damage, ignoreInstantKill = false) {
    const killed = super.takeDamage(damage, ignoreInstantKill);
    this.scene.events.emit('boss-hp', this);
    return killed;
  }

  markDying() {
    super.markDying();
    this.clearTelegraph();
    this.telegraph.destroy();
    this.scene.events.emit('boss-defeated', this);
    this.scene.events.emit('boss-message', 'Goblin King defeated!');
  }

  destroy(fromScene) {
    if (this.telegraph) {
      this.telegraph.destroy();
      this.telegraph = null;
    }
    super.destroy(fromScene);
  }
}
