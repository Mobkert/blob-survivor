import Phaser from 'phaser';
import { Enemy } from './Enemy.js';
import { spawnSpiderWeb } from '../systems/SwampHazards.js';

/**
 * Swamp Spider — shoots webs that leave a strong slow patch on hit.
 * Optimized attack lifecycle like wizards.
 */
export class SwampSpider extends Enemy {
  constructor(scene, x, y, typeId, wave) {
    super(scene, x, y, typeId || 'swampSpider', wave);
    this.isSwampSpider = true;
    this.preferRange = this.enemyData.preferRange || 300;
    this.attackDamage = this.enemyData.attackDamage || 8;
    this.nextAttackTime = scene.time.now + 800 + Math.random() * 900;
    this.busy = false;
    this.attackTimers = [];
    this.heldFx = [];
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
    this.heldFx.forEach((obj) => this.fx?.release(obj));
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

  isOnPlayerScreen() {
    const cam = this.scene.cameras?.main;
    if (!cam) return true;
    const m = 40;
    return (
      this.x >= cam.worldView.x - m &&
      this.x <= cam.worldView.right + m &&
      this.y >= cam.worldView.y - m &&
      this.y <= cam.worldView.bottom + m
    );
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
    } else if (dist < this.preferRange - 50) {
      this.setVelocity(-Math.cos(angle) * speed * 0.85, -Math.sin(angle) * speed * 0.85);
    } else {
      this.setVelocity(-Math.sin(angle) * speed * 0.4, Math.cos(angle) * speed * 0.4);
    }

    if (!this.busy && time >= this.nextAttackTime && this.isOnPlayerScreen()) {
      this.shootWeb(player, time);
    }
  }

  shootWeb(player, time) {
    if (!player?.active || !this.fx || !this.isAttackAlive()) return;
    this.busy = true;
    this.nextAttackTime = time + 2600 + Math.random() * 700;

    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const orb = this.holdTracked(this.fx.hold(this.x, this.y, 8, 0xe8e0c8, 0.95, 11));
    if (!orb) {
      this.busy = false;
      return;
    }
    orb.setStrokeStyle(2, 0xffffff, 0.7);

    const speed = 320;
    const maxDist = 440;
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
          x += Math.cos(angle) * speed * 0.04;
          y += Math.sin(angle) * speed * 0.04;
          traveled += speed * 0.04;
          orb.setPosition(x, y);

          const hit =
            player?.active && Phaser.Math.Distance.Between(x, y, player.x, player.y) < 24;
          if (hit || traveled >= maxDist) {
            this.fx?.release(orb);
            this.untrackHeld(orb);
            tick.remove(false);
            if (hit) {
              player.takeDamage(this.attackDamage, this.scene.time.now);
              spawnSpiderWeb(this.scene, player.x, player.y, {
                radius: 68,
                slowStrength: 0.28,
                durationMs: 4800,
              });
              this.fx?.burst(player.x, player.y, {
                count: 12,
                color: 0xe8e0c8,
                speed: 110,
                life: 280,
                size: 3,
              });
            }
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

export function isSwampSpiderType(typeId) {
  return typeId === 'swampSpider';
}
