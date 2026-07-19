import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../data/constants.js';
import { Music, bindMusicUnlock } from '../systems/MusicManager.js';

/** Loading art is 1024x576 (same 16:9 as the game). */
const ART_W = 1024;
const ART_H = 576;
/** Red/orange dot next to "Mobkert" in the loading art. */
const RED_DOT_X = 932;
const RED_DOT_Y = 540;

export class LoadingScene extends Phaser.Scene {
  constructor() {
    super('LoadingScene');
  }

  init(data = {}) {
    this.durationMs = Number(data.durationMs) > 0 ? Number(data.durationMs) : 6000;
    this.nextScene = data.nextScene || 'MenuScene';
    this.launchScenes = Array.isArray(data.launchScenes) ? data.launchScenes : [];
    this.levelId = data.levelId || 'plains';
    this.continueCarry = data.continueCarry || null;
    this.multiplayer = data.multiplayer || null;
  }

  preload() {
    if (!this.textures.exists('loading_screen')) {
      this.load.image('loading_screen', 'images/loading.png');
    }
    if (!this.textures.exists('loading_screen_volcanic')) {
      this.load.image('loading_screen_volcanic', 'images/loading_volcanic.png');
    }
    if (!this.textures.exists('loading_screen_tundra')) {
      this.load.image('loading_screen_tundra', 'images/loading_tundra.png');
    }
    if (!this.textures.exists('loading_screen_swamp')) {
      this.load.image('loading_screen_swamp', 'images/loading_swamp.png');
    }
    if (!this.textures.exists('loading_pigeon')) {
      this.load.image('loading_pigeon', 'images/pigeon.png');
    }
  }

  create() {
    bindMusicUnlock(this);
    Music.play('chill');

    const scaleX = GAME_WIDTH / ART_W;
    const scaleY = GAME_HEIGHT / ART_H;
    let bgKey = 'loading_screen';
    if (this.levelId === 'volcanic') bgKey = 'loading_screen_volcanic';
    else if (this.levelId === 'tundra') bgKey = 'loading_screen_tundra';
    else if (this.levelId === 'swamp') bgKey = 'loading_screen_swamp';

    this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, bgKey)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setDepth(0);

    const pigeonX = RED_DOT_X * scaleX;
    const pigeonY = RED_DOT_Y * scaleY;

    const pigeon = this.add
      .image(pigeonX, pigeonY, 'loading_pigeon')
      .setDisplaySize(190, 107)
      .setDepth(2);

    this.startPigeonSpin(pigeon);

    this.time.delayedCall(this.durationMs, () => this.finishLoading());
  }

  startPigeonSpin(pigeon) {
    const spinOnce = () => {
      if (!pigeon.active) return;
      this.tweens.add({
        targets: pigeon,
        angle: pigeon.angle + 180,
        duration: 450,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          if (!pigeon.active) return;
          this.time.delayedCall(500, spinOnce);
        },
      });
    };
    spinOnce();
  }

  finishLoading() {
    this.launchScenes.forEach((key) => {
      if (!this.scene.isActive(key)) {
        this.scene.launch(key);
      }
    });
    this.scene.start(this.nextScene, {
      levelId: this.levelId,
      continueCarry: this.continueCarry || null,
      multiplayer: this.multiplayer || null,
    });
  }
}
