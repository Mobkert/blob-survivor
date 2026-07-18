import { getDamageMultiplier } from '../data/constants.js';
import { Projectile } from '../entities/Projectile.js';
import { XpOrb } from '../entities/XpOrb.js';
import { CoinOrb } from '../entities/CoinOrb.js';
import { Powerups, getPowerup } from '../data/powerups.js';
import { rollEnemyCoinsForWave, getCoinReductionSteps } from '../data/enemies.js';
import { addCoins, isUnlocked, unlockShopItem } from '../data/meta.js';
import { ShopItems } from '../data/shop.js';
import { CardPickup } from '../entities/CardPickup.js';
import { broadcastMeleeArc, grantCoopCoins, registerCoopVfx, unregisterCoopVfx } from './CoopNet.js';

const MAX_EXPLOSION_DEPTH = 2;

export class CombatSystem {
  /**
   * @param {object} [options]
   * @param {CombatSystem} [options.shareWith] — ally combat reuses host orb groups
   */
  constructor(scene, player, waveManager, playerState, options = {}) {
    this.scene = scene;
    this.player = player;
    this.waveManager = waveManager;
    this.playerState = playerState;
    this.fortuneBusy = false;
    this.activeToxicClouds = 0;
    this.lastToxicCloudSpawn = 0;
    this.activePhantoms = 0;
    this.lastChronoPulse = 0;
    this.lastFrostAuraTick = 0;
    this.activePhoenixPlumes = 0;
    this.lastEmberTrail = 0;
    this.lastOrbitalStrike = 0;
    this.lastMagmaPulse = 0;
    this.activeScorchedPools = 0;
    this.lastCrowPeck = 0;
    this.isAllyCombat = !!options.shareWith;

    this.projectiles = scene.add.group();

    if (options.shareWith) {
      this.xpOrbs = options.shareWith.xpOrbs;
      this.coinOrbs = options.shareWith.coinOrbs;
      this.cardPickups = options.shareWith.cardPickups;
    } else {
      this.xpOrbs = scene.add.group();
      this.coinOrbs = scene.add.group();
      this.cardPickups = scene.add.group();
    }

    scene.physics.add.overlap(
      player,
      this.cardPickups,
      (p, card) => this.collectCardPickup(card),
      null,
      this,
    );

    scene.physics.add.overlap(
      player,
      waveManager.enemies,
      (p, enemy) => this.handlePlayerEnemyContact(enemy),
      null,
      this,
    );

    scene.physics.add.overlap(
      this.projectiles,
      waveManager.enemies,
      (proj, enemy) => this.handleProjectileHit(proj, enemy),
      null,
      this,
    );

    scene.physics.add.overlap(
      player,
      this.xpOrbs,
      (p, orb) => this.collectXp(orb),
      null,
      this,
    );

    scene.physics.add.overlap(
      player,
      this.coinOrbs,
      (p, orb) => this.collectCoin(orb),
      null,
      this,
    );
  }

  handlePlayerEnemyContact(enemy) {
    if (!enemy.active || enemy.isDying) return;
    if (this.player.isDead()) return;
    const time = this.scene.time.now;

    if (this.player.shieldActive && this.playerState.shieldThorns > 0) {
      if (!enemy._lastThornHit || time - enemy._lastThornHit > 300) {
        enemy._lastThornHit = time;
        this.hitEnemy(enemy, this.playerState.shieldThorns);
      }
    }

    if ((this.playerState.thornMail || 0) > 0) {
      if (!enemy._lastMailHit || time - enemy._lastMailHit > 350) {
        enemy._lastMailHit = time;
        this.hitEnemy(enemy, this.playerState.thornMail, { fromCloud: true });
      }
    }

    this.player.takeDamage(enemy.contactDamage, time);

    if (enemy.enemyData?.appliesBurn) {
      this.player.applyBurn(
        time,
        enemy.enemyData.burnDamage || 4,
        enemy.enemyData.burnMs || 2200,
      );
    }

    if (this.playerState.obsidianSkin && (!enemy._lastObsidianHit || time - enemy._lastObsidianHit > 350)) {
      enemy._lastObsidianHit = time;
      this.hitEnemy(enemy, 8, { fromCloud: true });
      enemy.applyBurn?.(time, 5, 2000);
      this.scene.fx?.burst(enemy.x, enemy.y, {
        count: 4,
        color: 0xff5522,
        speed: 70,
        life: 160,
        size: 3,
      });
    }

    if (this.player.isDead()) {
      this.scene.events.emit('player-died');
    }
  }

  /** Triggered when the player successfully activates RMB shield. */
  onShieldActivate() {
    const effects = this.playerState.shieldEffects || [];
    const px = this.player.x;
    const py = this.player.y;

    if (this.playerState.shieldHeal > 0) {
      this.player.heal(this.playerState.shieldHeal);
    }
    if (this.playerState.shieldCoins > 0) {
      const coins = this.scene.isMultiplayer
        ? Math.floor(this.playerState.shieldCoins / 2)
        : this.playerState.shieldCoins;
      if (coins > 0) {
        if (this.scene.isMultiplayer) grantCoopCoins(this.scene, coins);
        else {
          addCoins(coins);
          this.scene.events.emit('coins-collected', coins);
        }
      }
    }

    if (effects.includes('iceExplosion')) {
      this.shieldBlast(px, py, {
        radius: 110,
        damage: 28,
        color: 0x88eeff,
        freeze: true,
      });
    }
    if (effects.includes('fireNova')) {
      this.shieldBlast(px, py, {
        radius: 100,
        damage: 32,
        color: 0xff6622,
      });
    }
    if (effects.includes('knockbackBurst')) {
      this.shieldKnockback(px, py, 160, 180);
    }
    if (effects.includes('stormShield')) {
      this.shieldLightning(px, py, 3, 40);
    }
    if (effects.includes('frostArmor')) {
      this.waveManager.enemies.getChildren().forEach((enemy) => {
        if (!enemy.active || enemy.isDying) return;
        const dist = Phaser.Math.Distance.Between(px, py, enemy.x, enemy.y);
        if (dist < 140) enemy.applySlow(this.scene.time.now, 800, 0.4);
      });
    }
    if (effects.includes('mirrorWard') || this.playerState.mirrorWard) {
      this.playerState.mirrorWardCharges = (this.playerState.mirrorWardCharges || 0) + 1;
      this.scene.fx?.flash(px, py, 14, 0xaaddff, 220, 40);
    }
    if (effects.includes('voidWalker') || this.playerState.voidWalker) {
      this.voidWalkerBlink();
    }

    if (this.playerState.shieldBash) {
      this.doShieldBash(px, py);
    }
  }

