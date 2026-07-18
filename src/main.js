import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { LoadingScene } from './scenes/LoadingScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { ShopScene } from './scenes/ShopScene.js';
import { DeckScene } from './scenes/DeckScene.js';
import { DiamondsScene } from './scenes/DiamondsScene.js';
import { SavesScene } from './scenes/SavesScene.js';
import { LevelsScene } from './scenes/LevelsScene.js';
import { MultiplayerLobbyScene } from './scenes/MultiplayerLobbyScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
import { GAME_WIDTH, GAME_HEIGHT } from './data/constants.js';

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#1a2a14',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [
    BootScene,
    LoadingScene,
    MenuScene,
    LevelsScene,
    MultiplayerLobbyScene,
    ShopScene,
    DeckScene,
    DiamondsScene,
    SavesScene,
    GameScene,
    UIScene,
  ],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

const game = new Phaser.Game(config);

window.addEventListener('error', (event) => {
  console.error('Game error:', event.error);
});

export default game;
