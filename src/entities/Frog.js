import Phaser from 'phaser';
import { Enemy } from './Enemy.js';
import { spawnAcidPuddle } from '../systems/SwampHazards.js';

/**
 * Murk Swamp frogs (waves 1–10).
 * Tongue: pull. Dash: long charge. Acid: spit puddle.
 */
export class Frog extends Enemy {
  constructor(scene, x, y, typeId, wave) {
    super(scene, x, y, typeId, wave);
    this.isFrog = true;
    this.isTongueFrog = !!this.enemyData.isTongueFrog;
    this.isDashFrog = !!this.enemyData.isDashFrog;
    this.isAcidFrog = !!this.enemyData.isAcidFrog;
    this.preferRange = this.enemyData.preferRange || 280;
    this.attackDamage = this.enemyData.attackDamage || 10;
    this.nextAttackTime = scene.time.now + 700 + Math.random() * 900;
    this.phase = 'chase';
    this.phaseEnd = 0;
    this.busy = false;
    this.dashHit = false;
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
    } else if (this.phase === 'dash') {
      this.setTint(0xaaff88);
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

    if (this.busy) {
      this.setVelocity(0, 0);
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const speed = this.chaseSpeed * this.slowMultiplier;

    if (this.isAcidFrog) {
      if (dist > this.preferRange + 40) {
        this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      } else if (dist < this.preferRange - 50) {
        this.setVelocity(-Math.cos(angle) * speed * 0.9, -Math.sin(angle) * speed * 0.9);
      } else {
        this.setVelocity(-Math.sin(angle) * speed * 0.35, Math.cos(angle) * speed * 0.35);
      }
    } else {
      this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    }

    if (!this.isOnPlayerScreen() || time < this.nextAttackTime) return;

    if (this.isTongueFrog) {
      const range = this.enemyData.tongueRange || 210;
      if (dist <= range && dist > 40) this.castTongue(player, time);
    } else if (this.isDashFrog) {
      if (dist < 380 && dist > 70) this.beginDash(player, time);
      else this.nextAttackTime = time + 350;
    } else if (this.isAcidFrog) {
      this.castAcidSpit(player, time);
    }
  }

  castTongue(player, time) {
    if (!player?.active || !this.isAttackAlive()) return;
    this.busy = true;
    this.setVelocity(0, 0);
    this.nextAttackTime = time + 2200 + Math.random() * 600;

    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const range = this.enemyData.tongueRange || 210;
    const tipX = this.x + Math.cos(angle) * range;
    const tipY = this.y + Math.sin(angle) * range;

    // Use pooled beam buffer — never push Graphics into FxPool.release.
    this.fx?.beam(this.x, this.y, tipX, tipY, 0xff6688, 200, 6);
    this.fx?.beam(this.x, this.y, tipX, tipY, 0xff99aa, 200, 3);
    const tip = this.holdTracked(this.fx?.hold(tipX, tipY, 7, 0xff99aa, 0.95, 12));
    this.fx?.flash(this.x, this.y, 10, 0xff8899, 160, 28);

    const hit =
      Phaser.Math.Distance.Between(player.x, player.y, tipX, tipY) < 36 ||
      pointNearSegment(player.x, player.y, this.x, this.y, tipX, tipY, 22);

    if (hit) {
      player.takeDamage(this.enemyData.tongueDamage || this.attackDamage, time);
      const pullAng = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
      player.applyKnockback?.(pullAng, 420);
      this.fx?.burst(player.x, player.y, { count: 6, color: 0xff6688, speed: 100, life: 200, size: 3 });
    }

    this.trackTimer(
      this.scene.time.delayedCall(180, () => {
        if (tip) {
          this.fx?.release(tip);
          this.untrackHeld(tip);
        }
        this.busy = false;
      }),
    );
  }

  beginDash(player, time) {
    this.phase = 'dash';
    this.dashHit = false;
    this.busy = true;
    this.aimAngle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const len = 340;
    this.dashEndX = this.x + Math.cos(this.aimAngle) * len;
    this.dashEndY = this.y + Math.sin(this.aimAngle) * len;
    this.phaseEnd = time + 420;
    this.nextAttackTime = time + 2600 + Math.random() * 500;
    this.setTint(0xaaff88);
    this.fx?.burst(this.x, this.y, { count: 8, color: 0x66cc44, speed: 140, life: 220, size: 4 });
  }

  updateDash(time, player) {
    const speed = 520;
    this.setVelocity(Math.cos(this.aimAngle) * speed, Math.sin(this.aimAngle) * speed);

    if (!this.dashHit && player?.active) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      if (dist < (this.enemyData.radius || 16) + 22) {
        this.dashHit = true;
        player.takeDamage(this.enemyData.dashDamage || 14, time);
        this.fx?.flash(player.x, player.y, 14, 0x88ee55, 180, 36);
      }
    }

    if (time >= this.phaseEnd) {
      this.phase = 'chase';
      this.busy = false;
      this.setVelocity(0, 0);
      this.clearTint();
    }
  }

  castAcidSpit(player, time) {
    if (!player?.active || !this.fx || !this.isAttackAlive()) return;
    this.busy = true;
    this.nextAttackTime = time + 2400 + Math.random() * 700;

    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const orb = this.holdTracked(this.fx.hold(this.x, this.y, 9, 0x88ee44, 0.95, 12));
    if (!orb) {
      this.busy = false;
      return;
    }
    orb.setStrokeStyle(2, 0xccff66, 0.85);

    const speed = 300;
    const maxDist = 420;
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

          const hitPlayer =
            player?.active && Phaser.Math.Distance.Between(x, y, player.x, player.y) < 22;
          if (hitPlayer || traveled >= maxDist) {
            this.fx?.release(orb);
            this.untrackHeld(orb);
            tick.remove(false);
            if (hitPlayer) {
              player.takeDamage(this.attackDamage, this.scene.time.now);
            }
            spawnAcidPuddle(this.scene, x, y, {
              radius: 72,
              tickDamage: 8,
              durationMs: 2600 + Math.random() * 1200,
            });
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

function pointNearSegment(px, py, x1, y1, x2, y2, thresh) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Phaser.Math.Clamp(t, 0, 1);
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Phaser.Math.Distance.Between(px, py, cx, cy) <= thresh;
}

const FROG_TYPES = ['frogTongue', 'frogDash', 'frogAcid'];

export function isFrogType(typeId) {
  return FROG_TYPES.includes(typeId);
}
