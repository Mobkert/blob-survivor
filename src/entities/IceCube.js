import Phaser from 'phaser';
import { Enemy } from './Enemy.js';

/**
 * Frozen Tundra ice cubes (waves 1–10).
 * Small: chill on hit. Big: explode near player. Medium: dash attack.
 */
export class IceCube extends Enemy {
  constructor(scene, x, y, typeId, wave) {
    super(scene, x, y, typeId, wave);
    this.isIceCube = true;
    this.isDashIce = !!this.enemyData.isDashIce;
    this.isExplodeIce = !!this.enemyData.isExplodeIce;
    this.nextDashTime = scene.time.now + 800 + Math.random() * 900;
    this.phase = 'chase';
    this.phaseEnd = 0;
    this.dashHit = false;
    this.hasExploded = false;
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

    if (this.phase === 'lunge') {
      this.updateLunge(time);
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

    if (this.isExplodeIce && player?.active && !this.hasExploded) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      if (dist <= (this.enemyData.explodeRange || 78)) {
        this.explodeNearPlayer(player, time);
        return;
      }
    }

    if (this.isDashIce && time >= this.nextDashTime) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      if (dist < 320 && dist > 60) {
        this.beginDash(player, time);
      } else {
        this.nextDashTime = time + 400;
      }
    }
  }

  explodeNearPlayer(player, time) {
    if (this.hasExploded || this.isDying || !this.active) return;
    this.hasExploded = true;
    this.setVelocity(0, 0);

    const dmg = this.enemyData.explodeDamage || 25;
    const freezeMs = this.enemyData.explodeFreezeMs || 750;

    this.scene.fx?.burst(this.x, this.y, {
      count: 18,
      color: 0xaaddff,
      speed: 180,
      life: 320,
      size: 5,
    });
    this.scene.fx?.burst(this.x, this.y, {
      count: 10,
      color: 0xffffff,
      speed: 120,
      life: 260,
      size: 4,
    });
    this.scene.fx?.flash(this.x, this.y, 42, 0xccf0ff, 280, 90);

    if (player?.active) {
      player.takeDamage(dmg, time);
      player.applyFreeze?.(time, freezeMs);
    }

    // Self-destruct through combat so XP/coins still drop.
    const combat = this.scene.combatSystem;
    if (combat?.hitEnemy) {
      combat.hitEnemy(this, this.hp + 999, { fromCloud: true });
    } else {
      this.hp = 0;
      this.markDying();
      this.destroy();
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
        // Mini / dash cubes bounce out of the player hitbox after connecting.
        this.lungeAwayFrom(player, time, 140);
      }
    }
  }

  /** Knock this cube away from the player so it cannot sit inside the hitbox. */
  lungeAwayFrom(player, time, distance = 160) {
    if (!player?.active || this.isDying || !this.active) return;
    if (time < (this._lungeUntil || 0)) return;
    this._lungeUntil = time + 450;

    const ang = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
    // If overlapping center, pick away from player facing / random
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const angle = dist < 4 ? ang + Math.PI : ang;
    const distPush = distance;
    this.phase = 'lunge';
    this.phaseEnd = time + 220;
    this.dashEndX = this.x + Math.cos(angle) * distPush;
    this.dashEndY = this.y + Math.sin(angle) * distPush;
    this.setVelocity(Math.cos(angle) * 520, Math.sin(angle) * 520);
    this.scene.fx?.burst(this.x, this.y, {
      count: 5,
      color: 0xaaddff,
      speed: 80,
      life: 140,
      size: 2,
    });
  }

  updateLunge(time) {
    const dist = Phaser.Math.Distance.Between(this.x, this.y, this.dashEndX, this.dashEndY);
    if (dist < 18 || time >= this.phaseEnd) {
      this.setVelocity(0, 0);
      this.clearTint();
      this.phase = 'chase';
      this.nextDashTime = Math.max(this.nextDashTime || 0, time + 900);
      return;
    }
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.dashEndX, this.dashEndY);
    this.setVelocity(Math.cos(angle) * 480, Math.sin(angle) * 480);
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
