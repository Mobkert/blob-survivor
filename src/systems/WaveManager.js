import { getWaveComposition, getSpawnPositions } from '../data/waves.js';
import { isBossWave } from '../data/enemies.js';
import { Enemy } from '../entities/Enemy.js';
import { GoblinKing } from '../entities/GoblinKing.js';
import { KingMagmaCube } from '../entities/KingMagmaCube.js';
import { Yeti } from '../entities/Yeti.js';
import { Wizard, isWizardType } from '../entities/Wizard.js';
import { MagmaCube, isMagmaType } from '../entities/MagmaCube.js';
import { IceCube, isIceCubeType } from '../entities/IceCube.js';
import { IceWizard, isIceWizardType } from '../entities/IceWizard.js';

export class WaveManager {
  /**
   * @param {Phaser.Scene} scene
   * @param {import('../entities/Player.js').Player} player
   */
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.currentWave = 0;
    this.enemies = scene.add.group();
    this.isWaveActive = false;
    this.pendingWaveStart = false;
    this.activeBoss = null;
  }

  get levelId() {
    return this.scene.levelId || 'plains';
  }

  get aliveCount() {
    return this.enemies.countActive(true);
  }

  startWave(waveNumber) {
    this.currentWave = waveNumber;
    this.isWaveActive = true;
    this.clearEnemies();
    this.activeBoss = null;

    if (this.scene.playerState?.bubbleWrap) {
      this.scene.playerState.bubbleWrapReady = true;
    }
    if (this.scene.allyState?.bubbleWrap) {
      this.scene.allyState.bubbleWrapReady = true;
    }

    if (isBossWave(waveNumber)) {
      let boss;
      if (this.levelId === 'volcanic') {
        boss = new KingMagmaCube(this.scene, 0, 0, waveNumber);
      } else if (this.levelId === 'tundra') {
        boss = new Yeti(this.scene, 0, 0, waveNumber);
      } else {
        boss = new GoblinKing(this.scene, 0, 0, waveNumber);
      }
      this.enemies.add(boss);
      this.activeBoss = boss;
      this.scene.events.emit('wave-started', waveNumber);
      return;
    }

    const composition = getWaveComposition(waveNumber, this.levelId);
    const positions = getSpawnPositions(composition.length, this.scene.arenaSize);

    composition.forEach((typeId, index) => {
      const pos = positions[index];
      let enemy;
      if (isWizardType(typeId)) {
        enemy = new Wizard(this.scene, pos.x, pos.y, typeId, waveNumber);
      } else if (isIceWizardType(typeId)) {
        enemy = new IceWizard(this.scene, pos.x, pos.y, typeId, waveNumber);
      } else if (isMagmaType(typeId)) {
        enemy = new MagmaCube(this.scene, pos.x, pos.y, typeId, waveNumber);
      } else if (isIceCubeType(typeId)) {
        enemy = new IceCube(this.scene, pos.x, pos.y, typeId, waveNumber);
      } else {
        enemy = new Enemy(this.scene, pos.x, pos.y, typeId, waveNumber);
      }
      this.enemies.add(enemy);
    });

    this.scene.events.emit('wave-started', waveNumber);
  }

  clearEnemies() {
    this.enemies.getChildren().forEach((enemy) => enemy.destroy());
    this.enemies.clear(false, true);
    this.activeBoss = null;
  }

  update(time) {
    const targetFor = (enemy) => {
      if (typeof this.scene.getCombatTarget === 'function') {
        return this.scene.getCombatTarget(enemy);
      }
      return this.player;
    };
    this.enemies.getChildren().forEach((enemy) => {
      if (enemy.active) enemy.update(time, targetFor(enemy));
    });
  }

  checkWaveClear() {
    if (!this.isWaveActive) return false;
    if (this.aliveCount === 0) {
      this.isWaveActive = false;
      this.activeBoss = null;
      this.scene.events.emit('wave-cleared', this.currentWave);
      return true;
    }
    return false;
  }

  respawnWave() {
    this.startWave(this.currentWave);
  }
}
