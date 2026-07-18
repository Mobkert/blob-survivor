import Phaser from 'phaser';
import {
  ARENA_SIZE,
  TILE_SIZE,
  createPlayerState,
  shouldOfferWeaponPickAfterWave,
  WAVE_PAUSE_MS,
  PLAYER_LIVES,
  getMaxHp,
} from '../data/constants.js';
import { Player } from '../entities/Player.js';
import { WaveManager } from '../systems/WaveManager.js';
import { LevelSystem } from '../systems/LevelSystem.js';
import { CardManager } from '../systems/CardManager.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { FxPool } from '../systems/FxPool.js';
import { Music } from '../systems/MusicManager.js';
import { getLevel } from '../data/levels.js';
import { addCoins, addDiamonds, markLevelComplete } from '../data/meta.js';
import { getPowerup } from '../data/powerups.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init(data = {}) {
    this.levelId = data.levelId || 'plains';
    this.levelData = getLevel(this.levelId);
    this.continueCarry = data.continueCarry || null;
  }

  create() {
    Music.stop();
    this.arenaSize = ARENA_SIZE;
    this.playerState = createPlayerState();
    this.lives = PLAYER_LIVES;
    this.gameState = 'weapon_pick';
    this.isPausedForCard = false;
    this.waveTransitionLock = false;
    if (!this.levelData) this.levelData = getLevel(this.levelId || 'plains');

    this.buildArena();
    this.fx = new FxPool(this);

    this.player = new Player(this, 0, 0, this.playerState);
    this.player.hp = getMaxHp(this.playerState);
    this.player.maxHp = getMaxHp(this.playerState);

    this.setupCamera();

    this.waveManager = new WaveManager(this, this.player);
    this.levelSystem = new LevelSystem(this, this.playerState);
    this.uiSceneRef = this.scene.get('UIScene');
    this.cardManager = new CardManager(this, this.uiSceneRef, this.playerState);
    this.combatSystem = new CombatSystem(this, this.player, this.waveManager, this.playerState);

    this.cursors = {
      W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      Q: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
    };

    this.input.on('pointerdown', (pointer) => {
      if (this.gameState !== 'playing' && this.gameState !== 'wave_pause') return;
      if (pointer.leftButtonDown()) {
        this.combatSystem.performPrimaryAttack(pointer);
      }
      if (pointer.rightButtonDown()) {
        if (this.player.activateShield(this.time.now)) {
          this.combatSystem.onShieldActivate();
        }
      }
    });

    this.input.keyboard.on('keydown-Q', () => {
      if (this.gameState !== 'playing' && this.gameState !== 'wave_pause') return;
      this.combatSystem.useAttackPowerup(this.input.activePointer);
    });

    this.input.keyboard.on('keydown-ESC', () => {
      this.togglePause();
    });

    this.isUserPaused = false;
    this.stateBeforePause = null;

    this.events.on('xp-collected', (amount) => {
      const leveled = this.levelSystem.addXp(amount);
      this.events.emit('hud-update');
      if (leveled) {
        this.handleLevelUp().catch((err) => console.error('Level up failed:', err));
      }
    });

    this.events.on('player-died', () => this.handlePlayerDeath());
    this.events.on('stats-changed', () => {
      this.player.syncStats();
      this.player.heal(15);
      this.events.emit('hud-update');
    });

    this.events.on('wave-started', (wave) => {
      this.events.emit('hud-update', { wave });
    });

    this.events.on('wave-cleared', (wave) => {
      this.handleWaveCleared(wave).catch((err) => console.error('Wave transition failed:', err));
    });

    this.beginRun().catch((err) => {
      console.error('Failed to start run:', err);
    });
  }

  buildArena() {
    const half = this.arenaSize / 2;
    const tiles = Math.ceil(this.arenaSize / TILE_SIZE);
    const prefix = this.levelData?.tilePrefix || 'tile_';
    const bg = this.levelData?.bgColor ?? 0x1a2a14;
    this.cameras.main.setBackgroundColor(bg);

    for (let row = 0; row < tiles; row++) {
      for (let col = 0; col < tiles; col++) {
        const x = -half + col * TILE_SIZE + TILE_SIZE / 2;
        const y = -half + row * TILE_SIZE + TILE_SIZE / 2;
        const variant = (row + col) % 5;
        this.add.image(x, y, `${prefix}${variant}`).setDepth(0);
      }
    }

    this.physics.world.setBounds(-half, -half, this.arenaSize, this.arenaSize);
  }

  setupCamera() {
    this.cameras.main.setBounds(-this.arenaSize / 2, -this.arenaSize / 2, this.arenaSize, this.arenaSize);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1);
  }

  async beginRun() {
    this.lives = PLAYER_LIVES;
    this.playerState = createPlayerState();
    this.player.playerState = this.playerState;
    this.levelSystem.playerState = this.playerState;
    this.cardManager.playerState = this.playerState;
    this.combatSystem.playerState = this.playerState;
    this.player.respawn(0, 0);
    this.combatSystem.clearOrbs();
    this.events.emit('hud-update', { lives: this.lives, reset: true });

    const carry = this.continueCarry;
    this.continueCarry = null;

    if (carry?.continued) {
      this.applyContinueLoadout(carry);
      this.waveManager.startWave(1);
      this.gameState = 'playing';
      this.player.syncStats();
      this.events.emit('hud-update');
      return;
    }

    await this.showWeaponPickAndStartWave(1);
  }

  applyContinueLoadout(carry) {
    // Keep Plains XP level; start from base damage (1) before the 4 cards apply.
    this.playerState.level = Math.max(1, Number(carry.level) || 1);
    this.playerState.xp = Math.max(0, Number(carry.xp) || 0);
    this.playerState.damageMultiplier = 1;
    this.playerState.rangedDamageBonus = 0;
    this.playerState.meleeDamageBonus = 0;
    this.playerState.bigDamageBonus = 0;
    this.playerState.fortuneFlat = 0;
    this.playerState.fortuneMod = 1;

    if (carry.weapon) {
      this.playerState.weapon = { ...carry.weapon, damage: 1 };
    }

    const ids = Array.isArray(carry.cardIds) ? carry.cardIds : [];
    ids.forEach((id) => {
      const card = getPowerup(id);
      if (!card?.apply) return;
      card.apply(this.playerState);
      this.playerState.runPowerups.push(id);
      if (card.category === 'attack') {
        this.player.attackCooldownEnd = 0;
      }
    });

    this.player.syncStats();
    this.player.maxHp = getMaxHp(this.playerState);
    this.player.hp = this.player.maxHp;
  }

  async showWeaponPickAndStartWave(waveNumber) {
    this.gameState = 'weapon_pick';
    this.isPausedForCard = true;
    await this.cardManager.show('weapon');
    this.isPausedForCard = false;
    this.waveManager.startWave(waveNumber);
    this.gameState = 'playing';
    this.player.syncStats();
    this.events.emit('hud-update');
  }

  async handleLevelUp() {
    if (this.gameState !== 'playing') {
      this.levelSystem.pendingLevelUp = true;
      return;
    }

    this.gameState = 'level_up';
    this.isPausedForCard = true;
    this.levelSystem.consumeLevelUp();
    await this.cardManager.show('powerup');
    this.player.syncStats();
    if (this.player.hp > this.player.maxHp) {
      this.player.hp = this.player.maxHp;
    }
    this.isPausedForCard = false;
    this.gameState = 'playing';
    this.events.emit('hud-update');
  }

  async handleWaveCleared(wave) {
    if (this.waveTransitionLock) return;
    this.waveTransitionLock = true;

    try {
      this.gameState = 'wave_pause';
      this.events.emit('hud-update');

      const maxWaves = this.levelData?.maxWaves || 21;
      if (wave >= maxWaves) {
        this.gameState = 'victory';
        this.isUserPaused = false;
        this.physics.pause();
        const goldReward = this.levelData?.clearGold ?? 1200;
        const diamondReward = this.levelData?.clearDiamonds ?? 0;
        addCoins(goldReward);
        if (diamondReward > 0) addDiamonds(diamondReward);
        markLevelComplete(this.levelId);
        this.events.emit('coins-collected', goldReward);
        this.events.emit('level-complete', {
          wave,
          levelId: this.levelId,
          levelName: this.levelData?.name || 'Level',
          playerLevel: this.playerState.level,
          playerXp: this.playerState.xp,
          goldReward,
          diamondReward,
          canContinue: this.levelId === 'plains',
          continueWeapon: this.playerState.weapon ? { ...this.playerState.weapon } : null,
          continueCards: [...(this.playerState.runPowerups || [])],
        });
        return;
      }

      await new Promise((resolve) => {
        this.time.delayedCall(WAVE_PAUSE_MS, resolve);
      });

      const nextWave = wave + 1;

      if (shouldOfferWeaponPickAfterWave(wave)) {
        await this.showWeaponPickAndStartWave(nextWave);
      } else {
        this.waveManager.startWave(nextWave);
        this.gameState = 'playing';
        this.events.emit('hud-update');
      }

      if (this.levelSystem.pendingLevelUp) {
        await this.handleLevelUp();
      }
    } finally {
      this.waveTransitionLock = false;
    }
  }

  handlePlayerDeath() {
    this.lives -= 1;
    this.events.emit('hud-update', { lives: this.lives });

    if (this.lives <= 0) {
      this.gameState = 'game_over';
      this.isUserPaused = false;
      this.physics.pause();
      this.events.emit('game-over', {
        wave: this.waveManager.currentWave,
        level: this.playerState.level,
      });
      return;
    }

    this.gameState = 'respawn';
    this.player.respawn(0, 0);
    this.combatSystem.clearOrbs();
    this.waveManager.respawnWave();
    this.gameState = 'playing';
    this.events.emit('hud-update');
  }

  togglePause() {
    if (this.isUserPaused) this.unpauseGame();
    else this.pauseGame();
  }

  pauseGame() {
    if (this.isUserPaused) return;
    if (this.isPausedForCard) return;
    if (this.gameState === 'game_over' || this.gameState === 'victory' || this.gameState === 'weapon_pick' || this.gameState === 'level_up') {
      return;
    }
    if (this.gameState !== 'playing' && this.gameState !== 'wave_pause') return;

    this.isUserPaused = true;
    this.stateBeforePause = this.gameState;
    this.gameState = 'paused';
    this.physics.pause();
    this.events.emit('game-paused');
  }

  unpauseGame() {
    if (!this.isUserPaused) return;
    this.isUserPaused = false;
    this.gameState = this.stateBeforePause || 'playing';
    this.stateBeforePause = null;
    this.physics.resume();
    this.events.emit('game-unpaused');
  }

  returnToMenuFromPause() {
    this.isUserPaused = false;
    this.stateBeforePause = null;
    try {
      this.physics.resume();
    } catch {
      // ignore
    }
    this.scene.stop('UIScene');
    this.scene.start('MenuScene');
  }

  update(time) {
    if (
      this.gameState === 'weapon_pick' ||
      this.gameState === 'level_up' ||
      this.gameState === 'game_over' ||
      this.gameState === 'victory' ||
      this.gameState === 'paused'
    ) {
      return;
    }

    this.player.update(time, this.cursors, this.input.activePointer);

    if (this.gameState === 'playing') {
      this.waveManager.update(time);
      this.combatSystem.update();
      this.waveManager.checkWaveClear();
    }
  }
}
