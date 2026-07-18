import Phaser from 'phaser';
import { Enemy } from './Enemy.js';

/**
 * Mini magma cubes for Volcanic Ridge (wave 11+).
 * Melee variants apply burn on contact; spitter fires lava orbs.
 */
export class MagmaCube extends Enemy {
  constructor(scene, x, y, typeId, wave) {
    super(scene, x, y, typeId, wave);
    this.isMagma = true;
    this.isRangedMagma = !!this.enemyData.isRangedMagma;
    this.preferRange = this.enemyData.preferRange || 270;
    this.attackDamage = this.enemyData.attackDamage || 18;
    this.nextAttackTime = scene.time.now + 600 + Math.random() * 700;
    this.attackTimers = [];
    this.heldFx = [];
    this.busy = false;

    if (scene.levelId === 'volcanic') {
      this.maxHp = Math.floor(this.maxHp * 2);
      this.hp = this.maxHp;
      this.attackDamage = Math.floor(this.attackDamage * 1.5);
      this.contactDamage = Math.floor(this.contactDamage * 1.5);
      if (this.enemyData.burnDamage) {
        this.enemyData.burnDamage = Math.floor(this.enemyData.burnDamage * 1.5);
      }
    }
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
    this.heldFx.forEach((obj) => this.fx?.release(obj));
    this.heldFx.length = 0;
    this.busy = false;
  }

  isAttackAlive() {
    return this.active && !this.isDying;
  }

  update(time, player) {
    if (this.isDying || !this.active) return;

    this.updateStatus(time);
    this.updateHpBar();

    if (!this.isRangedMagma) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
      const speed = this.chaseSpeed * this.slowMultiplier;
      this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      return;
    }

    // Spitter: keep preferred range, shoot lava orbs.
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const speed = this.chaseSpeed * this.slowMultiplier;

    if (dist > this.preferRange + 40) {
      this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    } else if (dist < this.preferRange - 50) {
      this.setVelocity(-Math.cos(angle) * speed * 0.9, -Math.sin(angle) * speed * 0.9);
    } else {
      this.setVelocity(-Math.sin(angle) * speed * 0.4, Math.cos(angle) * speed * 0.4);
    }

    if (!this.busy && time >= this.nextAttackTime) {
      this.fireLavaOrb(player, time);
      this.nextAttackTime = time + 2100 + Math.random() * 400;
    }
  }

  updateStatus(time) {
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
  }

  fireLavaOrb(player, time) {
    if (!player?.active || !this.fx || !this.isAttackAlive()) return;
    this.busy = true;

    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const orb = this.holdTracked(this.fx.hold(this.x, this.y, 8, 0xff5522, 0.95, 12));
    if (!orb) {
      this.busy = false;
      return;
    }
    orb.setStrokeStyle(2, 0xffcc66, 0.8);

    const speed = 340;
    const maxDist = 480;
    let traveled = 0;
    let x = this.x;
    let y = this.y;

    const tick = this.trackTimer(
      this.scene.time.addEvent({
        delay: 40,
        loop: true,
        callback: () => {
          if (!this.isAttackAlive() || !orb.active) {
            this.fx?.release(orb);
            this.untrackHeld(orb);
            tick.remove(false);
            this.busy = false;
            return;
          }

          const step = speed * 0.04;
          x += Math.cos(angle) * step;
          y += Math.sin(angle) * step;
          traveled += step;
          orb.setPosition(x, y);

          if (Math.random() < 0.35) {
            this.fx.burst(x, y, { count: 2, color: 0xff7722, speed: 40, life: 100, size: 2 });
          }

          if (player.active && Phaser.Math.Distance.Between(x, y, player.x, player.y) < 22) {
            player.takeDamage(this.attackDamage, time);
            player.applyBurn?.(time, this.enemyData.burnDamage || 3, this.enemyData.burnMs || 1800);
            this.fx.flash(player.x, player.y, 12, 0xff8844, 140, 24);
            this.fx.release(orb);
            this.untrackHeld(orb);
            tick.remove(false);
            this.busy = false;
            return;
          }

          if (traveled >= maxDist) {
            this.fx.release(orb);
            this.untrackHeld(orb);
            tick.remove(false);
            this.busy = false;
          }
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

export function isMagmaType(typeId) {
  return ['magmaCube', 'magmaBrute', 'magmaSpitter'].includes(typeId);
}
