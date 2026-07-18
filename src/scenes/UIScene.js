import Phaser from 'phaser';
import { xpToNextLevel } from '../data/constants.js';
import { getPowerup } from '../data/powerups.js';
import { loadMeta } from '../data/meta.js';
import { isPremiumShopCard } from '../data/shop.js';

export class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create() {
    this.gameScene = this.scene.get('GameScene');
    this.runCoins = 0;

    this.cardPickGroup = this.add.container(0, 0).setScrollFactor(0).setDepth(500).setVisible(false);
    this.cardPickPanels = [];
    this.cardPickCallback = null;

    this.hpBarBg = this.add.rectangle(20, 20, 204, 18, 0x222222).setOrigin(0, 0).setScrollFactor(0).setDepth(100);
    this.hpBar = this.add.rectangle(22, 22, 200, 14, 0x44cc66).setOrigin(0, 0).setScrollFactor(0).setDepth(101);
    this.hpText = this.add.text(22, 42, 'HP', { fontFamily: 'Arial', fontSize: '14px', color: '#ffffff' }).setScrollFactor(0).setDepth(102);

    this.xpBarBg = this.add.rectangle(20, 62, 204, 14, 0x222222).setOrigin(0, 0).setScrollFactor(0).setDepth(100);
    this.xpBar = this.add.rectangle(22, 64, 0, 10, 0x44aaff).setOrigin(0, 0).setScrollFactor(0).setDepth(101);
    this.levelText = this.add.text(230, 60, 'Lv 1', { fontFamily: 'Arial', fontSize: '14px', color: '#aaccff' }).setScrollFactor(0).setDepth(102);

