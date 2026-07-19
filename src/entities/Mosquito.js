import Phaser from 'phaser';
import { Enemy } from './Enemy.js';

/**
 * Mosquito — latches onto the player (max 2 at a time), drains HP for 2s.
 * Quick wing-flap animation. Low HP, mid-quick speed.
 */
export class Mosquito extends Enemy {
  constructor(scene, x, y, typeId, wave) {
    super(scene, x, y, typeId || 'mosquito', wave);
    this.isMosquito = true;
    this.latched = false;
    this.latchUntil = 0;
    this.nextSuck = 0;
    this.latchOffsetAngle = Math.random() * Math.PI * 2;
    this.attackTimers = [];
    this.wingPhase = 0;

    // Tiny wing sprites
    this.wingL = scene.add.ellipse(x - 6, y - 2, 10, 5, 0xccddee, 0.55).setDepth(6);
    this.wingR = scene.add.ellipse(x + 6, y - 2, 10, 5, 0xccddee, 0.55).setDepth(6);
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
        /* ignore */
      }
    });
    this.attackTimers.length = 0;
    this.detach();
  }

  static countLatched(scene) {
    const enemies = scene.waveManager?.enemies?.getChildren?.() || [];
    return enemies.filter((e) => e.active && e.isMosquito && e.latched).length;
  }

  update(time, player) {
    if (this.isDying || !this.active) return;

    if (time < this.slowEndTime) this.slowMultiplier = this.slowStrength || 0.5;
    else this.slowMultiplier = 1;

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
    this.flapWings(time);

    if (this.latched) {
      this.updateLatch(time, player);
      return;
    }

    if (time < (this.sandStunUntil || 0)) {
      this.setVelocity(0, 0);
      this.setTint(0xd4b483);
      this.syncWings();
      return;
    }

    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const speed = this.chaseSpeed * this.slowMultiplier;
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.syncWings();

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    if (dist < 36 && Mosquito.countLatched(this.scene) < 2) {
      this.beginLatch(player, time);
    }
  }

  flapWings(time) {
    this.wingPhase = Math.sin(time * 0.045) * 0.55;
    if (this.wingL?.active) {
      this.wingL.setScale(1, 0.45 + Math.abs(this.wingPhase));
      this.wingL.angle = -25 - this.wingPhase * 35;
    }
    if (this.wingR?.active) {
      this.wingR.setScale(1, 0.45 + Math.abs(this.wingPhase));
      this.wingR.angle = 25 + this.wingPhase * 35;
    }
  }

  syncWings() {
    if (this.wingL?.active) this.wingL.setPosition(this.x - 7, this.y - 3);
    if (this.wingR?.active) this.wingR.setPosition(this.x + 7, this.y - 3);
  }

  beginLatch(player, time) {
    this.latched = true;
    this.setVelocity(0, 0);
    const dur = this.enemyData.latchDurationMs || 2000;
    this.latchUntil = time + dur;
    this.nextSuck = time;
    this.latchOffsetAngle = Math.random() * Math.PI * 2;
    this.scene.fx?.flash(player.x, player.y, 10, 0xaa6644, 160, 28);
  }

  updateLatch(time, player) {
    if (!player?.active || time >= this.latchUntil) {
      this.detach();
      return;
    }

    const r = 22;
    this.x = player.x + Math.cos(this.latchOffsetAngle) * r;
    this.y = player.y + Math.sin(this.latchOffsetAngle) * r - 6;
    this.setVelocity(0, 0);
    this.syncWings();

    if (time >= this.nextSuck) {
      const tick = this.enemyData.latchTickMs || 500;
      this.nextSuck = time + tick;
      const min = this.enemyData.latchDamageMin || 5;
      const max = this.enemyData.latchDamageMax || 7;
      const dmg = min + Math.floor(Math.random() * (max - min + 1));
      player.takeDamage(dmg, time);
      this.scene.fx?.burst(this.x, this.y, {
        count: 4,
        color: 0xcc3344,
        speed: 60,
        life: 180,
        size: 3,
      });
    }
  }

  detach() {
    this.latched = false;
  }

  markDying() {
    this.clearAttacks();
    this.wingL?.destroy();
    this.wingR?.destroy();
    this.wingL = null;
    this.wingR = null;
    super.markDying();
  }

  destroy(fromScene) {
    this.clearAttacks();
    this.wingL?.destroy();
    this.wingR?.destroy();
    super.destroy(fromScene);
  }
}

export function isMosquitoType(typeId) {
  return typeId === 'mosquito';
}