  doShieldBash(px, py) {
    const radius = 95;
    this.scene.fx?.flash(px, py, 14, 0x88aadd, 180, 50);
    this.waveManager.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active || enemy.isDying) return;
      const dist = Phaser.Math.Distance.Between(px, py, enemy.x, enemy.y);
      if (dist > radius + (enemy.enemyData?.radius || 14)) return;
      const ang = Phaser.Math.Angle.Between(px, py, enemy.x, enemy.y);
      enemy.x += Math.cos(ang) * 42;
      enemy.y += Math.sin(ang) * 42;
      this.hitEnemy(enemy, 12, { fromCloud: true });
    });
  }

  voidWalkerBlink() {
    const aim = this.player.getAimPoint(this.scene.input.activePointer);
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, aim.x, aim.y);
    const dashDist = 150;
    const startX = this.player.x;
    const startY = this.player.y;
    const endX = startX + Math.cos(angle) * dashDist;
    const endY = startY + Math.sin(angle) * dashDist;

    const trail = this.scene.add.graphics().setDepth(11);
    trail.lineStyle(4, 0x7744cc, 0.75);
    trail.lineBetween(startX, startY, endX, endY);
    this.scene.tweens.add({
      targets: trail,
      alpha: 0,
      duration: 220,
      onComplete: () => trail.destroy(),
    });

    this.player.x = endX;
    this.player.y = endY;
    this.player.invulnerableUntil = this.scene.time.now + 450;
    this.player.setAlpha(0.5);
    this.scene.time.delayedCall(450, () => {
      if (this.player.active) this.player.setAlpha(1);
    });

    this.waveManager.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active || enemy.isDying) return;
      const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, startX, startY);
      const distEnd = Phaser.Math.Distance.Between(enemy.x, enemy.y, endX, endY);
      // Rough segment proximity: near start, end, or midpoint.
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      const distMid = Phaser.Math.Distance.Between(enemy.x, enemy.y, midX, midY);
      if (Math.min(dist, distEnd, distMid) < 36 + (enemy.enemyData?.radius || 14)) {
        this.hitEnemy(enemy, 36);
      }
    });
  }

  shieldBlast(x, y, { radius, damage, color, freeze = false }) {
    const ring = this.scene.add.circle(x, y, 12, color, 0.55).setDepth(12);
    this.scene.tweens.add({
      targets: ring,
      radius,
      alpha: 0,
      duration: 280,
      onComplete: () => ring.destroy(),
    });

    this.waveManager.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active || enemy.isDying) return;
      const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (dist > radius + enemy.enemyData.radius) return;
      if (freeze) enemy.applySlow(this.scene.time.now, 1800, 0.25);
      this.hitEnemy(enemy, damage);
    });
  }

  shieldKnockback(x, y, radius, force) {
    const ring = this.scene.add.circle(x, y, 10, 0xaaccff, 0.4).setDepth(12);
    this.scene.tweens.add({
      targets: ring,
      radius,
      alpha: 0,
      duration: 220,
      onComplete: () => ring.destroy(),
    });

    this.waveManager.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active || enemy.isDying) return;
      const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (dist > radius + enemy.enemyData.radius) return;
      const angle = Phaser.Math.Angle.Between(x, y, enemy.x, enemy.y);
      enemy.x += Math.cos(angle) * force;
      enemy.y += Math.sin(angle) * force;
      this.hitEnemy(enemy, 10);
    });
  }

  shieldLightning(x, y, count, damage) {
    const enemies = this.waveManager.enemies.getChildren()
      .filter((e) => e.active && !e.isDying)
      .map((e) => ({ e, d: Phaser.Math.Distance.Between(x, y, e.x, e.y) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, count);

    enemies.forEach(({ e }) => {
      const line = this.scene.add.graphics().setDepth(12);
      line.lineStyle(3, 0x8866ff, 0.9);
      line.lineBetween(x, y, e.x, e.y);
      this.scene.time.delayedCall(120, () => line.destroy());
      this.hitEnemy(e, damage);
    });
  }

  handleProjectileHit(projectile, enemy) {
    if (!projectile.active || !enemy.active || enemy.isDying) return;
    // Overlap fires every physics step — only apply damage once per enemy.
    if (projectile.hitIds?.has(enemy)) return;
    const killed = this.hitEnemy(enemy, projectile.damage);
    if (killed && this.playerState.killBounce) {
      projectile.bouncesLeft = Math.max(projectile.bouncesLeft || 0, 1);
      projectile.damage *= 1.2;
    }
    const destroyed = projectile.onHitEnemy(enemy);
    if (!destroyed && projectile.bouncesLeft > 0) {
      this.bounceProjectile(projectile, enemy);
    }
  }

  bounceProjectile(projectile, fromEnemy) {
    projectile.bouncesLeft -= 1;
    let nearest = null;
    let nearestDist = 280;
    this.waveManager.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active || enemy.isDying || enemy === fromEnemy) return;
      if (projectile.hitIds.has(enemy)) return;
      const dist = Phaser.Math.Distance.Between(projectile.x, projectile.y, enemy.x, enemy.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = enemy;
      }
    });
    if (!nearest) {
      projectile.destroy();
      return;
    }
    const angle = Phaser.Math.Angle.Between(projectile.x, projectile.y, nearest.x, nearest.y);
    const speed = Math.hypot(projectile.body.velocity.x, projectile.body.velocity.y) || 500;
    projectile.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    projectile.rotation = angle;
  }

  hasExplosiveHits() {
    return this.playerState.blastRadiusBonus > 0;
  }

  explosionRadius(base = 50) {
    return base * (1 + this.playerState.blastRadiusBonus);
  }

  /** Any weapon hit — applies damage, optional on-hit explosion, kill rewards. */
  hitEnemy(enemy, baseDamage, options = {}) {
    if (!enemy.active || enemy.isDying) return false;

    const flat = this.playerState.fortuneFlat || 0;
    let damage = baseDamage * getDamageMultiplier(this.playerState) + flat;
    if (this.playerState.overclock && !options.fromCloud) {
      this.playerState.overclockHits = (this.playerState.overclockHits || 0) + 1;
      if (this.playerState.overclockHits >= 6) {
        this.playerState.overclockHits = 0;
        damage *= 2;
        this.scene.fx?.flash(enemy.x, enemy.y, 12, 0xff66aa, 160, 30);
      }
    }
    if (this.playerState.bloodPact && !options.fromCloud) {
      damage *= 1.45;
    }
    if (this.playerState.executioner && enemy.maxHp > 0 && enemy.hp / enemy.maxHp < 0.3) {
      damage *= 1.5;
    }
    if (this.playerState.hunterMark && !enemy._hunterHit) {
      damage *= 1.3;
      enemy._hunterHit = true;
    }
    if (this.playerState.hexMark && enemy.hexMarked) {
      damage *= 1.6;
      enemy.hexMarked = false;
      this.scene.fx?.flash(enemy.x, enemy.y, 10, 0xff66aa, 180, 28);
    }
    if (this.playerState.critChance > 0 && Math.random() < this.playerState.critChance) {
      damage *= 2;
      enemy.setTint(0xffff66);
    }

    // Melee / big zombie perk: instant kill without changing weapon damage stats.
    if (
      enemy.typeId === 'zombie' &&
      !options.fromCloud &&
      (options.fromMelee || options.fromBig || options.zombiePerk)
    ) {
      damage = Math.max(damage, enemy.hp);
    }

    this.applyStatusEffects(enemy);
    if (this.playerState.pocketSand && !options.fromCloud && Math.random() < 0.3) {
      enemy.sandStunUntil = this.scene.time.now + 700;
      enemy.applySlow?.(this.scene.time.now, 700, 0.2);
      this.scene.fx?.burst(enemy.x, enemy.y, {
        count: 4,
        color: 0xd4b483,
        speed: 55,
        life: 180,
        size: 2.5,
      });
    }
    const killed = enemy.takeDamage(damage);

    if (this.playerState.hexMark && !killed) {
      enemy.hexMarked = true;
      enemy.setTint(0xff66aa);
    }

    if (this.playerState.lifesteal > 0 && damage > 0) {
      this.player.heal(damage * this.playerState.lifesteal);
    }

    if (this.playerState.piercingGale && !options.fromCloud && !killed) {
      const ang = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      enemy.x += Math.cos(ang) * 18;
      enemy.y += Math.sin(ang) * 18;
    }

    if (killed) {
      enemy.markDying();
      this.grantKillRewards(enemy, options);
    }

    // Cloud ticks must not cascade into explosions (lag / freeze).
    if (!options.fromCloud && this.hasExplosiveHits()) {
      this.createExplosion(enemy.x, enemy.y, damage, 0);
    }

    if (!options.fromCloud && (this.playerState.toxicCloud || 0) > 0) {
      this.spawnToxicCloud(enemy.x, enemy.y);
    }

    return killed;
  }

  applyStatusEffects(enemy) {
    if (this.playerState.poison) {
      enemy.applyPoison(this.scene.time.now, this.playerState.poisonBonus || 0);
    }
    if (this.playerState.slowOnHit) {
      enemy.applySlow(this.scene.time.now, this.playerState.slowBonusMs || 0);
    }
    if (this.playerState.magmaCore) {
      enemy.applyBurn?.(this.scene.time.now, 5, 2600);
      this.scene.fx?.burst(enemy.x, enemy.y, {
        count: 3,
        color: 0xff6622,
        speed: 50,
        life: 140,
        size: 2,
      });
    }
  }

  spawnToxicCloud(x, y) {
    const now = this.scene.time.now;
    if (now - this.lastToxicCloudSpawn < 400) return;
    if (this.activeToxicClouds >= 3) return;
    this.lastToxicCloudSpawn = now;
    this.activeToxicClouds += 1;

    const fx = this.scene.fx;
    const stacks = Math.max(1, this.playerState.toxicCloud || 1);
    const radius = 52 + (stacks - 1) * 28;
    const duration = 2200 + (stacks - 1) * 400;
    const tickDamage = 3 + stacks * 2;
    const vfxId = registerCoopVfx(this.scene, { kind: 'toxic', x, y, r: radius });

    const blobs = [];
    const blobCount = Math.min(4, 2 + stacks);
    for (let i = 0; i < blobCount; i++) {
      const ang = (Math.PI * 2 * i) / blobCount;
      const dist = radius * 0.2;
      const blob = fx?.hold(
        x + Math.cos(ang) * dist,
        y + Math.sin(ang) * dist,
        radius * 0.5,
        0x66dd22,
        0.28,
        7,
      );
      if (blob) {
        blob.setStrokeStyle(2, 0xaaff55, 0.35);
        blobs.push(blob);
      }
    }
    const core = fx?.hold(x, y, radius * 0.55, 0x44aa11, 0.2, 6);

    let life = duration;
    const cloudHitCooldown = new WeakMap();

    const cleanup = () => {
      this.activeToxicClouds = Math.max(0, this.activeToxicClouds - 1);
      blobs.forEach((b) => fx?.release(b));
      fx?.release(core);
      unregisterCoopVfx(this.scene, vfxId);
    };

    const tick = this.scene.time.addEvent({
      delay: 300,
      loop: true,
      callback: () => {
        life -= 300;
        if (fx) {
          fx.burst(x + (Math.random() - 0.5) * radius, y, {
            count: 2,
            color: 0x88ff44,
            speed: 35,
            life: 320,
            size: 4,
          });
        }

        const tnow = this.scene.time.now;
        this.waveManager.enemies.getChildren().forEach((enemy) => {
          if (!enemy.active || enemy.isDying) return;
          const d = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
          if (d > radius + (enemy.enemyData?.radius || 14)) return;
          const last = cloudHitCooldown.get(enemy) || 0;
          if (tnow - last < 280) return;
          cloudHitCooldown.set(enemy, tnow);
          enemy.setTint(0x88ff44);
          this.hitEnemy(enemy, tickDamage, { fromCloud: true });
        });

        if (life <= 0) {
          tick.remove(false);
          cleanup();
        }
      },
    });
  }

  grantKillRewards(enemy, options = {}) {
    if (enemy._rewarded) return;
    enemy._rewarded = true;

    const xpValue = enemy.xpValue + (this.playerState.bonusXp || 0);
    const orb = new XpOrb(this.scene, enemy.x, enemy.y, xpValue);
    this.xpOrbs.add(orb);

    const wave = enemy.wave || this.waveManager.currentWave || 1;
    let coins = rollEnemyCoinsForWave(enemy.enemyData, wave);
    if (getCoinReductionSteps(wave) >= 5) {
      coins = 3;
    } else {
      coins = Math.max(1, Math.floor(coins * (this.playerState.coinMultiplier || 1)));
    }
    if (this.playerState.luckyStar && Math.random() < 0.15) {
      coins *= 2;
    }
    const coin = new CoinOrb(this.scene, enemy.x + 10, enemy.y - 8, coins);
    this.coinOrbs.add(coin);

    if (this.playerState.healOnKill > 0) {
      this.player.heal(this.playerState.healOnKill);
    }

    if (this.playerState.bloodlust) {
      this.playerState.bloodlustUntil = this.scene.time.now + 2000;
    }

    if (this.playerState.battleHymn) {
      this.playerState.battleHymnUntil = this.scene.time.now + 1500;
    }

    if (this.playerState.rampageCore) {
      this.playerState.rampageStacks = Math.min(10, (this.playerState.rampageStacks || 0) + 1);
    }

    if (this.playerState.soulHarvest) {
      this.spawnSoulHarvest(enemy.x, enemy.y);
    }
    if (this.playerState.phoenixPlume) {
      this.spawnPhoenixPlume(enemy.x, enemy.y);
    }

    if (this.playerState.lootPinata && Math.random() < 0.25) {
      const bonus = 2 + Math.floor(Math.random() * 3);
      const coin = new CoinOrb(this.scene, enemy.x + (Math.random() - 0.5) * 24, enemy.y - 6, bonus);
      this.coinOrbs.add(coin);
      this.scene.fx?.burst(enemy.x, enemy.y, {
        count: 5,
        color: 0xffcc66,
        speed: 80,
        life: 220,
        size: 3,
      });
    }

    if (this.playerState.splinter) {
      this.fireSplinterShard(enemy.x, enemy.y);
    }

    if (this.playerState.scorchedGround) {
      this.spawnScorchedGround(enemy.x, enemy.y);
    }

    if (this.playerState.cinderRing) {
      this.spawnCinderRing(enemy.x, enemy.y);
    }

    if (this.playerState.shatter && options.fromMelee) {
      this.createExplosion(enemy.x, enemy.y, 18, 0, 42, {
        skipAirstrike: true,
        color: 0xaaccff,
      });
    }

    if (enemy.enemyData?.isBoss || enemy.typeId === 'goblinKing' || enemy.typeId === 'kingMagmaCube') {
      this.tryDropTankCard(enemy.x, enemy.y);
    }

    this.scene.tweens.add({
      targets: enemy,
      alpha: 0,
      scale: 0.2,
      duration: 180,
      onComplete: () => enemy.destroy(),
    });

    this.scene.events.emit('enemy-killed', enemy);
  }

  tryDropTankCard(x, y) {
    if (isUnlocked('tank')) return;
    if (Math.random() >= 0.05) return;
    const drop = new CardPickup(this.scene, x, y, 'tank');
    this.cardPickups.add(drop);
    this.scene.events.emit('boss-message', 'A rare Tank card dropped!');
  }

  collectCardPickup(pickup) {
    if (!pickup?.active) return;
    const cardId = pickup.cardId;
    const item = ShopItems[cardId];
    if (!item) {
      pickup.destroy();
      return;
    }

    if (isUnlocked(cardId)) {
      pickup.destroy();
      return;
    }

    unlockShopItem(cardId);
    if (typeof item.apply === 'function') {
      item.apply(this.playerState);
    }
    if (!this.playerState.runPowerups) this.playerState.runPowerups = [];
    this.playerState.runPowerups.push(cardId);
    this.player.syncStats();
    // Grant the new max HP immediately so Tank feels rewarding on pickup.
    if (cardId === 'tank') {
      this.player.heal(125);
    }

    pickup.destroy();
    this.scene.events.emit('hud-update');
    this.scene.events.emit('boss-message', `${item.name} added to your deck!`);
  }

  spawnSoulHarvest(x, y) {
    const fx = this.scene.fx;
    const soul = fx?.hold(x, y, 10, 0xcc88ff, 0.75, 12);
    if (soul) {
      soul.setStrokeStyle(2, 0xffffff, 0.45);
      this.scene.tweens.add({
        targets: soul,
        y: y - 22,
        alpha: 0.35,
        duration: 500,
        onComplete: () => {
          fx.release(soul);
          this.createExplosion(x, y - 10, 28, 0, 58, {
            skipAirstrike: true,
            color: 0xcc88ff,
          });
        },
      });
      return;
    }
    this.scene.time.delayedCall(500, () => {
      this.createExplosion(x, y - 10, 28, 0, 58, {
        skipAirstrike: true,
        color: 0xcc88ff,
      });
    });
  }

  spawnPhoenixPlume(x, y) {
    if (this.activePhoenixPlumes >= 4) return;
    this.activePhoenixPlumes += 1;
    const fx = this.scene.fx;
    const radius = 48;
    const core = fx?.hold(x, y, radius * 0.7, 0xff5522, 0.35, 7);
    const ring = fx?.hold(x, y, radius, 0xffaa44, 0.18, 6);
    let life = 1600;
    const hitCd = new WeakMap();

    const cleanup = () => {
      this.activePhoenixPlumes = Math.max(0, this.activePhoenixPlumes - 1);
      fx?.release(core);
      fx?.release(ring);
    };

    const tick = this.scene.time.addEvent({
      delay: 280,
      loop: true,
      callback: () => {
        life -= 280;
        fx?.burst(x + (Math.random() - 0.5) * radius, y, {
          count: 2,
          color: 0xff8844,
          speed: 40,
          life: 280,
          size: 4,
        });
        const now = this.scene.time.now;
        this.waveManager.enemies.getChildren().forEach((enemy) => {
          if (!enemy.active || enemy.isDying) return;
          const d = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
          if (d > radius + (enemy.enemyData?.radius || 14)) return;
          const last = hitCd.get(enemy) || 0;
          if (now - last < 260) return;
          hitCd.set(enemy, now);
          enemy.setTint(0xff6622);
          this.hitEnemy(enemy, 8, { fromCloud: true });
        });
        if (life <= 0) {
          tick.remove(false);
          cleanup();
        }
      },
    });
  }

  /**
   * Explosion at a point — damages nearby foes. Chain Reaction chains on kills only.
   */
  createExplosion(x, y, hitDamage, depth, baseRadius = 50, options = {}) {
    if (depth > MAX_EXPLOSION_DEPTH) return;

    const radius = this.explosionRadius(baseRadius);
    const splashDamage = Math.max(10, hitDamage * 0.45);

    this.showExplosionVisual(x, y, radius, options.color);

    const chainKills = [];

    this.waveManager.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active || enemy.isDying) return;
      const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (dist > radius + enemy.enemyData.radius) return;

      this.applyStatusEffects(enemy);
      let dealt = splashDamage;
      if (options.zombiePerk && enemy.typeId === 'zombie') {
        dealt = Math.max(dealt, enemy.hp);
      }
      if (enemy.takeDamage(dealt)) {
        enemy.markDying();
        chainKills.push(enemy);
      }
    });

    chainKills.forEach((enemy) => {
      this.grantKillRewards(enemy);
      if (this.playerState.chainReaction && depth < MAX_EXPLOSION_DEPTH) {
        this.scene.time.delayedCall(60, () => {
          if (enemy.active) {
            this.createExplosion(enemy.x, enemy.y, splashDamage, depth + 1, baseRadius * 0.7, {
              skipAirstrike: true,
            });
          }
        });
      }
    });
  }

  showExplosionVisual(x, y, radius, color = 0xff8844) {
    if (this.scene.fx) {
      this.scene.fx.flash(x, y, 10, color ?? 0xff8844, 200, Math.max(20, radius * 0.85));
      this.scene.fx.burst(x, y, { count: 5, color: color ?? 0xff8844, speed: 100, life: 200, size: 3 });
      return;
    }
    const ring = this.scene.add.circle(x, y, 10, color, 0.55).setDepth(9);
    this.scene.tweens.add({
      targets: ring,
      radius,
      alpha: 0,
      duration: 200,
      onComplete: () => ring.destroy(),
    });
  }

  /** Delayed follow-up blasts for Airstrike. Does not chain further airstrikes. */
  scheduleAirstrike(x, y, damage, radius) {
    if (!this.playerState.airstrike) return;

    const waves = 4;
    let elapsed = 0;

    for (let wave = 0; wave < waves; wave++) {
      const gap = 500 + Math.random() * 500;
      elapsed += gap;
      this.scene.time.delayedCall(elapsed, () => {
        const count = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < count; i++) {
          const ang = Math.random() * Math.PI * 2;
          const dist = 30 + Math.random() * 110;
          const ox = Math.cos(ang) * dist;
          const oy = Math.sin(ang) * dist;
          this.scene.time.delayedCall(i * 70, () => {
            this.createExplosion(x + ox, y + oy, damage * 1.05, 0, radius * 1.0, {
              skipAirstrike: true,
              color: 0xff3311,
            });
          });
        }
      });
    }
  }

  spawnSingularity(x, y, damage, radius) {
    const fx = this.scene.fx;
    const pullR = Math.max(140, radius * 1.6);
    const core = fx?.hold(x, y, 12, 0x220033, 0.9, 10);
    const ring = fx?.hold(x, y, 22, 0x6611aa, 0.28, 9);
    if (core) core.setStrokeStyle(3, 0xbb44ff, 0.95);
    const vfxId = registerCoopVfx(this.scene, { kind: 'singularity', x, y, r: pullR });

    let life = 1200;
    const tick = this.scene.time.addEvent({
      delay: 80,
      loop: true,
      callback: () => {
        life -= 80;
        if (ring?.active) ring.setRadius(20 + Math.sin(this.scene.time.now / 80) * 8);
        if (fx && life % 160 < 80) {
          fx.burst(x, y, { count: 3, color: 0xcc66ff, speed: 65, life: 240, size: 2.5 });
        }

        this.waveManager.enemies.getChildren().forEach((enemy) => {
          if (!enemy.active || enemy.isDying) return;
          const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
          if (dist > pullR) return;
          const ang = Phaser.Math.Angle.Between(enemy.x, enemy.y, x, y);
          const force = Phaser.Math.Clamp((pullR - dist) / pullR, 0.15, 1) * 18;
          enemy.x += Math.cos(ang) * force;
          enemy.y += Math.sin(ang) * force;
        });

        if (life <= 0) {
          tick.remove(false);
          fx?.release(core);
          fx?.release(ring);
          unregisterCoopVfx(this.scene, vfxId);
          fx?.flash(x, y, 16, 0xaa44ff, 280, pullR * 0.7);
          this.createExplosion(x, y, damage * 1.35, 0, pullR * 0.85, {
            skipAirstrike: true,
            color: 0xbb44ff,
          });
        }
      },
    });
  }

  collectXp(orb) {
    if (this.playerState.scavenger) {
      this.player.heal(2);
    }
    if (this.playerState.xpSpark) {
      this.zapNearestFromXp(orb.x, orb.y);
    }
    this.scene.events.emit('xp-collected', orb.value);
    orb.destroy();
  }

  zapNearestFromXp(x, y) {
    let best = null;
    let bestDist = 220;
    this.waveManager.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active || enemy.isDying) return;
      const d = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (d < bestDist) {
        bestDist = d;
        best = enemy;
      }
    });
    if (!best) return;
    this.scene.fx?.bolt(x, y, best.x, best.y, 0x66ffaa, 100);
    this.hitEnemy(best, 8, { fromCloud: true });
  }

  fireSplinterShard(x, y) {
    let best = null;
    let bestDist = 320;
    this.waveManager.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active || enemy.isDying) return;
      const d = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (d < bestDist) {
        bestDist = d;
        best = enemy;
      }
    });
    if (!best) return;
    const angle = Phaser.Math.Angle.Between(x, y, best.x, best.y);
    const proj = new Projectile(this.scene, x, y, angle, 480, 8, 0, this.playerState);
    proj.setTint(0xc8e0ff);
    this.projectiles.add(proj);
  }

  collectCoin(orb) {
    const value = this.scene.isMultiplayer ? Math.floor(orb.value / 2) : orb.value;
    if (value > 0) {
      if (this.scene.isMultiplayer) grantCoopCoins(this.scene, value);
      else {
        addCoins(value);
        this.scene.events.emit('coins-collected', value);
      }
    }
    if (this.playerState.healOnCoin > 0) {
      this.player.heal(this.playerState.healOnCoin);
    }
    if (this.playerState.coinNova) {
      this.coinNovaBlast();
    }
    orb.destroy();
  }

  coinNovaBlast() {
    const px = this.player.x;
    const py = this.player.y;
    const radius = 70;
    this.scene.fx?.flash(px, py, 12, 0xffd24a, 200, radius * 0.6);
    this.waveManager.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active || enemy.isDying) return;
      const dist = Phaser.Math.Distance.Between(px, py, enemy.x, enemy.y);
      if (dist <= radius + (enemy.enemyData?.radius || 14)) {
        this.hitEnemy(enemy, 12, { fromCloud: true });
      }
    });
  }

  performPrimaryAttack(pointer) {
    const weapon = this.playerState.weapon;
    if (!weapon) return;
    if (this.fortuneBusy) return;

    const time = this.scene.time.now;
    if (!this.player.canAttack(time)) return;

    // Prefer the pointer passed in (guest net input uses a fake pointer).
    const aimPointer = pointer || this.scene.input.activePointer;
    this._lastAimPointer = aimPointer;

    const fire = () => {
      const aimSrc = this._lastAimPointer || this.scene.input.activePointer;
      const aim = this.player.getAimPoint(aimSrc);
      const angle = Phaser.Math.Angle.Between(
        this.player.x,
        this.player.y,
        aim.x,
        aim.y,
      );

      if (this.playerState.bloodPact) {
        this.player.hp = Math.max(1, this.player.hp - 4);
      }

      const dischargeStatic = (this.playerState.staticField || false)
        && (this.playerState.staticCharge || 0) >= 1;

      this.player.markAttack(this.scene.time.now);
      switch (weapon.type) {
        case 'ranged':
          this.fireRanged(angle, weapon);
          break;
        case 'melee':
          this.performMelee(angle, weapon);
          break;
        case 'big':
          this.performBig(aim.x, aim.y, angle, weapon);
          break;
        default:
          break;
      }

      if (dischargeStatic) {
        this.playerState.staticCharge = 0;
        this.staticFieldBurst();
      }
    };

    if (this.playerState.fortune && weapon.type === 'ranged') {
      this.runFortuneRoll(fire);
      return;
    }

    this.playerState.fortuneMod = 1;
    this.playerState.fortuneFlat = 0;
    fire();
  }

  runFortuneRoll(onDone) {
    this.fortuneBusy = true;
    this.playerState.fortuneMod = 1;
    this.playerState.fortuneFlat = 0;

    const stacks = Math.max(1, this.playerState.fortuneStacks || 1);
    // More stacks = luckier matches (caps so it never becomes guaranteed).
    const luck = Math.min(0.72, 0.12 + (stacks - 1) * 0.18);

    const rollCard = () => 1 + Math.floor(Math.random() * 10);
    const cards = [rollCard()];
    cards.push(Math.random() < luck ? cards[0] : rollCard());
    if (Math.random() < luck) {
      // Prefer completing a pair/triple using an existing card.
      const prefer = Math.random() < 0.55 ? cards[0] : cards[1];
      cards.push(prefer);
    } else {
      cards.push(rollCard());
    }

    const counts = {};
    cards.forEach((n) => {
      counts[n] = (counts[n] || 0) + 1;
    });
    const bestMatch = Math.max(...Object.values(counts));

    let label = 'No match';
    if (bestMatch >= 3) {
      this.playerState.fortuneMod = 2;
      label = stacks > 1 ? `TRIPLE! x2 (Luck ${stacks})` : 'TRIPLE! x2';
    } else if (bestMatch === 2) {
      this.playerState.fortuneFlat = 5;
      label = stacks > 1 ? `PAIR! +5 (Luck ${stacks})` : 'PAIR! +5';
    } else {
      this.playerState.fortuneMod = 0.5;
      label = 'Half dmg';
    }

    this.showFortuneAbovePlayer(cards, label, () => {
      this.fortuneBusy = false;
      onDone();
      this.scene.time.delayedCall(80, () => {
        this.playerState.fortuneMod = 1;
        this.playerState.fortuneFlat = 0;
      });
    });
  }

  showFortuneAbovePlayer(cards, label, onDone) {
    const group = this.scene.add.container(this.player.x, this.player.y - 70).setDepth(30);
    const offsets = [-36, 0, 36];

    cards.forEach((n, i) => {
      const bg = this.scene.add
        .rectangle(offsets[i], 0, 30, 42, 0x2a1a08, 0.95)
        .setStrokeStyle(2, 0xffd700);
      const num = this.scene.add
        .text(offsets[i], 0, String(n), {
          fontFamily: 'Arial',
          fontSize: '18px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      group.add([bg, num]);
    });

    const result = this.scene.add
      .text(0, -34, label, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#ffd700',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    group.add(result);

    // Keep cards floating above the player while they move.
    const follow = this.scene.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (!group.active || !this.player.active) return;
        group.setPosition(this.player.x, this.player.y - 70);
      },
    });

    this.scene.time.delayedCall(550, () => {
      follow.remove(false);
      group.destroy(true);
      onDone?.();
    });
  }

  fireRanged(angle, weapon) {
    const total = 1 + this.playerState.bonusProjectiles;
    const spread = total > 1 ? 0.18 : 0;
    const start = angle - (spread * (total - 1)) / 2;
    const damage = weapon.damage * (1 + (this.playerState.rangedDamageBonus || 0));

    for (let i = 0; i < total; i++) {
      const shotAngle = start + spread * i;
      const proj = new Projectile(
        this.scene,
        this.player.x + Math.cos(shotAngle) * 20,
        this.player.y + Math.sin(shotAngle) * 20,
        shotAngle,
        weapon.projectileSpeed,
        damage,
        this.playerState.piercing,
        this.playerState,
      );
      proj.bouncesLeft = this.playerState.ricochet || 0;
      this.projectiles.add(proj);
    }

    if (this.playerState.doubleTap) {
      this.scene.time.delayedCall(120, () => {
        const aimSrc = this._lastAimPointer || this.scene.input.activePointer;
        const aim = this.player.getAimPoint(aimSrc);
        const a = Phaser.Math.Angle.Between(this.player.x, this.player.y, aim.x, aim.y);
        const proj = new Projectile(
          this.scene,
          this.player.x + Math.cos(a) * 20,
          this.player.y + Math.sin(a) * 20,
          a,
          weapon.projectileSpeed,
          damage,
          this.playerState.piercing,
          this.playerState,
        );
        proj.bouncesLeft = this.playerState.ricochet || 0;
        this.projectiles.add(proj);
      });
    }

    if ((this.playerState.phantomEcho || 0) > 0) {
      const count = this.playerState.phantomEcho;
      for (let i = 0; i < count; i++) {
        const offset = (i - (count - 1) / 2) * 0.22;
        this.scene.time.delayedCall(i * 50, () => {
          this.spawnPhantomEcho(angle + offset, weapon.projectileSpeed, damage * 0.75);
        });
      }
    }
  }

  spawnPhantomEcho(angle, speed, damage) {
    if (this.activePhantoms >= 8) return;
    const fx = this.scene.fx;
    const startX = this.player.x + Math.cos(angle) * 16;
    const startY = this.player.y + Math.sin(angle) * 16;
    const ghost = fx?.hold(startX, startY, 7, 0x66f0ff, 0.8, 10);
    if (!ghost) return;
    ghost.setStrokeStyle(2, 0xffffff, 0.5);
    this.activePhantoms += 1;

    let vx = Math.cos(angle) * speed * 0.85;
    let vy = Math.sin(angle) * speed * 0.85;
    const hitIds = new Set();
    let life = 1400;
    let trailAcc = 0;

    const finish = () => {
      this.activePhantoms = Math.max(0, this.activePhantoms - 1);
      fx?.release(ghost);
    };

    const tick = this.scene.time.addEvent({
      delay: 40,
      loop: true,
      callback: () => {
        if (!ghost.active) {
          tick.remove(false);
          this.activePhantoms = Math.max(0, this.activePhantoms - 1);
          return;
        }
        life -= 40;
        if (life <= 0) {
          finish();
          tick.remove(false);
          return;
        }

        trailAcc += 40;
        if (trailAcc >= 70) {
          trailAcc = 0;
          fx.burst(ghost.x, ghost.y, { count: 2, color: 0x88ffff, speed: 40, life: 160, size: 2.5 });
        }

        let nearest = null;
        let best = 420;
        this.waveManager.enemies.getChildren().forEach((enemy) => {
          if (!enemy.active || enemy.isDying || hitIds.has(enemy)) return;
          const d = Phaser.Math.Distance.Between(ghost.x, ghost.y, enemy.x, enemy.y);
          if (d < best) {
            best = d;
            nearest = enemy;
          }
        });
        if (nearest) {
          const a = Phaser.Math.Angle.Between(ghost.x, ghost.y, nearest.x, nearest.y);
          const turn = 0.22;
          const cur = Math.atan2(vy, vx);
          const wrapped = Phaser.Math.Angle.Wrap(a - cur);
          const next = cur + Phaser.Math.Clamp(wrapped, -turn, turn);
          const spd = speed * 0.95;
          vx = Math.cos(next) * spd;
          vy = Math.sin(next) * spd;
        }

        ghost.x += vx * 0.04;
        ghost.y += vy * 0.04;

        this.waveManager.enemies.getChildren().forEach((enemy) => {
          if (!enemy.active || enemy.isDying || hitIds.has(enemy)) return;
          const d = Phaser.Math.Distance.Between(ghost.x, ghost.y, enemy.x, enemy.y);
          if (d < 18 + (enemy.enemyData?.radius || 14)) {
            hitIds.add(enemy);
            this.hitEnemy(enemy, damage);
            fx.flash(enemy.x, enemy.y, 8, 0xaaffff, 160, 22);
            finish();
            tick.remove(false);
          }
        });
      },
    });
  }

  performMelee(angle, weapon) {
    const damage = weapon.damage * (1 + (this.playerState.meleeDamageBonus || 0));
    const arc = weapon.arcDegrees + (this.playerState.meleeArcBonus || 0);
    const range = weapon.range + (this.playerState.meleeRangeBonus || 0);
    const halfArc = Phaser.Math.DegToRad(arc / 2);
    const hitTargets = [];

    this.waveManager.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active || enemy.isDying) return;
      const dist = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        enemy.x,
        enemy.y,
      );
      if (dist > range + enemy.enemyData.radius) return;

      const toEnemy = Phaser.Math.Angle.Between(
        this.player.x,
        this.player.y,
        enemy.x,
        enemy.y,
      );
      const diff = Phaser.Math.Angle.Wrap(toEnemy - angle);
      if (Math.abs(diff) <= halfArc) {
        this.hitEnemy(enemy, damage, { fromMelee: true, zombiePerk: !!weapon.zombiePerk });
        if (enemy.active && !enemy.isDying) hitTargets.push(enemy);
      }
    });

    if (this.playerState.gravityHook && hitTargets.length > 0) {
      this.applyGravityHook(hitTargets);
    }

    this.showMeleeArc(angle, { ...weapon, arcDegrees: arc, range });

    if (this.playerState.bloodMoonArc) {
      this.spawnBloodMoonArc(damage * 0.55);
    }
  }

  applyGravityHook(anchors) {
    const pullR = 110;
    const force = 42;
    anchors.forEach((anchor) => {
      if (!anchor.active || anchor.isDying) return;
      this.scene.fx?.flash(anchor.x, anchor.y, 8, 0x8866cc, 160, 30);
      this.waveManager.enemies.getChildren().forEach((enemy) => {
        if (!enemy.active || enemy.isDying || enemy === anchor) return;
        const dist = Phaser.Math.Distance.Between(anchor.x, anchor.y, enemy.x, enemy.y);
        if (dist > pullR) return;
        const ang = Phaser.Math.Angle.Between(enemy.x, enemy.y, anchor.x, anchor.y);
        const t = Phaser.Math.Clamp((pullR - dist) / pullR, 0.2, 1);
        enemy.x += Math.cos(ang) * force * t;
        enemy.y += Math.sin(ang) * force * t;
      });
    });
  }

  staticFieldBurst() {
    const px = this.player.x;
    const py = this.player.y;
    const radius = 95;
    this.scene.fx?.flash(px, py, 16, 0x88ddff, 260, radius * 0.75);
    this.waveManager.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active || enemy.isDying) return;
      const dist = Phaser.Math.Distance.Between(px, py, enemy.x, enemy.y);
      if (dist <= radius + (enemy.enemyData?.radius || 14)) {
        this.hitEnemy(enemy, 22, { fromCloud: true });
      }
    });
  }

  chronoCrownPulse() {
    const px = this.player.x;
    const py = this.player.y;
    const radius = 160;
    const now = this.scene.time.now;
    this.scene.fx?.flash(px, py, 18, 0x66ffe0, 320, radius * 0.7);
    this.waveManager.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active || enemy.isDying) return;
      const dist = Phaser.Math.Distance.Between(px, py, enemy.x, enemy.y);
      if (dist <= radius + (enemy.enemyData?.radius || 14)) {
        enemy.applySlow(now, 0, 0.05);
        enemy.slowEndTime = now + 1200;
        enemy.setTint(0x88ffe8);
      }
    });
  }

  spawnBloodMoonArc(tickDamage) {
    const fx = this.scene.fx;
    const moon = this.scene.add.graphics().setDepth(10);
    let angle = Math.random() * Math.PI * 2;
    const orbit = 70;
    let life = 2800;
    const hitCooldown = new Map();
    let emberAcc = 0;

    const tick = this.scene.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        if (!this.player?.active) {
          moon.destroy();
          tick.remove(false);
          return;
        }
        life -= 50;
        if (life <= 0) {
          moon.destroy();
          tick.remove(false);
          return;
        }

        angle += 0.22;
        const px = this.player.x + Math.cos(angle) * orbit;
        const py = this.player.y + Math.sin(angle) * orbit;

        moon.clear();
        moon.lineStyle(5, 0xff2255, 0.9);
        moon.beginPath();
        moon.arc(px, py, 22, angle, angle + 2.2, false);
        moon.strokePath();
        moon.lineStyle(2, 0xff88aa, 0.5);
        moon.beginPath();
        moon.arc(px, py, 28, angle - 0.2, angle + 2.4, false);
        moon.strokePath();

        emberAcc += 50;
        if (fx && emberAcc >= 100) {
          emberAcc = 0;
          fx.burst(px, py, { count: 2, color: 0xff4466, speed: 45, life: 220, size: 2.5 });
        }

        const now = this.scene.time.now;
        this.waveManager.enemies.getChildren().forEach((enemy) => {
          if (!enemy.active || enemy.isDying) return;
          const d = Phaser.Math.Distance.Between(px, py, enemy.x, enemy.y);
          if (d > 34 + (enemy.enemyData?.radius || 14)) return;
          const last = hitCooldown.get(enemy) || 0;
          if (now - last < 220) return;
          hitCooldown.set(enemy, now);
          this.hitEnemy(enemy, tickDamage);
        });
      },
    });
  }

  showMeleeArc(angle, weapon) {
    const gfx = this.scene.add.graphics().setDepth(9);
    const halfArc = Phaser.Math.DegToRad(weapon.arcDegrees / 2);
    const start = angle - halfArc;
    const end = angle + halfArc;
    gfx.fillStyle(0xffffff, 0.15);
    gfx.lineStyle(3, 0xffffff, 0.5);
    gfx.beginPath();
    gfx.moveTo(this.player.x, this.player.y);
    gfx.arc(this.player.x, this.player.y, weapon.range, start, end, false);
    gfx.closePath();
    gfx.fillPath();
    gfx.strokePath();
    this.scene.time.delayedCall(100, () => gfx.destroy());
    broadcastMeleeArc(
      this.scene,
      this.player.x,
      this.player.y,
      angle,
      weapon.range,
      weapon.arcDegrees,
    );
  }

  performBig(targetX, targetY, angle, weapon) {
    const damage = weapon.damage * (1 + (this.playerState.bigDamageBonus || 0));
    const radius = weapon.radius * (1 + this.playerState.blastRadiusBonus);
    const fuseMs = Math.max(200, (weapon.fuseMs || 800) + (this.playerState.fuseBonusMs || 0));

    const blast = (x, y) => {
      this.createExplosion(x, y, damage, 0, radius, { zombiePerk: !!weapon.zombiePerk });
      this.scheduleAirstrike(x, y, damage, radius);
      if (this.playerState.singularity) {
        this.spawnSingularity(x, y, damage, radius);
      }
    };

    if (weapon.instant) {
      blast(this.player.x, this.player.y);
      return;
    }

    if (weapon.id === 'grenade') {
      this.throwThrowable({
        texture: 'weapon_grenade',
        targetX,
        targetY,
        angle,
        flightMs: 380,
        spinTurns: 2.5,
        arcHeight: 90,
        onLand: (x, y) => {
          this.player.throwableInFlight = false;
          blast(x, y);
        },
      });
      return;
    }

    if (weapon.id === 'bomb') {
      this.throwThrowable({
        texture: 'weapon_bomb',
        targetX,
        targetY,
        angle,
        flightMs: 450,
        spinTurns: 3,
        arcHeight: 70,
        onLand: (x, y) => {
          const placed = this.scene.add.image(x, y, 'bomb_placed').setDepth(8).setAngle(0);
          this.scene.tweens.add({
            targets: placed,
            scale: { from: 0.85, to: 1 },
            duration: 100,
          });
          this.scene.time.delayedCall(fuseMs, () => {
            placed.destroy();
            this.player.throwableInFlight = false;
            blast(x, y);
          });
        },
      });
      return;
    }

    blast(targetX, targetY);
  }

  throwThrowable({ texture, targetX, targetY, angle, flightMs, spinTurns, arcHeight, onLand }) {
    this.player.throwableInFlight = true;
    this.player.bombPreview.setVisible(false);
    this.player.grenadePreview.setVisible(false);

    const startX = this.player.x + Math.cos(angle) * 22;
    const startY = this.player.y + Math.sin(angle) * 22;

    const sprite = this.scene.add.image(startX, startY, texture).setDepth(9);

    this.scene.tweens.add({
      targets: sprite,
      angle: 360 * spinTurns,
      duration: flightMs,
      ease: 'Linear',
    });

    this.scene.tweens.add({
      targets: { progress: 0 },
      progress: 1,
      duration: flightMs,
      ease: 'Sine.easeIn',
      onUpdate: (tween) => {
        const t = tween.getValue();
        sprite.x = Phaser.Math.Linear(startX, targetX, t);
        const baseY = Phaser.Math.Linear(startY, targetY, t);
        sprite.y = baseY - Math.sin(t * Math.PI) * arcHeight;
      },
      onComplete: () => {
        sprite.destroy();
        onLand(targetX, targetY);
      },
    });
  }

  useAttackPowerup(pointer) {
    const id = this.playerState.attackPowerup;
    if (!id) return false;

    const powerup = getPowerup(id) || Powerups[id] || ShopItems[id];
    if (!powerup) return false;

    const time = this.scene.time.now;
    if (!this.player.canUseAttackPowerup(time)) return false;

    this.player.markAttackPowerupUsed(
      time,
      Math.max(1500, (powerup.cooldownMs || 4000) - (this.playerState.attackPowerupCooldownReduceMs || 0)),
    );

    const worldPoint = pointer.positionToCamera(this.scene.cameras.main);
    const angle = Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      worldPoint.x,
      worldPoint.y,
    );

    switch (id) {
      case 'dashSlash':
        this.dashSlash(angle);
        break;
      case 'sniperShot':
        this.sniperShot(angle);
        break;
      case 'megaBlast':
        this.createExplosion(
          worldPoint.x,
          worldPoint.y,
          80,
          0,
          160,
        );
        break;
      case 'ghostStep':
        this.ghostStep(angle);
        break;
      case 'shadowStrike':
        this.shadowStrike(worldPoint.x, worldPoint.y);
        break;
      case 'barrage':
        this.barrage(angle);
        break;
      case 'clusterBomb':
        this.clusterBomb(worldPoint.x, worldPoint.y);
        break;
      default:
        break;
    }

    return true;
  }

  shadowStrike(x, y) {
    this.player.x = x;
    this.player.y = y;
    this.player.invulnerableUntil = this.scene.time.now + 400;
    this.waveManager.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active || enemy.isDying) return;
      const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (dist <= 90) this.hitEnemy(enemy, 55);
    });
    const gfx = this.scene.add.circle(x, y, 20, 0x553388, 0.35).setDepth(9);
    this.scene.tweens.add({
      targets: gfx,
      radius: 90,
      alpha: 0,
      duration: 180,
      onComplete: () => gfx.destroy(),
    });
  }

  barrage(angle) {
    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(i * 70, () => {
        const spread = (i - 2) * 0.08;
        const a = angle + spread;
        const proj = new Projectile(
          this.scene,
          this.player.x + Math.cos(a) * 20,
          this.player.y + Math.sin(a) * 20,
          a,
          700,
          14 * (1 + (this.playerState.rangedDamageBonus || 0)),
          this.playerState.piercing,
          this.playerState,
        );
        this.projectiles.add(proj);
      });
    }
  }

  clusterBomb(x, y) {
    const offsets = [
      [0, 0],
      [-50, 30],
      [50, 30],
    ];
    offsets.forEach(([ox, oy], i) => {
      this.scene.time.delayedCall(i * 80, () => {
        this.createExplosion(x + ox, y + oy, 35, 0, 70);
      });
    });
  }

  ghostStep(angle) {
    const dashDist = 140;
    this.player.x += Math.cos(angle) * dashDist;
    this.player.y += Math.sin(angle) * dashDist;
    this.player.invulnerableUntil = this.scene.time.now + 700;
    this.player.setAlpha(0.45);
    this.scene.time.delayedCall(700, () => {
      if (this.player.active) this.player.setAlpha(1);
    });
  }

  dashSlash(angle) {
    const dashDist = 120;
    this.player.x += Math.cos(angle) * dashDist;
    this.player.y += Math.sin(angle) * dashDist;

    const weapon = this.playerState.weapon;
    const damage = 50;
    const range = (weapon?.range || 70) + 30;

    this.waveManager.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active || enemy.isDying) return;
      const dist = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        enemy.x,
        enemy.y,
      );
      if (dist <= range + enemy.enemyData.radius) {
        this.hitEnemy(enemy, damage);
      }
    });

    const gfx = this.scene.add.circle(this.player.x, this.player.y, range, 0xffcc44, 0.2).setDepth(9);
    this.scene.time.delayedCall(120, () => gfx.destroy());
  }

  sniperShot(angle) {
    const proj = new Projectile(
      this.scene,
      this.player.x + Math.cos(angle) * 20,
      this.player.y + Math.sin(angle) * 20,
      angle,
      900,
      100,
      99,
      this.playerState,
    );
    this.projectiles.add(proj);
  }

  update() {
    const now = this.scene.time.now;
    this.projectiles.getChildren().forEach((p) => {
      if (p.active) p.update(now);
    });
    this.xpOrbs.getChildren().forEach((orb) => {
      if (orb.active) orb.update(this.player);
    });
    this.coinOrbs.getChildren().forEach((orb) => {
      if (orb.active) orb.update(this.player);
    });

    if (this.player?.body) {
      const speed = Math.hypot(this.player.body.velocity.x, this.player.body.velocity.y);
      if (this.playerState.focusLens) {
        this.playerState.focusActive = speed < 28;
      }

      if (this.playerState.staticField) {
        if (speed < 28) {
          this.playerState.staticCharge = Math.min(1, (this.playerState.staticCharge || 0) + 0.02);
        } else {
          this.playerState.staticCharge = Math.max(0, (this.playerState.staticCharge || 0) - 0.01);
        }
      }

      if (this.playerState.emberTrail && speed > 40 && now - this.lastEmberTrail > 180) {
        this.lastEmberTrail = now;
        this.spawnEmber(this.player.x, this.player.y);
      }
    }

    if (this.playerState.frostAura && now - this.lastFrostAuraTick > 350) {
      this.lastFrostAuraTick = now;
      const speed = Math.hypot(this.player.body.velocity.x, this.player.body.velocity.y);
      if (speed > 10 && speed < 140) {
        const radius = 90;
        this.waveManager.enemies.getChildren().forEach((enemy) => {
          if (!enemy.active || enemy.isDying) return;
          const dist = Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            enemy.x,
            enemy.y,
          );
          if (dist <= radius + (enemy.enemyData?.radius || 14)) {
            enemy.applySlow(now, 200, 0.45);
          }
        });
      }
    }

    if (this.playerState.chronoCrown && now - this.lastChronoPulse >= 8000) {
      this.lastChronoPulse = now;
      this.chronoCrownPulse();
    }

    if (this.playerState.orbitalStrike && now - this.lastOrbitalStrike >= 12000) {
      this.lastOrbitalStrike = now;
      this.fireOrbitalStrike();
    }

    if (this.playerState.magmaPulse && now - this.lastMagmaPulse >= 7000) {
      this.lastMagmaPulse = now;
      this.fireMagmaPulse();
    }

    if (this.playerState.crowPeck && now - this.lastCrowPeck > 1200) {
      this.lastCrowPeck = now;
      this.doCrowPeck();
    }

    this.updateCrowAura(now);
  }

  ensureCrowAura() {
    if (this.crowAura) return;
    const scene = this.scene;
    const px = this.player.x;
    const py = this.player.y;
    this.crowAura = scene.add.circle(px, py, 52, 0x050508, 0.42).setDepth(3);
    this.crowAura.setStrokeStyle(3, 0x1a1a28, 0.75);
    this.crowAuraRing = scene.add.circle(px, py, 38, 0x101018, 0.22).setDepth(3);
    this.crowSprites = [];
    const count = 4;
    for (let i = 0; i < count; i++) {
      const sprite = scene.textures.exists('fx_crow')
        ? scene.add.image(px, py, 'fx_crow').setDepth(12).setScale(0.85)
        : scene.add.circle(px, py, 5, 0x111118, 0.95).setDepth(12);
      this.crowSprites.push({
        sprite,
        angle: (Math.PI * 2 * i) / count,
        bob: Math.random() * Math.PI * 2,
      });
    }
  }

  destroyCrowAura() {
    this.crowAura?.destroy();
    this.crowAura = null;
    this.crowAuraRing?.destroy();
    this.crowAuraRing = null;
    (this.crowSprites || []).forEach((c) => c.sprite?.destroy());
    this.crowSprites = null;
  }

  updateCrowAura(now) {
    if (!this.playerState.crowPeck || !this.player?.active) {
      this.destroyCrowAura();
      return;
    }
    this.ensureCrowAura();
    const px = this.player.x;
    const py = this.player.y;
    this.crowAura.setPosition(px, py);
    this.crowAuraRing.setPosition(px, py);
    const pulse = 52 + Math.sin(now / 280) * 3;
    this.crowAura.setRadius(pulse);
    this.crowAuraRing.setRadius(pulse * 0.72);
    const orbit = 44;
    this.crowSprites.forEach((c) => {
      c.angle += 0.045;
      c.bob += 0.08;
      const a = c.angle;
      const bobY = Math.sin(c.bob) * 5;
      c.sprite.setPosition(px + Math.cos(a) * orbit, py + Math.sin(a) * orbit * 0.72 + bobY - 6);
      if (c.sprite.setFlipX) c.sprite.setFlipX(Math.cos(a) > 0);
      if (c.sprite.setRotation) c.sprite.setRotation(Math.sin(a) * 0.25);
    });
  }

  doCrowPeck() {
    let best = null;
    let bestDist = 200;
    this.waveManager.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active || enemy.isDying) return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (d < bestDist) {
        bestDist = d;
        best = enemy;
      }
    });
    if (!best) return;
    // Peck flies out from a random crow if present
    let fromX = this.player.x;
    let fromY = this.player.y - 18;
    if (this.crowSprites?.length) {
      const crow = this.crowSprites[Math.floor(Math.random() * this.crowSprites.length)];
      fromX = crow.sprite.x;
      fromY = crow.sprite.y;
    }
    this.scene.fx?.bolt(fromX, fromY, best.x, best.y, 0x222233, 90);
    this.scene.fx?.burst(best.x, best.y, { count: 3, color: 0x222230, speed: 35, life: 140, size: 2 });
    this.hitEnemy(best, 3, { fromCloud: true });
  }

  spawnScorchedGround(x, y) {
    if (this.activeScorchedPools >= 4) return;
    this.activeScorchedPools += 1;
    const fx = this.scene.fx;
    const pool = fx?.hold(x, y, 36, 0xff4400, 0.4, 5);
    const glow = fx?.hold(x, y, 22, 0xffaa33, 0.35, 6);
    const vfxId = registerCoopVfx(this.scene, { kind: 'scorch', x, y, r: 36 });
    let life = 1800;
    const hit = new Set();
    const tick = this.scene.time.addEvent({
      delay: 160,
      loop: true,
      callback: () => {
        life -= 160;
        this.waveManager.enemies.getChildren().forEach((enemy) => {
          if (!enemy.active || enemy.isDying) return;
          const d = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
          if (d < 40 + (enemy.enemyData?.radius || 14)) {
            if (!hit.has(enemy) || life % 480 < 160) {
              hit.add(enemy);
              this.hitEnemy(enemy, 7, { fromCloud: true });
              enemy.applyBurn?.(this.scene.time.now, 4, 1600);
            }
          }
        });
        if (life <= 0) {
          tick.remove(false);
          fx?.release(pool);
          fx?.release(glow);
          unregisterCoopVfx(this.scene, vfxId);
          this.activeScorchedPools = Math.max(0, this.activeScorchedPools - 1);
        }
      },
    });
  }

  spawnCinderRing(x, y) {
    const fx = this.scene.fx;
    fx?.flash(x, y, 20, 0xffaa44, 220, 70);
    fx?.burst(x, y, { count: 10, color: 0xff6622, speed: 140, life: 280, size: 4 });
    const ring = fx?.hold(x, y, 18, 0xff7722, 0.45, 8);
    let radius = 18;
    let pulses = 0;
    const tick = this.scene.time.addEvent({
      delay: 40,
      repeat: 10,
      callback: () => {
        pulses += 1;
        radius += 14;
        if (ring?.active) ring.setRadius(radius);
        this.waveManager.enemies.getChildren().forEach((enemy) => {
          if (!enemy.active || enemy.isDying) return;
          const d = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
          if (Math.abs(d - radius) < 22) {
            this.hitEnemy(enemy, 10, { fromCloud: true });
            enemy.applyBurn?.(this.scene.time.now, 3, 1400);
          }
        });
        if (pulses >= 10) {
          fx?.release(ring);
        }
      },
    });
  }

  fireMagmaPulse() {
    const x = this.player.x;
    const y = this.player.y;
    const radius = 130;
    this.scene.fx?.flash(x, y, 30, 0xff5522, 240, 80);
    this.scene.fx?.burst(x, y, { count: 12, color: 0xff4400, speed: 160, life: 300, size: 5 });
    this.waveManager.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active || enemy.isDying) return;
      const d = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (d <= radius + (enemy.enemyData?.radius || 14)) {
        this.hitEnemy(enemy, 28, { fromCloud: true });
        enemy.applyBurn?.(this.scene.time.now, 5, 2200);
      }
    });
  }

  spawnEmber(x, y) {
    const fx = this.scene.fx;
    const ember = fx?.hold(x, y, 10, 0xff6622, 0.55, 4);
    let life = 700;
    const hit = new Set();
    const tick = this.scene.time.addEvent({
      delay: 120,
      loop: true,
      callback: () => {
        life -= 120;
        this.waveManager.enemies.getChildren().forEach((enemy) => {
          if (!enemy.active || enemy.isDying || hit.has(enemy)) return;
          const d = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
          if (d < 22 + (enemy.enemyData?.radius || 14)) {
            hit.add(enemy);
            this.hitEnemy(enemy, 6, { fromCloud: true });
          }
        });
        if (life <= 0) {
          tick.remove(false);
          fx?.release(ember);
        }
      },
    });
  }

  fireOrbitalStrike() {
    let nearest = null;
    let nearestDist = 520;
    this.waveManager.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active || enemy.isDying) return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = enemy;
      }
    });
    if (!nearest) return;
    const x = nearest.x;
    const y = nearest.y;
    this.scene.fx?.flash(x, y - 40, 14, 0xffaa22, 280, 30);
    this.scene.time.delayedCall(220, () => {
      this.createExplosion(x, y, 55, 0, 90, {
        skipAirstrike: true,
        color: 0xffaa22,
      });
    });
  }

  clearOrbs() {
    this.xpOrbs.clear(true, true);
    this.coinOrbs.clear(true, true);
    this.cardPickups.clear(true, true);
  }
}
