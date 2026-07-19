import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../data/constants.js';
import { Levels, LevelList, getLevelLockLabel, isLevelUnlocked } from '../data/levels.js';
import { loadMeta, isUnlocked } from '../data/meta.js';
import { Music } from '../systems/MusicManager.js';

const SWAMP_RECOMMENDED_CARD_IDS = [
  'immortalCore',
  'reaperEdge',
  'eagleEye',
  'airstrike',
  'scavenger',
  'healPulse',
];

export class LevelsScene extends Phaser.Scene {
  constructor() {
    super('LevelsScene');
  }

  create() {
    Music.play('chill');
    this.completedLevels = loadMeta().completedLevels || [];
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
    const unlocked = isLevelUnlocked(level, this.completedLevels);
    const container = this.add.container(x, y);

    const bg = this.add
      .rectangle(0, 0, w, h, unlocked ? 0x1a2e18 : 0x1a1a1a, 1)
      .setStrokeStyle(3, unlocked ? level.accent : 0x555555);

    const iconKey =
      unlocked ||
      level.id === 'volcanic' ||
      level.id === 'tundra' ||
      level.id === 'swamp'
        ? level.icon
        : 'level_icon_locked';
    const icon = this.add
      .image(0, -28, this.textures.exists(iconKey) ? iconKey : 'level_icon_locked')
      .setDisplaySize(72, 72)
      .setAlpha(unlocked ? 1 : 0.45);

    const name = this.add
      .text(0, 36, level.name, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: unlocked ? '#e8ffe8' : '#888888',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: w - 16 },
      })
      .setOrigin(0.5);

    const badge = this.add
      .text(0, 58, getLevelLockLabel(level, this.completedLevels), {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: unlocked ? '#88cc88' : '#999999',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    container.add([bg, icon, name, badge]);
    container.setData('levelId', level.id);
    container.setData('bg', bg);
    container.setData('unlocked', unlocked);

    if (unlocked) {
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
      .text(GAME_WIDTH / 2, 548, '', {
        fontFamily: 'Arial',
        fontSize: '15px',
        color: '#aacdaa',
        align: 'center',
        wordWrap: { width: 720 },
      })
      .setOrigin(0.5);

    this.recommendText = this.add
      .text(GAME_WIDTH / 2, 588, '', {
        fontFamily: 'Arial',
        fontSize: '13px',
        color: '#ffe08a',
        align: 'center',
        wordWrap: { width: 780 },
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.playBtn = this.add
      .rectangle(GAME_WIDTH / 2, 628, 220, 48, 0x2a5a28)
      .setStrokeStyle(2, 0x66aa66)
      .setInteractive({ useHandCursor: true });
    this.playText = this.add
      .text(GAME_WIDTH / 2, 628, 'Play', {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.multiplayerBtn = this.add
      .rectangle(GAME_WIDTH / 2, 682, 220, 48, 0x2a4a8a)
      .setStrokeStyle(2, 0x6688cc)
      .setInteractive({ useHandCursor: true });
    this.multiplayerText = this.add
      .text(GAME_WIDTH / 2, 672, 'Multiplayer', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#e0ecff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.multiplayerSubtext = this.add
      .text(GAME_WIDTH / 2, 692, 'VERY BUGGY in ALPHA !!!', {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: '#ffaa66',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.multiplayerBtn.on('pointerover', () => this.multiplayerBtn.setFillStyle(0x3a5aaa));
    this.multiplayerBtn.on('pointerout', () => this.multiplayerBtn.setFillStyle(0x2a4a8a));
    this.multiplayerBtn.on('pointerdown', () => this.openMultiplayer());

    this.playBtn.on('pointerover', () => {
      if (this.playBtn.input?.enabled) {
        const selected = LevelList.find((l) => l.id === this.selectedId);
        this.playBtn.setFillStyle(this.accentFill(selected?.id, true));
      }
    });
    this.playBtn.on('pointerout', () => {
      if (this.playBtn.input?.enabled) {
        const selected = LevelList.find((l) => l.id === this.selectedId);
        this.playBtn.setFillStyle(this.accentFill(selected?.id, false));
      }
    });
    this.playBtn.on('pointerdown', () => this.startSelectedLevel());
  }

  accentFill(levelId, hover = false) {
    if (levelId === 'volcanic') return hover ? 0x8a3820 : 0x6a2818;
    if (levelId === 'tundra') return hover ? 0x3a6a8a : 0x2a4a68;
    if (levelId === 'swamp') return hover ? 0x3a6a38 : 0x2a4a28;
    return hover ? 0x3a7a38 : 0x2a5a28;
  }

  accentStroke(levelId) {
    if (levelId === 'volcanic') return 0xcc6644;
    if (levelId === 'tundra') return 0x66bbdd;
    if (levelId === 'swamp') return 0x66aa55;
    return 0x66aa66;
  }

  cardColors(levelId, selected) {
    if (levelId === 'volcanic') {
      return selected
        ? { fill: 0x4a2218, stroke: 0xff8866 }
        : { fill: 0x2a1810, stroke: Levels.volcanic.accent };
    }
    if (levelId === 'tundra') {
      return selected
        ? { fill: 0x183848, stroke: 0x88ddff }
        : { fill: 0x142830, stroke: Levels.tundra.accent };
    }
    if (levelId === 'swamp') {
      return selected
        ? { fill: 0x1a3820, stroke: 0x88cc66 }
        : { fill: 0x142818, stroke: Levels.swamp.accent };
    }
    return selected
      ? { fill: 0x2a4a28, stroke: 0xaaff88 }
      : { fill: 0x1a2e18, stroke: Levels.plains.accent };
  }

  refreshSelection() {
    const selected = LevelList.find((l) => l.id === this.selectedId) || LevelList[0];
    const selectedUnlocked = isLevelUnlocked(selected, this.completedLevels);

    this.cardNodes.forEach((card) => {
      const id = card.getData('levelId');
      const bg = card.getData('bg');
      const level = LevelList.find((l) => l.id === id);
      const unlocked = isLevelUnlocked(level, this.completedLevels);
      if (!unlocked) {
        bg.setFillStyle(0x1a1a1a);
        bg.setStrokeStyle(3, 0x555555);
        return;
      }
      if (id === this.selectedId) {
        const c = this.cardColors(level.id, true);
        bg.setFillStyle(c.fill);
        bg.setStrokeStyle(3, c.stroke);
      } else {
        const c = this.cardColors(level.id, false);
        bg.setFillStyle(c.fill);
        bg.setStrokeStyle(3, level.accent);
      }
    });

    this.detailName.setText(selected.name);
    if (selectedUnlocked) {
      const rewardBits = [];
      if (selected.clearGold) rewardBits.push(`+${selected.clearGold} gold`);
      if (selected.clearDiamonds) rewardBits.push(`+${selected.clearDiamonds} diamonds`);
      const rewardText = rewardBits.length ? `  ·  Clear: ${rewardBits.join(', ')}` : '';
      this.detailDesc.setText(`${selected.description}  ·  ${selected.maxWaves} waves${rewardText}`);
    } else if (selected.unlockAfter === 'plains') {
      this.detailDesc.setText('Complete Plains on this save slot to unlock Volcanic Ridge.');
    } else if (selected.unlockAfter === 'volcanic') {
      this.detailDesc.setText('Complete Volcanic Ridge on this save slot to unlock Frozen Tundra.');
    } else if (selected.unlockAfter === 'tundra') {
      this.detailDesc.setText('Complete Frozen Tundra on this save slot to unlock Murk Swamp.');
    } else {
      this.detailDesc.setText(selected.description);
    }

    if (selectedUnlocked && selected.id === 'swamp') {
      this.recommendText.setText(
        'Recommended: Immortal Core · Reaper Edge · Eagle Eye · Scavenger · Heal Pulse · Airstrike',
      );
      this.recommendText.setVisible(true);
    } else {
      this.recommendText.setText('');
      this.recommendText.setVisible(false);
    }

    if (selectedUnlocked) {
      this.playBtn.setFillStyle(this.accentFill(selected.id, false));
      this.playBtn.setStrokeStyle(2, this.accentStroke(selected.id));
      this.playBtn.setInteractive({ useHandCursor: true });
      this.playText.setColor('#ffffff');
      this.playText.setText('Play');
    } else {
      this.playBtn.disableInteractive();
      this.playBtn.setFillStyle(0x333333);
      this.playBtn.setStrokeStyle(2, 0x555555);
      this.playText.setColor('#777777');
      this.playText.setText(selected.comingSoon ? 'Coming Soon' : 'Locked');
    }
  }

  startSelectedLevel() {
    const selected = LevelList.find((l) => l.id === this.selectedId);
    if (!isLevelUnlocked(selected, this.completedLevels)) return;

    if (selected.id === 'swamp') {
      if (!this.hasSwampRecommendedLoadout()) {
        this.showSwampConfirm();
        return;
      }
    }

    this.beginLevel(selected.id);
  }

  hasSwampRecommendedLoadout() {
    return SWAMP_RECOMMENDED_CARD_IDS.every((id) => isUnlocked(id));
  }

  beginLevel(levelId) {
    if (this.scene.isActive('UIScene')) {
      this.scene.stop('UIScene');
    }

    this.scene.start('LoadingScene', {
      durationMs: 3000,
      nextScene: 'GameScene',
      launchScenes: ['UIScene'],
      levelId,
    });
  }

  showSwampConfirm() {
    if (this.swampConfirmGroup) {
      this.swampConfirmGroup.destroy(true);
      this.swampConfirmGroup = null;
    }

    const group = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(100);
    this.swampConfirmGroup = group;

    const dim = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65)
      .setInteractive();
    const panel = this.add
      .rectangle(0, 0, 620, 280, 0x142818, 1)
      .setStrokeStyle(3, 0x66aa55);

    const title = this.add
      .text(0, -96, 'Are you sure you want to continue?', {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: 560 },
      })
      .setOrigin(0.5);

    const body = this.add
      .text(
        0,
        -28,
        "It's recommended to have Immortal Core, Reaper Edge, Eagle Eye, Airstrike, Scavenger and Heal Pulse.",
        {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: '#ffe08a',
          align: 'center',
          wordWrap: { width: 540 },
        },
      )
      .setOrigin(0.5);

    const yesBtn = this.add
      .rectangle(-110, 88, 160, 48, 0x2a5a28)
      .setStrokeStyle(2, 0x66aa66)
      .setInteractive({ useHandCursor: true });
    const yesText = this.add
      .text(-110, 88, 'Continue', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const noBtn = this.add
      .rectangle(110, 88, 160, 48, 0x5a2a28)
      .setStrokeStyle(2, 0xaa6666)
      .setInteractive({ useHandCursor: true });
    const noText = this.add
      .text(110, 88, 'Go Back', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    yesBtn.on('pointerover', () => yesBtn.setFillStyle(0x3a7a38));
    yesBtn.on('pointerout', () => yesBtn.setFillStyle(0x2a5a28));
    yesBtn.on('pointerdown', () => {
      group.destroy(true);
      this.swampConfirmGroup = null;
      this.beginLevel('swamp');
    });

    noBtn.on('pointerover', () => noBtn.setFillStyle(0x7a3a38));
    noBtn.on('pointerout', () => noBtn.setFillStyle(0x5a2a28));
    noBtn.on('pointerdown', () => {
      group.destroy(true);
      this.swampConfirmGroup = null;
    });

    group.add([dim, panel, title, body, yesBtn, yesText, noBtn, noText]);
  }

  openMultiplayer() {
    const selected = LevelList.find((l) => l.id === this.selectedId);
    const levelId = isLevelUnlocked(selected, this.completedLevels) ? selected.id : 'plains';
    this.scene.start('MultiplayerLobbyScene', { levelId });
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
