import Phaser from 'phaser';
import { Enemy } from './Enemy.js';

/**
 * Frozen Tundra ice cubes (waves 1–10).
 * Small: chill on hit. Big: knockback + freeze. Medium: dash attack.
 */
export class IceCube extends Enemy {
  constructor(scene, x, y, typeId, wave) {
    super(scene, x, y, typeId, wave);
    this.isIceCube = true;
    this.isDashIce = !!this.enemyData.isDashIce;
    this.nextDashTime = scene.time.now + 800 + Math.random() * 900;
    this.phase = 'chase';
    this.phaseEnd = 0;
    this.dashHit = false;
    this.attackTimers = [];
  }

  trackTimer(event) {
    if (event) this.attackTimers.push(event);
    return event;
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
    } else if (this.phase === 'dash') {
      this.setTint(0xccf6ff);
    } else if (time >= this.slowEndTime) {
      this.clearTint();
    }

    this.updateHpBar();

    if (this.phase === 'dash') {
      this.updateDash(time, player);
      return;
    }

    if (time < (this.sandStunUntil || 0)) {
      this.setVelocity(0, 0);
      this.setTint(0xd4b483);
      return;
    }

    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const speed = this.chaseSpeed * this.slowMultiplier;
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    if (this.isDashIce && time >= this.nextDashTime) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      if (dist < 320 && dist > 60) {
        this.beginDash(player, time);
      } else {
        this.nextDashTime = time + 400;
      }
    }
  }

  beginDash(player, time) {
    this.phase = 'dash';
    this.dashHit = false;
    this.aimAngle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    this.dashEndX = this.x + Math.cos(this.aimAngle) * 220;
    this.dashEndY = this.y + Math.sin(this.aimAngle) * 220;
    this.phaseEnd = time + 280;
    this.setTint(0xccf6ff);
    this.scene.fx?.burst(this.x, this.y, {
      count: 5,
      color: 0xaaddff,
      speed: 70,
      life: 160,
      size: 3,
    });
  }

  updateDash(time, player) {
    const dist = Phaser.Math.Distance.Between(this.x, this.y, this.dashEndX, this.dashEndY);
    if (dist < 16 || time >= this.phaseEnd) {
      this.setVelocity(0, 0);
      this.clearTint();
      this.phase = 'chase';
      this.nextDashTime = time + 2200 + Math.random() * 800;
      return;
    }

    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.dashEndX, this.dashEndY);
    const speed = 480;
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    if (!this.dashHit && player?.active) {
      const pDist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      if (pDist < this.enemyData.radius + 20) {
        this.dashHit = true;
        const dmg = this.enemyData.dashDamage || 6;
        player.takeDamage(dmg, time);
        this.scene.fx?.flash(player.x, player.y, 12, 0xaaddff, 140, 22);
        this.scene.fx?.burst(player.x, player.y, {
          count: 6,
          color: 0x88ccff,
          speed: 90,
          life: 180,
          size: 3,
        });
      }
    }
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

export function isIceCubeType(typeId) {
  return ['iceCubeSmall', 'iceCubeBig', 'iceCubeMedium'].includes(typeId);
}
