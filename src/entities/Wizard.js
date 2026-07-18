import Phaser from 'phaser';
import { Enemy } from './Enemy.js';

/**
 * Wizard enemies (wave 10+) — rich VFX via shared FxPool.
 * All attack timers/FX are tracked and cleared on death.
 */
export class Wizard extends Enemy {
  constructor(scene, x, y, typeId, wave) {
    super(scene, x, y, typeId, wave);
    this.isWizard = true;
    this.nextAttackTime = scene.time.now + 800 + Math.random() * 600;
    this.preferRange = this.enemyData.preferRange || 280;
    this.attackDamage = this.enemyData.attackDamage || 20;
    this.busy = false;
    this.attackTimers = [];
    this.heldFx = [];

    if (scene.levelId === 'volcanic') {
      this.maxHp = Math.floor(this.maxHp * 2);
      this.hp = this.maxHp;
      this.attackDamage = Math.floor(this.attackDamage * 1.5);
      this.contactDamage = Math.floor(this.contactDamage * 1.5);
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
    this.busy = false;
  }

  isAttackAlive() {
    return this.active && !this.isDying;
  }

  update(time, player) {
    if (this.isDying || !this.active) return;

    this.updateStatus(time);
    this.updateHpBar();

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const speed = this.chaseSpeed * this.slowMultiplier;

    if (dist > this.preferRange + 40) {
      this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    } else if (dist < this.preferRange - 50) {
      const retreat = this.typeId === 'healWizard' ? 1.05 : 0.85;
      this.setVelocity(-Math.cos(angle) * speed * retreat, -Math.sin(angle) * speed * retreat);
    } else {
      const strafe = this.typeId === 'healWizard' ? 0.7 : 0.35;
      this.setVelocity(-Math.sin(angle) * speed * strafe, Math.cos(angle) * speed * strafe);
    }

    if (!this.busy && time >= this.nextAttackTime) {
      this.performAttack(time, player);
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
    } else if (time >= this.slowEndTime) {
      this.clearTint();
    }
  }

  performAttack(time, player) {
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    switch (this.typeId) {
      case 'wizard':
        this.castElectricShot(player);
        this.nextAttackTime = time + 1900;
        break;
      case 'darkWizard':
        if (dist > 260) {
          this.nextAttackTime = time + 450;
          break;
        }
        this.castBlackHole(player);
        this.nextAttackTime = time + 4800;
        break;
      case 'healWizard':
        this.castHealBeam();
        this.nextAttackTime = time + 2900;
        break;
      case 'lightningWizard':
        if (dist > 280) {
          this.nextAttackTime = time + 450;
          break;
        }
        this.castLightningZone(player);
        this.nextAttackTime = time + 4600;
        break;
      default:
        this.nextAttackTime = time + 2000;
        break;
    }
  }

  castElectricShot(player) {
    if (!player?.active || !this.fx || !this.isAttackAlive()) return;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const bolt = this.holdTracked(this.fx.hold(this.x, this.y, 6, 0x88ddff, 0.95, 12));
    if (!bolt) return;
    bolt.setStrokeStyle(2, 0xffffff, 0.7);

    const speed = 380;
    const maxDist = 440;
    let traveled = 0;
    let x = this.x;
    let y = this.y;
    let sparkAcc = 0;

    const tick = this.trackTimer(
      this.scene.time.addEvent({
        delay: 40,
        loop: true,
        callback: () => {
          if (!this.isAttackAlive() || !bolt.active) {
            this.fx?.release(bolt);
            this.untrackHeld(bolt);
            tick.remove(false);
            return;
          }
          const step = speed * 0.04;
          x += Math.cos(angle) * step;
          y += Math.sin(angle) * step;
          traveled += step;
          bolt.setPosition(x, y);

          sparkAcc += 40;
          if (sparkAcc >= 80) {
            sparkAcc = 0;
            this.fx.burst(x, y, { count: 3, color: 0xaaffff, speed: 60, life: 140, size: 2 });
            if (Math.random() < 0.35) {
              this.fx.bolt(x, y, x + (Math.random() - 0.5) * 28, y + (Math.random() - 0.5) * 28, 0xccffff, 60);
            }
          }

          if (player.active && Phaser.Math.Distance.Between(x, y, player.x, player.y) < 24) {
            player.takeDamage(this.attackDamage, this.scene.time.now);
            this.fx.flash(player.x, player.y, 10, 0xffffff, 160, 28);
            this.fx.release(bolt);
            this.untrackHeld(bolt);
            tick.remove(false);
            return;
          }

          if (traveled >= maxDist) {
            this.fx.release(bolt);
            this.untrackHeld(bolt);
            tick.remove(false);
          }
        },
      }),
    );
  }

  castBlackHole(player) {
    if (!player?.active || this.busy || !this.fx || !this.isAttackAlive()) return;
    this.busy = true;

    const tx = player.x + (Math.random() - 0.5) * 36;
    const ty = player.y + (Math.random() - 0.5) * 36;
    const pullR = 155;
    const core = this.holdTracked(this.fx.hold(tx, ty, 12, 0x220033, 0.92, 10));
    const ring = this.holdTracked(this.fx.hold(tx, ty, 22, 0x6611aa, 0.28, 9));
    if (core) core.setStrokeStyle(3, 0xbb44ff, 0.9);

    let ticks = 0;
    const tick = this.trackTimer(
      this.scene.time.addEvent({
        delay: 80,
        loop: true,
        callback: () => {
          if (!this.isAttackAlive()) {
            this.fx?.release(core);
            this.fx?.release(ring);
            this.untrackHeld(core);
            this.untrackHeld(ring);
            tick.remove(false);
            this.busy = false;
            return;
          }

          ticks += 1;
          if (ring?.active) ring.setRadius(20 + Math.sin(ticks) * 6);
          if (ticks % 2 === 0) {
            this.fx.burst(tx, ty, { count: 4, color: 0xcc66ff, speed: 70, life: 260, size: 2.5 });
          }

          if (player.active) {
            const d = Phaser.Math.Distance.Between(tx, ty, player.x, player.y);
            if (d < pullR) {
              const ang = Phaser.Math.Angle.Between(player.x, player.y, tx, ty);
              const force = Phaser.Math.Clamp((pullR - d) / pullR, 0.2, 1) * 200;
              player.externalVx = (player.externalVx || 0) + Math.cos(ang) * force;
              player.externalVy = (player.externalVy || 0) + Math.sin(ang) * force;
            }
          }

          if (ticks >= 16) {
            tick.remove(false);
            this.fx.flash(tx, ty, 16, 0xaa44ff, 240, 70);
            this.fx.release(core);
            this.fx.release(ring);
            this.untrackHeld(core);
            this.untrackHeld(ring);
            this.busy = false;
          }
        },
      }),
    );
  }

  castHealBeam() {
    if (!this.fx || !this.isAttackAlive()) return;
    const allies = this.scene.waveManager?.enemies?.getChildren() || [];
    let target = null;
    let best = Infinity;
    allies.forEach((e) => {
      if (!e.active || e.isDying || e === this) return;
      if (!e.enemyData?.isWizard && !e.isWizard) return;
      if (e.hp >= e.maxHp) return;
      const d = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
      if (d < best && d < 420) {
        best = d;
        target = e;
      }
    });

    if (!target) {
      this.hp = Math.min(this.maxHp, this.hp + 8);
      this.showHpBar = true;
      this.updateHpBar();
      return;
    }

    let pulses = 0;
    const pulse = this.trackTimer(
      this.scene.time.addEvent({
        delay: 70,
        loop: true,
        callback: () => {
          pulses += 1;
          if (!this.isAttackAlive() || !target.active || target.isDying) {
            pulse.remove(false);
            return;
          }
          this.fx.beam(this.x, this.y, target.x, target.y, 0x66ffaa, 90, 5);
          this.fx.burst(
            Phaser.Math.Linear(this.x, target.x, 0.5),
            Phaser.Math.Linear(this.y, target.y, 0.5),
            { count: 2, color: 0x88ffcc, speed: 40, life: 160, size: 3 },
          );
          if (pulses >= 8) {
            pulse.remove(false);
            target.hp = Math.min(target.maxHp, target.hp + (this.enemyData.healAmount || 18));
            target.showHpBar = true;
            target.updateHpBar?.();
            this.fx.flash(target.x, target.y, 10, 0x66ffaa, 220, 32);
          }
        },
      }),
    );
  }

  castLightningZone(player) {
    if (!player?.active || this.busy || !this.fx || !this.isAttackAlive()) return;
    this.busy = true;

    const zx = player.x + (Math.random() - 0.5) * 50;
    const zy = player.y + (Math.random() - 0.5) * 50;
    const zoneR = 92;
    const zone = this.holdTracked(this.fx.hold(zx, zy, zoneR, 0x888888, 0.28, 4));
    if (zone) zone.setStrokeStyle(2, 0xaaaaaa, 0.75);

    const warn = this.trackTimer(
      this.scene.time.delayedCall(1500, () => {
        if (!this.isAttackAlive() || !zone?.active) {
          this.fx?.release(zone);
          this.untrackHeld(zone);
          this.busy = false;
          return;
        }
        zone.setFillStyle(0x5577aa, 0.22);
        zone.setStrokeStyle(2, 0x88ccff, 0.85);

        let strikes = 0;
        const strike = this.trackTimer(
          this.scene.time.addEvent({
            delay: 280,
            loop: true,
            callback: () => {
              if (!this.isAttackAlive()) {
                strike.remove(false);
                this.fx?.release(zone);
                this.untrackHeld(zone);
                this.busy = false;
                return;
              }

              strikes += 1;
              const sx = zx + (Math.random() - 0.5) * zoneR * 1.3;
              const sy = zy + (Math.random() - 0.5) * zoneR * 1.3;
              this.fx.bolt(sx, sy - 80, sx, sy, 0xffffff, 100);
              this.fx.flash(sx, sy, 8, 0xffee88, 140, 22);

              if (player.active) {
                const inZone = Phaser.Math.Distance.Between(zx, zy, player.x, player.y) <= zoneR;
                const nearBolt = Phaser.Math.Distance.Between(sx, sy, player.x, player.y) < 34;
                if (inZone || nearBolt) {
                  player.takeDamage(this.attackDamage * (nearBolt ? 1 : 0.5), this.scene.time.now);
                }
              }

              if (strikes >= 5) {
                strike.remove(false);
                this.fx.release(zone);
                this.untrackHeld(zone);
                this.busy = false;
              }
            },
          }),
        );
      }),
    );
  }

  untrackHeld(obj) {
    const i = this.heldFx.indexOf(obj);
    if (i >= 0) this.heldFx.splice(i, 1);
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

export function isWizardType(typeId) {
  return ['wizard', 'darkWizard', 'healWizard', 'lightningWizard'].includes(typeId);
}
