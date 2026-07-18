import Phaser from 'phaser';
import { getMoveSpeed, getMaxHp, SHIELD_DURATION_MS, SHIELD_COOLDOWN_MS, ARENA_SIZE } from '../data/constants.js';

const BOMB_PLACE_RANGE = 300;
const ARENA_MARGIN = 48;

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, playerState) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.playerState = playerState;
    this.hp = 100;
    this.maxHp = 100;
    this.setCollideWorldBounds(true);
    this.setCircle(16);
    this.setDepth(10);
    this.body.setSize(28, 28);

    this.weaponSprite = scene.add.image(0, 0, 'weapon_sword').setDepth(11);
    this.weaponSprite.setOrigin(0.35, 0.5);

    this.bombPreview = scene.add.image(0, 0, 'weapon_bomb').setDepth(11).setVisible(false);
    this.bombPreview.setAlpha(0.85);

    this.grenadePreview = scene.add.image(0, 0, 'weapon_grenade').setDepth(11).setVisible(false);
    this.grenadePreview.setAlpha(0.85);

    this.shieldSprite = scene.add.circle(0, 0, 28, 0x88ccff, 0.35).setDepth(12).setVisible(false);
    this.shieldSprite.setStrokeStyle(2, 0xaaddff);

    this.lastAttackTime = 0;
    this.shieldActive = false;
    this.shieldEndTime = 0;
    this.shieldCooldownEnd = 0;
    this.invulnerableUntil = 0;
    this.attackCooldownEnd = 0;
    this.aimAngle = 0;
    this.aimX = x;
    this.aimY = y;
    this.throwableInFlight = false;
    this.externalVx = 0;
    this.externalVy = 0;
  }

  syncStats() {
    this.maxHp = getMaxHp(this.playerState);
    if (this.hp > this.maxHp) this.hp = this.maxHp;
    if (this.hp < 0) this.hp = 0;
  }

  clampAimPoint(x, y, maxRange = BOMB_PLACE_RANGE) {
    const half = ARENA_SIZE / 2 - ARENA_MARGIN;
    let tx = Phaser.Math.Clamp(x, -half, half);
    let ty = Phaser.Math.Clamp(y, -half, half);
    const dist = Phaser.Math.Distance.Between(this.x, this.y, tx, ty);
    if (dist > maxRange) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, tx, ty);
      tx = this.x + Math.cos(angle) * maxRange;
      ty = this.y + Math.sin(angle) * maxRange;
    }
    return { x: tx, y: ty };
  }

  getAimPoint(pointer) {
    const worldPoint = pointer.positionToCamera(this.scene.cameras.main);
    const weapon = this.playerState.weapon;

    if (weapon?.id === 'bomb' || weapon?.id === 'grenade') {
      return this.clampAimPoint(worldPoint.x, worldPoint.y);
    }

    return { x: worldPoint.x, y: worldPoint.y };
  }

  canShowThrowablePreview(time) {
    const weapon = this.playerState.weapon;
    if (!weapon || (weapon.id !== 'bomb' && weapon.id !== 'grenade')) return false;
    if (this.throwableInFlight) return false;
    return this.canAttack(time);
  }

  updateWeaponVisuals(pointer, time) {
    const weapon = this.playerState.weapon;
    const aim = this.getAimPoint(pointer);
    this.aimX = aim.x;
    this.aimY = aim.y;
    this.aimAngle = Phaser.Math.Angle.Between(this.x, this.y, aim.x, aim.y);

    this.bombPreview.setVisible(false);
    this.grenadePreview.setVisible(false);
    this.weaponSprite.setVisible(false);

    if (!weapon) return;

    if (weapon.id === 'bomb') {
      if (this.canShowThrowablePreview(time)) {
        this.bombPreview.setPosition(aim.x, aim.y);
        this.bombPreview.setRotation(0);
        this.bombPreview.setAlpha(0.9);
        this.bombPreview.setVisible(true);
      }
      return;
    }

    if (weapon.id === 'grenade') {
      if (this.canShowThrowablePreview(time)) {
        this.grenadePreview.setPosition(aim.x, aim.y);
        this.grenadePreview.setRotation(0);
        this.grenadePreview.setAlpha(0.9);
        this.grenadePreview.setVisible(true);
      }
      return;
    }

    const textureKey = `weapon_${weapon.id}`;
    if (this.scene.textures.exists(textureKey)) {
      this.weaponSprite.setTexture(textureKey);
    }

    const holdOffset = weapon.type === 'melee' ? 22 : 18;
    this.weaponSprite.setPosition(
      this.x + Math.cos(this.aimAngle) * holdOffset,
      this.y + Math.sin(this.aimAngle) * holdOffset,
    );
    this.weaponSprite.setRotation(this.aimAngle);
    this.weaponSprite.setVisible(true);

    if (weapon.type === 'melee') {
      this.weaponSprite.setOrigin(0.25, 0.5);
    } else if (weapon.type === 'ranged') {
      this.weaponSprite.setOrigin(0.3, 0.5);
    } else {
      this.weaponSprite.setOrigin(0.5, 0.5);
    }
  }

  update(time, cursors, pointer) {
    this.syncStats();

    const speed = getMoveSpeed(this.playerState, time);
    let vx = 0;
    let vy = 0;

    if (cursors.W.isDown) vy -= 1;
    if (cursors.S.isDown) vy += 1;
    if (cursors.A.isDown) vx -= 1;
    if (cursors.D.isDown) vx += 1;

    if (vx !== 0 || vy !== 0) {
      const len = Math.hypot(vx, vy);
      vx = (vx / len) * speed;
      vy = (vy / len) * speed;
    }

    vx += this.externalVx || 0;
    vy += this.externalVy || 0;
    this.externalVx *= 0.72;
    this.externalVy *= 0.72;
    if (Math.abs(this.externalVx) < 2) this.externalVx = 0;
    if (Math.abs(this.externalVy) < 2) this.externalVy = 0;

    this.setVelocity(vx, vy);
    this.updateWeaponVisuals(pointer, time);

    if (this.shieldActive && time >= this.shieldEndTime) {
      this.shieldActive = false;
      this.shieldSprite.setVisible(false);
      if (this.playerState.aegisProtocol) {
        this.playerState.mirrorWardCharges = (this.playerState.mirrorWardCharges || 0) + 1;
      }
    }

    this.shieldSprite.setPosition(this.x, this.y);
    this.shieldSprite.setVisible(this.shieldActive);
  }

  canAttack(time) {
    if (!this.playerState.weapon) return false;
    let speedBonus = this.playerState.attackSpeedBonus || 0;
    if (this.playerState.adrenaline && this.maxHp > 0 && this.hp / this.maxHp < 0.4) {
      speedBonus += 0.3;
    }
    if (
      this.playerState.battleHymn &&
      this.playerState.battleHymnUntil &&
      time < this.playerState.battleHymnUntil
    ) {
      speedBonus += 0.25;
    }
    const cd = Math.max(
      80,
      this.playerState.weapon.cooldownMs / (1 + speedBonus) +
        (this.playerState.attackCooldownBonusMs || 0),
    );
    return time >= this.lastAttackTime + cd;
  }

  markAttack(time) {
    this.lastAttackTime = time;
  }

  activateShield(time) {
    if (time < this.shieldCooldownEnd || this.shieldActive) return false;
    const duration = SHIELD_DURATION_MS + (this.playerState.shieldDurationBonus || 0);
    const cooldown = Math.max(
      800,
      SHIELD_COOLDOWN_MS + (this.playerState.shieldCooldownBonusMs || 0),
    );
    this.shieldActive = true;
    this.shieldEndTime = time + duration;
    this.shieldCooldownEnd = time + cooldown;
    this.shieldSprite.setVisible(true);
    return true;
  }

  getShieldCooldownRemaining(time) {
    return Math.max(0, this.shieldCooldownEnd - time);
  }

  canUseAttackPowerup(time) {
    if (!this.playerState.attackPowerup) return false;
    return time >= this.attackCooldownEnd;
  }

  markAttackPowerupUsed(time, cooldownMs) {
    this.attackCooldownEnd = time + cooldownMs;
  }

  getAttackCooldownRemaining(time) {
    return Math.max(0, this.attackCooldownEnd - time);
  }

  takeDamage(amount, time) {
    if (this.hp <= 0) return false;
    if (this.shieldActive) return false;
    if (time < this.invulnerableUntil) return false;

    if ((this.playerState.mirrorWardCharges || 0) > 0) {
      this.playerState.mirrorWardCharges -= 1;
      this.invulnerableUntil = time + 200;
      this.setTint(0xaaddff);
      this.scene.time.delayedCall(120, () => this.clearTint());
      return false;
    }

    if (this.playerState.rampageCore) {
      this.playerState.rampageStacks = 0;
    }

    const scaled = Math.max(0, amount * this.playerState.damageTakenMultiplier);
    this.hp = Math.max(0, this.hp - scaled);

    if (this.hp <= 0 && this.playerState.secondWind && !this.playerState.secondWindUsed) {
      this.playerState.secondWindUsed = true;
      this.hp = this.playerState.immortalCore
        ? Math.max(1, Math.floor(this.maxHp * 0.4))
        : 1;
      this.invulnerableUntil = time + (this.playerState.immortalCore ? 2000 : 1500);
      this.setTint(0xffffff);
      this.scene.time.delayedCall(200, () => this.clearTint());
      return true;
    }

    this.invulnerableUntil = time + 500;
    this.setTint(0xff6666);
    this.scene.time.delayedCall(120, () => this.clearTint());
    return true;
  }

  heal(amount) {
    if (amount <= 0) return;
    this.hp = Math.min(this.maxHp, Math.max(0, this.hp) + amount);
  }

  isDead() {
    return this.hp <= 0;
  }

  respawn(x, y) {
    this.setPosition(x, y);
    this.hp = this.maxHp;
    this.shieldActive = false;
    this.shieldSprite.setVisible(false);
    this.throwableInFlight = false;
    this.setVelocity(0, 0);
  }

  destroy(fromScene) {
    this.weaponSprite?.destroy();
    this.bombPreview?.destroy();
    this.grenadePreview?.destroy();
    this.shieldSprite?.destroy();
    super.destroy(fromScene);
  }
}
