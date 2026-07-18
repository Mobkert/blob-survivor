import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../data/constants.js';
import { LevelList } from '../data/levels.js';
import { Music } from '../systems/MusicManager.js';

export class LevelsScene extends Phaser.Scene {
  constructor() {
    super('LevelsScene');
  }

  create() {
    Music.play('chill');
    this.selectedId = 'plains';

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x142010);

    this.add
      .text(GAME_WIDTH / 2, 42, 'Levels', {
        fontFamily: 'Arial',
        fontSize: '42px',
        color: '#88ff88',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 82, 'Choose a battlefield', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#aacdaa',
      })
      .setOrigin(0.5);

    this.cardNodes = [];
    this.buildLevelGrid();
    this.buildDetailPanel();
    this.createBackButton();
    this.refreshSelection();
  }

  buildLevelGrid() {
    const cols = 4;
    const cardW = 200;
    const cardH = 160;
    const gapX = 24;
    const gapY = 20;
    const startX = (GAME_WIDTH - (cols * cardW + (cols - 1) * gapX)) / 2 + cardW / 2;
    const startY = 180;

    LevelList.forEach((level, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);
      this.cardNodes.push(this.createLevelCard(x, y, cardW, cardH, level));
    });
  }

  createLevelCard(x, y, w, h, level) {
    const locked = !level.available;
    const container = this.add.container(x, y);

    const bg = this.add
      .rectangle(0, 0, w, h, locked ? 0x1a1a1a : 0x1a2e18, 1)
      .setStrokeStyle(3, locked ? 0x555555 : level.accent);

    const icon = this.add
      .image(0, -28, level.icon)
      .setDisplaySize(72, 72)
      .setAlpha(locked ? 0.45 : 1);

    const name = this.add
      .text(0, 36, level.name, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: locked ? '#888888' : '#e8ffe8',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: w - 16 },
      })
      .setOrigin(0.5);

    const badge = this.add
      .text(0, 58, locked ? 'COMING SOON' : 'AVAILABLE', {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: locked ? '#999999' : '#88cc88',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    container.add([bg, icon, name, badge]);
    container.setData('levelId', level.id);
    container.setData('bg', bg);

    if (!locked) {
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => {
        if (this.selectedId !== level.id) bg.setFillStyle(0x243824);
      });
      bg.on('pointerout', () => this.refreshSelection());
      bg.on('pointerdown', () => {
        this.selectedId = level.id;
        this.refreshSelection();
      });
    }

    return container;
  }

  buildDetailPanel() {
    this.detailName = this.add
      .text(GAME_WIDTH / 2, 520, '', {
        fontFamily: 'Arial',
        fontSize: '26px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.detailDesc = this.add
      .text(GAME_WIDTH / 2, 555, '', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#aacdaa',
        align: 'center',
        wordWrap: { width: 700 },
      })
      .setOrigin(0.5);

    this.playBtn = this.add
      .rectangle(GAME_WIDTH / 2, 620, 220, 52, 0x2a5a28)
      .setStrokeStyle(2, 0x66aa66)
      .setInteractive({ useHandCursor: true });
    this.playText = this.add
      .text(GAME_WIDTH / 2, 620, 'Play', {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.playBtn.on('pointerover', () => {
      if (this.playBtn.input?.enabled) this.playBtn.setFillStyle(0x3a7a38);
    });
    this.playBtn.on('pointerout', () => {
      if (this.playBtn.input?.enabled) this.playBtn.setFillStyle(0x2a5a28);
    });
    this.playBtn.on('pointerdown', () => this.startSelectedLevel());
  }

  refreshSelection() {
    const selected = LevelList.find((l) => l.id === this.selectedId) || LevelList[0];

    this.cardNodes.forEach((card) => {
      const id = card.getData('levelId');
      const bg = card.getData('bg');
      const level = LevelList.find((l) => l.id === id);
      if (!level?.available) {
        bg.setFillStyle(0x1a1a1a);
        bg.setStrokeStyle(3, 0x555555);
        return;
      }
      if (id === this.selectedId) {
        bg.setFillStyle(0x2a4a28);
        bg.setStrokeStyle(3, 0xaaff88);
      } else {
        bg.setFillStyle(0x1a2e18);
        bg.setStrokeStyle(3, level.accent);
      }
    });

    this.detailName.setText(selected.name);
    this.detailDesc.setText(
      selected.available
        ? `${selected.description}  ·  ${selected.maxWaves} waves`
        : selected.description,
    );

    if (selected.available) {
      this.playBtn.setFillStyle(0x2a5a28);
      this.playBtn.setStrokeStyle(2, 0x66aa66);
      this.playBtn.setInteractive({ useHandCursor: true });
      this.playText.setColor('#ffffff');
      this.playText.setText('Play');
    } else {
      this.playBtn.disableInteractive();
      this.playBtn.setFillStyle(0x333333);
      this.playBtn.setStrokeStyle(2, 0x555555);
      this.playText.setColor('#777777');
      this.playText.setText('Coming Soon');
    }
  }

  startSelectedLevel() {
    const selected = LevelList.find((l) => l.id === this.selectedId);
    if (!selected?.available) return;

    if (this.scene.isActive('UIScene')) {
      this.scene.stop('UIScene');
    }

    this.scene.start('LoadingScene', {
      durationMs: 3000,
      nextScene: 'GameScene',
      launchScenes: ['UIScene'],
      levelId: selected.id,
    });
  }

  createBackButton() {
    const bg = this.add
      .rectangle(90, GAME_HEIGHT - 48, 140, 44, 0x2a5a28)
      .setStrokeStyle(2, 0x66aa66)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(90, GAME_HEIGHT - 48, 'Back', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    bg.on('pointerover', () => bg.setFillStyle(0x3a7a38));
    bg.on('pointerout', () => bg.setFillStyle(0x2a5a28));
    bg.on('pointerdown', () => this.scene.start('MenuScene'));
  }
}
