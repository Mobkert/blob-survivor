import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../data/constants.js';
import {
  getQuestBoard,
  getQuestStockInfo,
  claimQuest,
  loadMeta,
  ensureQuestRestock,
} from '../data/meta.js';
import {
  QUEST_DIFFICULTIES,
  questIsComplete,
  formatRestockCountdown,
} from '../data/quests.js';
import { Music } from '../systems/MusicManager.js';

export class QuestBoardScene extends Phaser.Scene {
  constructor() {
    super('QuestBoardScene');
  }

  create() {
    Music.play('jazz');
    ensureQuestRestock();
    this.buildWoodBackground();

    this.add
      .text(GAME_WIDTH / 2, 42, 'Quest Board', {
        fontFamily: 'Georgia, serif',
        fontSize: '44px',
        color: '#f5e6c8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.balanceText = this.add
      .text(GAME_WIDTH / 2, 90, '', {
        fontFamily: 'Arial',
        fontSize: '17px',
        color: '#ffd76a',
      })
      .setOrigin(0.5);

    this.stockText = this.add
      .text(GAME_WIDTH / 2, 118, '', {
        fontFamily: 'Arial',
        fontSize: '15px',
        color: '#d2b48c',
      })
      .setOrigin(0.5);

    this.createLeaveButton();
    this.createBoard();
    this.refreshQuests();
    this.refreshHeader();

    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        const before = getQuestStockInfo();
        ensureQuestRestock();
        const after = getQuestStockInfo();
        if (before.restockAt !== after.restockAt || before.replacementsLeft !== after.replacementsLeft) {
          this.refreshQuests();
        }
        this.refreshHeader();
      },
    });
  }

  refreshHeader() {
    const meta = loadMeta();
    this.balanceText?.setText(
      `Diamonds: ${meta.diamonds}  ·  Free rolls: ${meta.freeForgeRolls || 0}n / ${meta.freeLuckyForgeRolls || 0}◆`,
    );
    const stock = getQuestStockInfo();
    const countdown = formatRestockCountdown(stock.restockAt);
    this.stockText?.setText(
      `Replacements left: ${stock.replacementsLeft}/${stock.maxReplacements}  ·  Auto-restock in ${countdown || '0:00'}`,
    );
  }

  buildWoodBackground() {
    const plankColors = [0x8b5a2b, 0x7a4a22, 0x9a6a3a, 0x6e3f1a, 0xa07440];
    const plankH = 48;
    for (let y = 0; y < GAME_HEIGHT; y += plankH) {
      const color = plankColors[(y / plankH) % plankColors.length];
      this.add.rectangle(GAME_WIDTH / 2, y + plankH / 2, GAME_WIDTH, plankH, color, 1);
      this.add.rectangle(GAME_WIDTH / 2, y + plankH - 2, GAME_WIDTH, 3, 0x4a2c12, 0.55);
      for (let i = 0; i < 6; i++) {
        const x = 40 + i * 220 + ((y / plankH) % 2) * 40;
        this.add.rectangle(x, y + 14, 18, 4, 0x5a3818, 0.35);
      }
    }
  }

  createLeaveButton() {
    const bg = this.add
      .rectangle(110, 48, 160, 44, 0x3a2210, 1)
      .setStrokeStyle(3, 0xffe8b0)
      .setInteractive({ useHandCursor: true })
      .setDepth(20);
    this.add
      .text(110, 48, 'Leave', {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#fff4dd',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(21);

    bg.on('pointerover', () => bg.setFillStyle(0x5a3a1a));
    bg.on('pointerout', () => bg.setFillStyle(0x3a2210));
    bg.on('pointerdown', () => this.scene.start('MenuScene'));
  }

  createBoard() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 + 46;
    const boardW = 900;
    const boardH = 480;

    this.add
      .rectangle(cx, cy, boardW, boardH, 0x6b4423, 1)
      .setStrokeStyle(5, 0x3d2412)
      .setDepth(5);
    this.add
      .rectangle(cx, cy, boardW - 20, boardH - 20, 0x8b5a2b, 1)
      .setStrokeStyle(3, 0xc4a574)
      .setDepth(6);

    [
      [cx - boardW / 2 + 18, cy - boardH / 2 + 18],
      [cx + boardW / 2 - 18, cy - boardH / 2 + 18],
      [cx - boardW / 2 + 18, cy + boardH / 2 - 18],
      [cx + boardW / 2 - 18, cy + boardH / 2 - 18],
    ].forEach(([x, y]) => this.add.circle(x, y, 5, 0xd4c4a0, 1).setDepth(7));

    this.boardCx = cx;
    this.boardCy = cy;
    this.questCardNodes = [];
  }

  refreshQuests() {
    (this.questCardNodes || []).forEach((n) => n.destroy(true));
    this.questCardNodes = [];

    const quests = getQuestBoard();
    const gap = 280;
    const startX = this.boardCx - gap;
    quests.forEach((quest, i) => {
      const card = this.buildQuestCard(quest, startX + i * gap, this.boardCy + 10);
      this.questCardNodes.push(card);
    });
  }

  buildQuestCard(quest, x, y) {
    const card = this.add.container(x, y).setDepth(10);
    const diff = QUEST_DIFFICULTIES[quest.difficulty] || QUEST_DIFFICULTIES.easy;
    const empty = !!quest.empty;
    const done = questIsComplete(quest);

    const bg = this.add
      .rectangle(0, 0, 250, 320, empty ? 0x3a2a18 : 0xf0e0c0, empty ? 0.85 : 0.97)
      .setStrokeStyle(3, empty ? 0x6a5030 : done ? 0x66aa44 : 0x8a6230);

    if (empty) {
      const title = this.add
        .text(0, -40, 'Sold Out', {
          fontFamily: 'Georgia, serif',
          fontSize: '26px',
          color: '#c4a574',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      const desc = this.add
        .text(0, 20, 'Restock after the timer.', {
          fontFamily: 'Arial',
          fontSize: '15px',
          color: '#a08060',
          align: 'center',
          wordWrap: { width: 200 },
        })
        .setOrigin(0.5);
      card.add([bg, title, desc]);
      return card;
    }

    const diffLabel = this.add
      .text(0, -130, diff.label.toUpperCase(), {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: diff.color,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const title = this.add
      .text(0, -100, quest.title, {
        fontFamily: 'Georgia, serif',
        fontSize: '22px',
        color: '#3a2810',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const desc = this.add
      .text(0, -40, quest.description, {
        fontFamily: 'Arial',
        fontSize: '15px',
        color: '#5a4030',
        align: 'center',
        wordWrap: { width: 210 },
      })
      .setOrigin(0.5);

    const progress = Math.min(quest.progress, quest.target);
    const barW = 200;
    const barBg = this.add.rectangle(0, 50, barW, 16, 0x3a2810, 0.35);
    const fillW = Math.max(4, (progress / quest.target) * barW);
    const barFill = this.add
      .rectangle(-barW / 2, 50, fillW, 16, done ? 0x66aa44 : 0xc4a050, 1)
      .setOrigin(0, 0.5);

    const progText = this.add
      .text(0, 78, `${progress} / ${quest.target}`, {
        fontFamily: 'Arial',
        fontSize: '15px',
        color: '#6a5030',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const reward = this.add
      .text(0, 110, quest.label, {
        fontFamily: 'Arial',
        fontSize: '15px',
        color: '#7a5020',
      })
      .setOrigin(0.5);

    card.add([bg, diffLabel, title, desc, barBg, barFill, progText, reward]);

    if (done) {
      const claimBg = this.add
        .rectangle(0, 150, 140, 40, 0x3a6a28, 1)
        .setStrokeStyle(2, 0xb8e088)
        .setInteractive({ useHandCursor: true });
      const claimText = this.add
        .text(0, 150, 'CLAIM', {
          fontFamily: 'Arial',
          fontSize: '18px',
          color: '#e8ffe0',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      claimBg.on('pointerover', () => claimBg.setFillStyle(0x4a8a38));
      claimBg.on('pointerout', () => claimBg.setFillStyle(0x3a6a28));
      claimBg.on('pointerdown', () => {
        const result = claimQuest(quest.id);
        if (result) {
          this.showToast(`Claimed: ${result.label}`);
          this.refreshQuests();
          this.refreshHeader();
        }
      });
      card.add([claimBg, claimText]);
    }

    return card;
  }

  showToast(msg) {
    const t = this.add
      .text(GAME_WIDTH / 2, 160, msg, {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffe14a',
        fontStyle: 'bold',
        stroke: '#3a2a00',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(50)
      .setAlpha(0);
    this.tweens.add({
      targets: t,
      alpha: 1,
      y: 150,
      duration: 220,
      yoyo: true,
      hold: 1200,
      onComplete: () => t.destroy(),
    });
  }
}
