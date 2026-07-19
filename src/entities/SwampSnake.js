import Phaser from 'phaser';
import { Enemy } from './Enemy.js';

/**
 * Murk Snake — 3–5 body circles. Killing a segment shrinks it;
 * fewer segments = less speed, HP, and damage.
 */
export class SwampSnake extends Enemy {
  constructor(scene, x, y, typeId, wave) {
    super(scene, x, y, typeId || 'swampSnake', wave);
    this.isSwampSnake = true;

    const min = this.enemyData.segmentMin || 3;
    const max = this.enemyData.segmentMax || 5;
    this.maxSegments = min + Math.floor(Math.random() * (max - min + 1));
    this.segments = this.maxSegments;
    this.baseHp = this.maxHp;
    this.baseSpeed = this.chaseSpeed;
    this.baseContact = this.contactDamage;

    this.segmentSprites = [];
    this.trail = [];
    for (let i = 0; i < this.maxSegments - 1; i++) {
      const s = scene.add.image(x, y, 'enemy_swampSnakeSeg').setDepth(4);
      this.segmentSprites.push(s);
      this.trail.push({ x, y });
    }

    this.applySegmentStats(true);
  }

  applySegmentStats(fullHeal) {
    const ratio = this.segments / this.maxSegments;
    this.maxHp = Math.max(24, Math.floor(this.baseHp * ratio));
    if (fullHeal) this.hp = this.maxHp;
    else this.hp = Math.min(this.hp, this.maxHp);
    this.chaseSpeed = Math.max(55, Math.floor(this.baseSpeed * (0.45 + 0.55 * ratio)));
    this.contactDamage = Math.max(3, Math.floor(this.baseContact * (0.5 + 0.5 * ratio)));
    this.setScale(0.75 + 0.25 * ratio);
    this.segmentSprites.forEach((s, i) => {
      s.setVisible(i < this.segments - 1);
      s.setScale(0.7 + 0.25 * ratio);
    });
  }

  update(time, player) {
    if (this.isDying || !this.active) return;
    super.update(time, player);

    // Record head trail for body follow
    this.trail.unshift({ x: this.x, y: this.y });
    const spacing = 16;
    const maxTrail = this.maxSegments * spacing + 8;
    if (this.trail.length > maxTrail) this.trail.length = maxTrail;

    for (let i = 0; i < this.segmentSprites.length; i++) {
      const spr = this.segmentSprites[i];
      if (!spr.visible) continue;
      const idx = Math.min(this.trail.length - 1, (i + 1) * spacing);
      const p = this.trail[idx] || { x: this.x, y: this.y };
      spr.setPosition(p.x, p.y);
    }
  }

  takeDamage(damage, ignoreInstantKill = false) {
    if (this.isDying) return false;
    if (this.hp - damage <= 0 && this.segments > 1) {
      this.segments -= 1;
      this.applySegmentStats(true);
      this.showHpBar = true;
      this.updateHpBar();
      this.setTint(0xffffff);
      this.scene.time.delayedCall(60, () => {
        if (this.active) this.clearTint();
      });
      this.scene.fx?.burst(this.x, this.y, {
        count: 10,
        color: 0x66aa33,
        speed: 140,
        life: 260,
        size: 4,
      });
      this.scene.fx?.flash(this.x, this.y, 14, 0x88cc55, 200, 36);
      return false;
    }
    return super.takeDamage(damage, ignoreInstantKill);
  }

  markDying() {
    this.segmentSprites.forEach((s) => s.destroy());
    this.segmentSprites = [];
    super.markDying();
  }

  destroy(fromScene) {
    this.segmentSprites.forEach((s) => {
      try {
        s.destroy();
      } catch {
        /* ignore */
      }
    });
    this.segmentSprites = [];
    super.destroy(fromScene);
  }
}

export function isSwampSnakeType(typeId) {
  return typeId === 'swampSnake';
}
