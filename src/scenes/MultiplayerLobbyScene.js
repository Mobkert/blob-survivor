import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../data/constants.js';
import { isLevelUnlocked, getLevel } from '../data/levels.js';
import { loadMeta } from '../data/meta.js';
import { Music } from '../systems/MusicManager.js';
import {
  NetplayManager,
  generateRoomCode,
  setActiveNetplay,
  clearActiveNetplay,
} from '../systems/NetplayManager.js';

export class MultiplayerLobbyScene extends Phaser.Scene {
  constructor() {
    super('MultiplayerLobbyScene');
  }

  init(data = {}) {
    this.levelId = data.levelId || 'plains';
  }

  create() {
    Music.play('chill');
    clearActiveNetplay();
    this._launched = false;

    const completed = loadMeta().completedLevels || [];
    const level = getLevel(this.levelId);
    if (!isLevelUnlocked(level, completed)) {
      this.levelId = 'plains';
    }

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x101828);
    this.add
      .text(GAME_WIDTH / 2, 56, 'Multiplayer', {
        fontFamily: 'Arial',
        fontSize: '40px',
        color: '#88aaff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 100, `Level: ${getLevel(this.levelId).name}  ·  Co-op (shared HP & level)`, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#aaccdd',
      })
      .setOrigin(0.5);

    this.statusText = this.add
      .text(GAME_WIDTH / 2, 150, 'Host a room or join with a code.', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ccddee',
        align: 'center',
      })
      .setOrigin(0.5);

    this.codeDisplay = this.add
      .text(GAME_WIDTH / 2, 210, '', {
        fontFamily: 'Arial',
        fontSize: '48px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.errorText = this.add
      .text(GAME_WIDTH / 2, 270, '', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ff8888',
        align: 'center',
        wordWrap: { width: 700 },
      })
      .setOrigin(0.5);

    this.createButton(GAME_WIDTH / 2 - 140, 360, 240, 52, 0x2a5a9a, 'Host Game', () => this.startHost());
    this.createButton(GAME_WIDTH / 2 + 140, 360, 240, 52, 0x2a6a7a, 'Join Game', () => this.showJoin());

    this.joinPanel = this.add.container(GAME_WIDTH / 2, 480).setVisible(false);
    const joinBg = this.add.rectangle(0, 0, 420, 140, 0x1a2438, 0.95).setStrokeStyle(2, 0x6688cc);
    this.joinInputLabel = this.add
      .text(0, -40, 'Enter 4-character code', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#aaccff',
      })
      .setOrigin(0.5);
    this.joinCodeText = this.add
      .text(0, 0, '', {
        fontFamily: 'Arial',
        fontSize: '36px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const connectBtn = this.add
      .rectangle(0, 48, 160, 40, 0x2a5a9a)
      .setStrokeStyle(2, 0x6688cc)
      .setInteractive({ useHandCursor: true });
    const connectLabel = this.add
      .text(0, 48, 'Connect', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    connectBtn.on('pointerdown', () => this.startJoin());
    this.joinPanel.add([joinBg, this.joinInputLabel, this.joinCodeText, connectBtn, connectLabel]);

    this.joinBuffer = '';
    this.input.keyboard.on('keydown', (event) => {
      if (!this.joinPanel.visible) return;
      const key = event.key;
      if (key === 'Backspace') {
        this.joinBuffer = this.joinBuffer.slice(0, -1);
        this.refreshJoinCode();
        return;
      }
      if (key === 'Enter') {
        this.startJoin();
        return;
      }
      if (/^[a-zA-Z0-9]$/.test(key) && this.joinBuffer.length < 4) {
        this.joinBuffer += key.toUpperCase();
        this.refreshJoinCode();
      }
    });

    this.createButton(90, GAME_HEIGHT - 48, 140, 44, 0x2a5a28, 'Back', () => {
      clearActiveNetplay();
      this.scene.start('LevelsScene');
    });

    this.busy = false;
  }

  createButton(x, y, w, h, color, label, onClick) {
    const bg = this.add
      .rectangle(x, y, w, h, color)
      .setStrokeStyle(2, 0x88aadd)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, label, {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    bg.on('pointerover', () => bg.setFillStyle(Phaser.Display.Color.IntegerToColor(color).brighten(20).color));
    bg.on('pointerout', () => bg.setFillStyle(color));
    bg.on('pointerdown', () => {
      if (!this.busy) onClick();
    });
    return bg;
  }

  refreshJoinCode() {
    this.joinCodeText.setText(this.joinBuffer.padEnd(4, '_').split('').join(' '));
  }

  showJoin() {
    this.errorText.setText('');
    this.codeDisplay.setText('');
    this.statusText.setText('Type the host’s room code, then Connect.');
    this.joinPanel.setVisible(true);
    this.joinBuffer = '';
    this.refreshJoinCode();
  }

  async startHost() {
    if (this.busy) return;
    this.busy = true;
    this.joinPanel.setVisible(false);
    this.errorText.setText('');
    const code = generateRoomCode();
    this.codeDisplay.setText(code);
    this.statusText.setText('Waiting for a player to join…\nShare this code with your friend.');

    const net = new NetplayManager();
    setActiveNetplay(net);

    net.on('connected', () => {
      this.statusText.setText('Player joined! Starting…');
      this.time.delayedCall(600, () => this.launchCoop('host', net));
    });
    net.on('error', (err) => {
      this.errorText.setText(err?.message || 'Host error');
      this.busy = false;
    });
    net.on('disconnected', () => {
      this.errorText.setText('Guest disconnected.');
      this.busy = false;
    });

    try {
      await net.host(code, this.levelId);
    } catch (err) {
      this.errorText.setText(err?.message || 'Couldn’t create room. Try again.');
      clearActiveNetplay();
      this.busy = false;
      this.codeDisplay.setText('');
      this.statusText.setText('Host a room or join with a code.');
    }
  }

  async startJoin() {
    if (this.busy) return;
    if (this.joinBuffer.length !== 4) {
      this.errorText.setText('Enter the full 4-character code.');
      return;
    }
    this.busy = true;
    this.errorText.setText('');
    this.statusText.setText('Connecting…');

    const net = new NetplayManager();
    setActiveNetplay(net);

    net.on('message', (msg) => {
      if (msg?.type === 'hello' && msg.levelId) {
        this.levelId = msg.levelId;
        net.levelId = msg.levelId;
        this.statusText.setText('Connected! Starting…');
        this.time.delayedCall(400, () => this.launchCoop('guest', net));
      }
    });
    net.on('error', (err) => {
      this.errorText.setText(err?.message || 'Connection error');
      this.busy = false;
    });
    net.on('disconnected', () => {
      this.errorText.setText('Disconnected from host.');
      this.busy = false;
    });

    try {
      await net.join(this.joinBuffer);
      this.statusText.setText('Connected! Waiting for host…');
    } catch (err) {
      this.errorText.setText(err?.message || 'Couldn’t connect. Check the code.');
      clearActiveNetplay();
      this.busy = false;
    }
  }

  launchCoop(role, net) {
    if (this._launched) return;
    this._launched = true;
    if (this.scene.isActive('UIScene')) this.scene.stop('UIScene');
    this.scene.start('LoadingScene', {
      durationMs: 2500,
      nextScene: 'GameScene',
      launchScenes: ['UIScene'],
      levelId: net.levelId || this.levelId,
      multiplayer: {
        role,
        code: net.code,
      },
    });
  }
}
