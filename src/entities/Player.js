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
    this.burnEndTime = 0;
    this.burnTickTime = 0;
    this.burnDamage = 0;
    this.chillUntil = 0;
    this.chillStrength = 1;
    this.freezeUntil = 0;
    this.iceCubeSprite = scene.add
      .rectangle(0, 0, 40, 44, 0xaaddff, 0.45)
      .setStrokeStyle(2, 0xffffff, 0.85)
      .setDepth(13)
      .setVisible(false);
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

    if (weapon?.id === 'bomb' || weapon?.id === 'grenade' || weapon?.id === 'molotov') {
      return this.clampAimPoint(worldPoint.x, worldPoint.y);
    }

    return { x: worldPoint.x, y: worldPoint.y };
  }

  canShowThrowablePreview(time) {
    const weapon = this.playerState.weapon;
    if (!weapon || (weapon.id !== 'bomb' && weapon.id !== 'grenade' && weapon.id !== 'molotov')) {
      return false;
    }
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

    if (weapon.id === 'grenade' || weapon.id === 'molotov') {
      if (this.canShowThrowablePreview(time)) {
        const key = weapon.id === 'molotov' ? 'weapon_molotov' : 'weapon_grenade';
        if (this.scene.textures.exists(key)) this.grenadePreview.setTexture(key);
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

    const holdOffset =
      weapon.id === 'spear' ? 34 : weapon.id === 'mace' ? 20 : weapon.type === 'melee' ? 22 : 18;
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

  applyBurn(time, damage = 4, ms = 2200) {
    this.burnEndTime = Math.max(this.burnEndTime || 0, time + ms);
    this.burnDamage = Math.max(this.burnDamage || 0, damage);
    if (!this.burnTickTime || this.burnTickTime < time) this.burnTickTime = time;
  }

  applyChill(time, ms = 1600, strength = 0.5) {
    this.chillUntil = Math.max(this.chillUntil || 0, time + ms);
    this.chillStrength = Math.min(this.chillStrength || 1, strength);
    this.setTint(0x88ccff);
  }

  applyFreeze(time, ms = 500) {
    this.freezeUntil = Math.max(this.freezeUntil || 0, time + ms);
    this.setTint(0xccf0ff);
    if (this.iceCubeSprite) {
      this.iceCubeSprite.setVisible(true);
      this.iceCubeSprite.setPosition(this.x, this.y);
    }
  }

  applyKnockback(angle, force = 400) {
    this.externalVx = (this.externalVx || 0) + Math.cos(angle) * force;
    this.externalVy = (this.externalVy || 0) + Math.sin(angle) * force;
  }

  tickBurn(time) {
    if (time >= this.burnEndTime) return;
    if (time < this.burnTickTime) return;
    this.burnTickTime = time + 500;
    if (this.hp <= 0 || this.shieldActive) return;
    const scaled = Math.max(0, this.burnDamage * (this.playerState.damageTakenMultiplier || 1));
    this.hp = Math.max(0, this.hp - scaled);
    if (scaled > 0) this.scene.events.emit('player-damaged', scaled);
    this.setTint(0xff5522);
    this.scene.time.delayedCall(80, () => {
      if (this.active && time < this.burnEndTime) this.setTint(0xff7744);
      else if (this.active) this.clearTint();
    });
    if (this.hp <= 0) {
      this.queueDeath();
    }
  }

  update(time, cursors, pointer) {
    this.syncStats();
    this.tickBurn(time);

    if (this.iceCubeSprite) {
      this.iceCubeSprite.setPosition(this.x, this.y);
      if (time >= this.freezeUntil) this.iceCubeSprite.setVisible(false);
    }

    const frozen = time < this.freezeUntil;
    if (frozen) {
      this.setVelocity(0, 0);
      this.externalVx = 0;
      this.externalVy = 0;
      this.updateWeaponVisuals(pointer, time);
    } else {
      let speed = getMoveSpeed(this.playerState, time);
      if (time < this.chillUntil) {
        speed *= this.chillStrength || 0.5;
        this.setTint(0x88ccff);
      } else if (this.chillStrength < 1) {
        this.chillStrength = 1;
        if (time >= this.burnEndTime) this.clearTint();
      }

      let vx = 0;
      let vy = 0;

      if (cursors?.W?.isDown) vy -= 1;
      if (cursors?.S?.isDown) vy += 1;
      if (cursors?.A?.isDown) vx -= 1;
      if (cursors?.D?.isDown) vx += 1;

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
    }

    // Guest shield visuals are snapshot-driven; host still ticks ally shield below via tickShield.
    const guestMp = this.scene.isMultiplayer && this.scene.mpRole === 'guest';
    if (!guestMp) this.tickShield(time);
    else {
      this.shieldSprite.setPosition(this.x, this.y);
      this.shieldSprite.setVisible(this.shieldActive);
    }
  }

  /** Expire shield when duration ends (host ally must call this — ally skips full update). */
  tickShield(time) {
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
    if (this.scene.gameState === 'game_over' || this.scene.gameState === 'respawn') return false;
    if (this.shieldActive) return false;
    if (time < this.invulnerableUntil) return false;

    if ((this.playerState.mirrorWardCharges || 0) > 0) {
      this.playerState.mirrorWardCharges -= 1;
      this.invulnerableUntil = time + 200;
      this.setTint(0xaaddff);
      this.scene.time.delayedCall(120, () => this.clearTint());
      return false;
    }

    if (this.playerState.bubbleWrap && this.playerState.bubbleWrapReady) {
      this.playerState.bubbleWrapReady = false;
      this.invulnerableUntil = time + 350;
      this.setTint(0xa8e6ff);
      this.scene.fx?.flash(this.x, this.y, 16, 0xa8e6ff, 220, 48);
      this.scene.time.delayedCall(160, () => this.clearTint());
      return false;
    }

    if (this.playerState.rampageCore) {
      this.playerState.rampageStacks = 0;
    }

    const scaled = Math.max(0, amount * this.playerState.damageTakenMultiplier);
    if (scaled > 0) {
      this.scene.events.emit('player-damaged', scaled);
    }

    if (this.scene.isMultiplayer && typeof this.scene.sharedHp === 'number') {
      this.scene.sharedHp = Math.max(0, this.scene.sharedHp - scaled);
      this.scene.syncSharedHpToPlayers?.();
      if (this.scene.sharedHp <= 0 && this.playerState.secondWind && !this.playerState.secondWindUsed) {
        this.playerState.secondWindUsed = true;
        this.scene.sharedHp = this.playerState.immortalCore
          ? Math.max(1, Math.floor(this.scene.sharedMaxHp * 0.4))
          : 1;
        this.scene.syncSharedHpToPlayers?.();
        this.invulnerableUntil = time + (this.playerState.immortalCore ? 2000 : 1500);
        this.setTint(0xffffff);
        this.scene.time.delayedCall(200, () => this.clearTint());
        return true;
      }
      this.invulnerableUntil = time + 500;
      this.setTint(0xff6666);
      this.scene.time.delayedCall(120, () => this.clearTint());
      if (this.scene.sharedHp <= 0) {
        this.queueDeath();
      }
      return true;
    }

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

    if (this.hp <= 0) {
      this.queueDeath();
    }
    return true;
  }

  /**
   * Never run death/VFX cleanup inside an enemy attack timer or physics callback —
   * that freezes Phaser (timer removed / enemy destroyed mid-callback).
   */
  queueDeath() {
    if (this._deathQueued) return;
    this._deathQueued = true;
    this.scene.time.delayedCall(0, () => {
      this._deathQueued = false;
      if (this.scene.gameState === 'game_over' || this.scene.gameState === 'respawn') return;
      this.scene.events.emit('player-died');
    });
  }

  heal(amount) {
    if (amount <= 0) return;
    if (this.scene.isMultiplayer && typeof this.scene.sharedHp === 'number') {
      const max = this.scene.sharedMaxHp || this.maxHp;
      this.scene.sharedHp = Math.min(max, Math.max(0, this.scene.sharedHp) + amount);
      this.scene.syncSharedHpToPlayers?.();
      return;
    }
    this.hp = Math.min(this.maxHp, Math.max(0, this.hp) + amount);
  }

  isDead() {
    if (this.scene.isMultiplayer && typeof this.scene.sharedHp === 'number') {
      return this.scene.sharedHp <= 0;
    }
    return this.hp <= 0;
  }

  respawn(x, y) {
    this.setPosition(x, y);
    if (this.scene.isMultiplayer && typeof this.scene.sharedMaxHp === 'number') {
      this.scene.sharedHp = this.scene.sharedMaxHp;
      this.scene.syncSharedHpToPlayers?.();
    } else {
      this.hp = this.maxHp;
    }
    this.shieldActive = false;
    this.shieldSprite.setVisible(false);
    this.throwableInFlight = false;
    this.setVelocity(0, 0);
    this.externalVx = 0;
    this.externalVy = 0;
    this.chillUntil = 0;
    this.chillStrength = 1;
    this.freezeUntil = 0;
    this.iceCubeSprite?.setVisible(false);
    this.clearTint();
  }

  destroy(fromScene) {
    this.weaponSprite?.destroy();
    this.bombPreview?.destroy();
    this.grenadePreview?.destroy();
    this.shieldSprite?.destroy();
    this.iceCubeSprite?.destroy();
    super.destroy(fromScene);
  }
}
