import Phaser from 'phaser';
import { getEnemyData, getScaledEnemyHp, getScaledBossHp } from '../data/enemies.js';
import { ARENA_SIZE } from '../data/constants.js';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {string} typeId
   * @param {number} wave
   */
  constructor(scene, x, y, typeId, wave) {
    const data = getEnemyData(typeId);
    super(scene, x, y, `enemy_${typeId}`);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.enemyData = data;
    this.typeId = typeId;
    this.wave = wave;
    this.maxHp = data.isBoss
      ? getScaledBossHp(data.hp, wave, typeId)
      : getScaledEnemyHp(data.hp, wave);
    this.hp = this.maxHp;
    this.contactDamage = data.contactDamage;
    this.xpValue = data.xp;
    this.instantKill = data.instantKill;
    this.chaseSpeed = data.speed;

    this.setCircle(data.radius);
    this.setDepth(5);
    this.body.setSize(data.radius * 2, data.radius * 2);
    this.setCollideWorldBounds(true);

    this.poisonEndTime = 0;
    this.poisonTickTime = 0;
    this.burnEndTime = 0;
    this.burnTickTime = 0;
    this.burnDamage = 0;
    this.slowMultiplier = 1;
    this.slowEndTime = 0;
    this.isDying = false;

    this.showHpBar = false;
    this.hpBarBg = scene.add.rectangle(x, y - 28, 34, 5, 0x222222, 0.85).setDepth(20).setVisible(false);
    this.hpBarFill = scene.add.rectangle(x, y - 28, 32, 3, 0x44cc66, 1).setDepth(21).setVisible(false);
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
    } else if (time >= this.slowEndTime) {
      this.clearTint();
    }

    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    if (time < (this.sandStunUntil || 0)) {
      this.setVelocity(0, 0);
      this.setTint(0xd4b483);
      this.updateHpBar();
      this.clampToArena();
      return;
    }
    const speed = this.chaseSpeed * this.slowMultiplier;
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    this.updateHpBar();
    this.clampToArena();
  }

  /** Keep this enemy inside the arena so kiters cannot walk off the map. */
  clampToArena() {
    if (!this.active || this.isDying) return;
    const r = this.enemyData?.radius || 16;
    const half = ARENA_SIZE / 2 - r;
    const nx = Phaser.Math.Clamp(this.x, -half, half);
    const ny = Phaser.Math.Clamp(this.y, -half, half);
    if (nx === this.x && ny === this.y) return;

    this.setPosition(nx, ny);
    if (this.body) {
      if ((nx <= -half && this.body.velocity.x < 0) || (nx >= half && this.body.velocity.x > 0)) {
        this.body.velocity.x = 0;
      }
      if ((ny <= -half && this.body.velocity.y < 0) || (ny >= half && this.body.velocity.y > 0)) {
        this.body.velocity.y = 0;
      }
    }
  }

  updateHpBar() {
    if (!this.hpBarBg || !this.hpBarFill) return;
    const visible = this.showHpBar && this.active && !this.isDying;
    this.hpBarBg.setVisible(visible);
    this.hpBarFill.setVisible(visible);
    if (!visible) return;

    const offsetY = (this.enemyData?.radius || 18) + 14;
    const barW = Math.max(28, (this.enemyData?.radius || 18) * 1.6);
    this.hpBarBg.setPosition(this.x, this.y - offsetY);
    this.hpBarBg.width = barW + 2;
    this.hpBarFill.setPosition(this.x, this.y - offsetY);
    const ratio = Math.max(0, this.hp / this.maxHp);
    this.hpBarFill.width = barW * ratio;
    this.hpBarFill.setFillStyle(ratio > 0.5 ? 0x44cc66 : ratio > 0.25 ? 0xcccc44 : 0xcc4444);
  }

  /**
   * @param {number} damage
   * @param {boolean} [ignoreInstantKill]
   */
  takeDamage(damage, ignoreInstantKill = false) {
    if (this.isDying) return false;

    if (this.instantKill && !ignoreInstantKill) {
      this.hp = 0;
      this.showHpBar = true;
      this.updateHpBar();
      return true;
    }

    this.hp -= damage;
    this.showHpBar = true;
    this.updateHpBar();
    this.setTint(0xffffff);
    this.scene.time.delayedCall(60, () => {
      if (this.active) this.clearTint();
    });
    return this.hp <= 0;
  }

  applyPoison(time, bonusDamage = 0, bonusMs = 0) {
    this.poisonEndTime = time + 3000 + bonusMs;
    this.poisonTickTime = time;
    this.poisonDamage = 3 + bonusDamage;
  }

  applyBurn(time, damage = 4, ms = 2500) {
    this.burnEndTime = time + ms;
    this.burnTickTime = time;
    this.burnDamage = damage;
  }

  applySlow(time, bonusMs = 0, multiplier = 0.5) {
    this.slowEndTime = time + 1500 + bonusMs;
    this.slowStrength = multiplier;
  }

  markDying() {
    this.isDying = true;
    this.setVelocity(0, 0);
    this.body.enable = false;
    if (this.hpBarBg) {
      this.hpBarBg.destroy();
      this.hpBarBg = null;
    }
    if (this.hpBarFill) {
      this.hpBarFill.destroy();
      this.hpBarFill = null;
    }
  }

  destroy(fromScene) {
    if (this.hpBarBg) {
      this.hpBarBg.destroy();
      this.hpBarBg = null;
    }
    if (this.hpBarFill) {
      this.hpBarFill.destroy();
      this.hpBarFill = null;
    }
    super.destroy(fromScene);
  }
}