    this.waveText = this.add.text(640, 20, 'Wave 1', { fontFamily: 'Arial', fontSize: '24px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(102);
    this.weaponText = this.add.text(20, 90, 'Weapon: None', { fontFamily: 'Arial', fontSize: '14px', color: '#ddddaa' }).setScrollFactor(0).setDepth(102);
    this.shieldText = this.add.text(20, 110, 'Shield: Ready', { fontFamily: 'Arial', fontSize: '13px', color: '#88ccff' }).setScrollFactor(0).setDepth(102);
    this.attackText = this.add.text(20, 130, 'Q: —', { fontFamily: 'Arial', fontSize: '13px', color: '#ffcc88' }).setScrollFactor(0).setDepth(102);
    this.coinText = this.add.text(20, 150, 'Coins: 0', { fontFamily: 'Arial', fontSize: '14px', color: '#ffd76a' }).setScrollFactor(0).setDepth(102);

    this.bossBarBg = this.add.rectangle(640, 58, 504, 22, 0x221111).setScrollFactor(0).setDepth(100).setVisible(false);
    this.bossBar = this.add.rectangle(640, 58, 500, 18, 0xcc3344).setScrollFactor(0).setDepth(101).setVisible(false);
    this.bossNameText = this.add
      .text(640, 36, 'Goblin King', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffcc88',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(102)
      .setVisible(false);
    this.bossMessage = this.add
      .text(640, 88, '', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#88ccff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(102);

    this.activeBoss = null;

    this.lifeIcons = [];
    for (let i = 0; i < 3; i++) {
      const heart = this.add.text(1140 - i * 28, 20, '♥', {
        fontFamily: 'Arial',
        fontSize: '28px',
        color: '#ff4466',
      }).setScrollFactor(0).setDepth(102);
      this.lifeIcons.push(heart);
    }

    this.createPauseButton();
    this.createPauseMenu();

    this.gameOverGroup = this.add.container(640, 360).setScrollFactor(0).setDepth(300).setVisible(false);
    const goBg = this.add.rectangle(0, 0, 480, 280, 0x111811, 0.95).setStrokeStyle(2, 0x66aa66);
    this.gameOverTitle = this.add.text(0, -90, 'Game Over', { fontFamily: 'Arial', fontSize: '42px', color: '#ff6666', fontStyle: 'bold' }).setOrigin(0.5);
    this.gameOverStats = this.add.text(0, -10, '', { fontFamily: 'Arial', fontSize: '20px', color: '#cccccc', align: 'center' }).setOrigin(0.5);
    const retryBtn = this.add.rectangle(-110, 80, 180, 48, 0x2a5a28).setStrokeStyle(2, 0x66aa66).setInteractive({ useHandCursor: true });
    const retryText = this.add.text(-110, 80, 'Play Again', { fontFamily: 'Arial', fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);
    const menuBtn = this.add.rectangle(110, 80, 180, 48, 0x3a3a28).setStrokeStyle(2, 0xaaaa66).setInteractive({ useHandCursor: true });
    const menuText = this.add.text(110, 80, 'Menu', { fontFamily: 'Arial', fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);

    retryBtn.on('pointerdown', () => {
      this.gameOverGroup.setVisible(false);
      this.hideCardPick();
      this.scene.stop('GameScene');
      this.scene.stop('UIScene');
      this.scene.launch('UIScene');
      this.scene.start('GameScene');
    });
    menuBtn.on('pointerdown', () => {
      this.gameOverGroup.setVisible(false);
      this.hideCardPick();
      this.scene.stop('GameScene');
      this.scene.stop('UIScene');
      this.scene.start('MenuScene');
    });
    this.gameOverGroup.add([goBg, this.gameOverTitle, this.gameOverStats, retryBtn, retryText, menuBtn, menuText]);

    this.gameScene.events.on('hud-update', () => this.refreshHud());
    this.gameScene.events.on('game-over', (data) => this.showGameOver(data));
    this.gameScene.events.on('coins-collected', (amount) => {
      this.runCoins += amount;
      this.refreshHud();
    });
    this.gameScene.events.on('boss-spawned', (boss) => this.showBossBar(boss));
    this.gameScene.events.on('boss-hp', (boss) => this.updateBossBar(boss));
    this.gameScene.events.on('boss-defeated', () => this.hideBossBar());
    this.gameScene.events.on('boss-message', (text) => {
      this.bossMessage.setText(text || '');
      if (text) {
        this.time.delayedCall(2500, () => {
          if (this.bossMessage.text === text && !String(text).includes('stunned')) {
            this.bossMessage.setText('');
          }
        });
      }
    });
    this.gameScene.events.on('boss-stunned', () => {
      this.bossMessage.setText('The Goblin King is stunned!');
      this.bossMessage.setColor('#88ccff');
    });
    this.gameScene.events.on('game-paused', () => this.showPauseMenu());
    this.gameScene.events.on('game-unpaused', () => this.hidePauseMenu());
  }

  createPauseButton() {
    this.pauseBtn = this.add
      .rectangle(1225, 34, 88, 36, 0x2a3a48)
      .setStrokeStyle(2, 0x88aacc)
      .setScrollFactor(0)
      .setDepth(110)
      .setInteractive({ useHandCursor: true });
    this.pauseBtnLabel = this.add
      .text(1225, 34, 'Pause', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#d8e8ff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(111);

    this.pauseBtn.on('pointerover', () => this.pauseBtn.setFillStyle(0x3a5060));
    this.pauseBtn.on('pointerout', () => this.pauseBtn.setFillStyle(0x2a3a48));
    this.pauseBtn.on('pointerdown', () => {
      this.gameScene?.togglePause?.();
    });
  }

  createPauseMenu() {
    this.pauseMenuGroup = this.add.container(640, 360).setScrollFactor(0).setDepth(400).setVisible(false);

    const dim = this.add.rectangle(0, 0, 1280, 720, 0x000000, 0.65);
    const panel = this.add.rectangle(0, 0, 420, 260, 0x111811, 0.96).setStrokeStyle(2, 0x66aa66);
    const title = this.add
      .text(0, -70, 'Game Pause', {
        fontFamily: 'Arial',
        fontSize: '40px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const unpauseBtn = this.add
      .rectangle(0, 10, 220, 48, 0x2a5a28)
      .setStrokeStyle(2, 0x66aa66)
      .setInteractive({ useHandCursor: true });
    const unpauseText = this.add
      .text(0, 10, 'Unpause', {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const menuBtn = this.add
      .rectangle(0, 80, 220, 48, 0x3a3a28)
      .setStrokeStyle(2, 0xaaaa66)
      .setInteractive({ useHandCursor: true });
    const menuText = this.add
      .text(0, 80, 'Return to Menu', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    unpauseBtn.on('pointerover', () => unpauseBtn.setFillStyle(0x3a7a38));
    unpauseBtn.on('pointerout', () => unpauseBtn.setFillStyle(0x2a5a28));
    unpauseBtn.on('pointerdown', () => this.gameScene?.unpauseGame?.());

    menuBtn.on('pointerover', () => menuBtn.setFillStyle(0x5a5a38));
    menuBtn.on('pointerout', () => menuBtn.setFillStyle(0x3a3a28));
    menuBtn.on('pointerdown', () => {
      this.hidePauseMenu();
      this.hideCardPick();
      this.gameScene?.returnToMenuFromPause?.();
    });

    this.pauseMenuGroup.add([dim, panel, title, unpauseBtn, unpauseText, menuBtn, menuText]);
  }

  showPauseMenu() {
    if (this.gameOverGroup.visible) return;
    this.pauseMenuGroup.setVisible(true);
  }

  hidePauseMenu() {
    this.pauseMenuGroup.setVisible(false);
  }

  showBossBar(boss) {
    this.activeBoss = boss;
    this.bossBarBg.setVisible(true);
    this.bossBar.setVisible(true);
    this.bossNameText.setVisible(true);
    this.bossNameText.setText(boss.enemyData?.name || 'Boss');
    this.updateBossBar(boss);
  }

  updateBossBar(boss) {
    if (!boss || !boss.active) {
      this.hideBossBar();
      return;
    }
    const ratio = Math.max(0, boss.hp / boss.maxHp);
    this.bossBar.width = 500 * ratio;
    this.bossBar.setFillStyle(ratio > 0.5 ? 0xcc3344 : ratio > 0.25 ? 0xcc8844 : 0xaa2222);
  }

  hideBossBar() {
    this.activeBoss = null;
    this.bossBarBg.setVisible(false);
    this.bossBar.setVisible(false);
    this.bossNameText.setVisible(false);
    this.bossMessage.setText('');
  }

  showCardPick(cards, title, onSelect) {
    this.hideCardPick();
    this.cardPickCallback = onSelect;
    this.cardPickGroup.setVisible(true);

    const width = 1280;
    const height = 720;
    const cardWidth = 260;
    const cardHeight = 320;
    const gap = 40;
    const totalWidth = cardWidth * cards.length + gap * (cards.length - 1);
    const startX = (width - totalWidth) / 2 + cardWidth / 2;
    const cardY = height / 2 + 20;

    const overlay = this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    this.cardPickGroup.add(overlay);

    const titleText = this.add
      .text(width / 2, 80, title, {
        fontFamily: 'Arial',
        fontSize: '36px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.cardPickGroup.add(titleText);

    cards.forEach((card, index) => {
      const x = startX + index * (cardWidth + gap);
      this.createCardPanel(x, cardY, cardWidth, cardHeight, card);
    });
  }

  createCardPanel(x, y, w, h, card) {
    const premium = isPremiumShopCard(card);
    const fill = premium ? 0x14081f : 0x1a2a18;
    const hover = premium ? 0x221433 : 0x243824;
    const stroke = premium ? 0xffd24a : card.color || 0x88aa88;

    if (premium) {
      const glow = this.add.ellipse(x, y, w + 24, h + 24, 0xffaa33, 0.12);
      this.cardPickGroup.add(glow);
    }

    const bg = this.add
      .rectangle(x, y, w, h, fill, 0.98)
      .setStrokeStyle(premium ? 4 : 3, stroke)
      .setInteractive({ useHandCursor: true });

    if (premium) {
      const sheen = this.add.rectangle(x, y - h * 0.32, w - 12, h * 0.28, 0xffcc66, 0.1);
      const tag = this.add
        .text(x, y - h / 2 + 18, '✦ PREMIUM', {
          fontFamily: 'Arial',
          fontSize: '12px',
          color: '#ffd76a',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      this.cardPickGroup.add([sheen, tag]);
    }

    const icon = this.add.circle(x, y - 80, 36, card.color || 0xffffff, 1);
    const name = this.add
      .text(x, y - 10, card.name, {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: premium ? '#ffe9b0' : '#ffffff',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: w - 24 },
      })
      .setOrigin(0.5);

    const categoryLabel = card.category ? card.category : card.type;
    const category = this.add
      .text(x, y + 20, `[${categoryLabel}]`, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: premium ? '#e0c878' : '#aaccaa',
      })
      .setOrigin(0.5);

    const desc = this.add
      .text(x, y + 70, card.description, {
        fontFamily: 'Arial',
        fontSize: '15px',
        color: premium ? '#f0e0b8' : '#ddeedd',
        align: 'center',
        wordWrap: { width: w - 30 },
      })
      .setOrigin(0.5);

    bg.on('pointerover', () => bg.setFillStyle(hover, 0.98));
    bg.on('pointerout', () => bg.setFillStyle(fill, 0.98));
    bg.on('pointerdown', () => {
      if (this.cardPickCallback) this.cardPickCallback(card);
    });

    this.cardPickGroup.add([bg, icon, name, category, desc]);
    this.cardPickPanels.push(bg);
  }

  hideCardPick() {
    this.cardPickCallback = null;
    this.cardPickGroup.removeAll(true);
    this.cardPickPanels = [];
    this.cardPickGroup.setVisible(false);
  }

  refreshHud() {
    const gs = this.gameScene;
    if (!gs?.player) return;

    const player = gs.player;
    const state = gs.playerState;
    const hpRatio = Math.max(0, player.hp / player.maxHp);
    this.hpBar.width = 200 * hpRatio;
    this.hpBar.fillColor = hpRatio > 0.5 ? 0x44cc66 : hpRatio > 0.25 ? 0xcccc44 : 0xcc4444;
    this.hpText.setText(`HP ${Math.ceil(player.hp)} / ${player.maxHp}`);

    const needed = xpToNextLevel(state.level);
    const xpRatio = state.xp / needed;
    this.xpBar.width = 200 * xpRatio;
    this.levelText.setText(`Lv ${state.level}`);

    this.waveText.setText(`Wave ${gs.waveManager?.currentWave || 1}`);

    const weaponName = state.weapon ? state.weapon.name : 'None';
    this.weaponText.setText(`Weapon: ${weaponName}`);

    const shieldCd = player.getShieldCooldownRemaining(gs.time.now);
    if (player.shieldActive) {
      this.shieldText.setText('Shield: ACTIVE');
      this.shieldText.setColor('#aaddff');
    } else if (shieldCd > 0) {
      this.shieldText.setText(`Shield: ${(shieldCd / 1000).toFixed(1)}s`);
      this.shieldText.setColor('#667788');
    } else {
      this.shieldText.setText('Shield: Ready (RMB)');
      this.shieldText.setColor('#88ccff');
    }

    if (state.attackPowerup) {
      const pu = getPowerup(state.attackPowerup);
      const cd = player.getAttackCooldownRemaining(gs.time.now);
      const name = pu?.name || state.attackPowerup;
      this.attackText.setText(cd > 0 ? `Q: ${name} (${(cd / 1000).toFixed(1)}s)` : `Q: ${name} Ready`);
    } else {
      this.attackText.setText(state.fortune ? 'Fortune ready' : 'Q: —');
    }

    this.coinText.setText(`Coins: ${loadMeta().coins} (+${this.runCoins})`);

    const lives = gs.lives ?? 3;
    this.lifeIcons.forEach((icon, i) => {
      icon.setAlpha(i < lives ? 1 : 0.25);
    });

    const boss = gs.waveManager?.activeBoss;
    if (boss?.active && !boss.isDying) {
      if (!this.bossBarBg.visible) this.showBossBar(boss);
      else this.updateBossBar(boss);
    } else if (this.bossBarBg.visible) {
      this.hideBossBar();
    }
  }

  showGameOver(data) {
    this.hidePauseMenu();
    this.gameOverStats.setText(`Reached Wave ${data.wave}\nLevel ${data.level}\nCoins banked: ${loadMeta().coins}`);
    this.gameOverGroup.setVisible(true);
  }

  update() {
    if (this.gameScene?.gameState === 'game_over') return;
    if (this.gameScene?.gameState === 'paused') return;
    this.refreshHud();
  }
}
