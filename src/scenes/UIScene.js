import Phaser from 'phaser';
import { xpToNextLevel, GAME_WIDTH, GAME_HEIGHT } from '../data/constants.js';
import { getPowerup } from '../data/powerups.js';
import { loadMeta } from '../data/meta.js';
import { isPremiumShopCard } from '../data/shop.js';
import { clearActiveNetplay } from '../systems/NetplayManager.js';

const CONTINUE_PICK_COUNT = 4;

export class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create() {
    this.gameScene = this.scene.get('GameScene');
    this.runCoins = 0;
    this.pendingContinue = null;
    this.continueSelected = new Set();
    this.continuePickMode = false;
    this.damageGlowIntensity = 0;
    this.damageGlowGfx = this.add.graphics().setScrollFactor(0).setDepth(90);

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
    this.allyWeaponText = this.add
      .text(20, 108, '', { fontFamily: 'Arial', fontSize: '13px', color: '#ffcc88' })
      .setScrollFactor(0)
      .setDepth(102)
      .setVisible(false);
    this.coopText = this.add
      .text(640, 48, '', { fontFamily: 'Arial', fontSize: '14px', color: '#88aaff', fontStyle: 'bold' })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(102)
      .setVisible(false);
    this.shieldText = this.add.text(20, 128, 'Shield: Ready', { fontFamily: 'Arial', fontSize: '13px', color: '#88ccff' }).setScrollFactor(0).setDepth(102);
    this.attackText = this.add.text(20, 148, 'Q: —', { fontFamily: 'Arial', fontSize: '13px', color: '#ffcc88' }).setScrollFactor(0).setDepth(102);
    this.coinText = this.add.text(20, 168, 'Coins: 0', { fontFamily: 'Arial', fontSize: '14px', color: '#ffd76a' }).setScrollFactor(0).setDepth(102);

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

    this.waveCompleteText = this.add
      .text(640, 100, 'Wave Completed', {
        fontFamily: 'Arial',
        fontSize: '36px',
        color: '#a8ff88',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(120)
      .setAlpha(0);

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
    this.goBg = this.add.rectangle(0, 0, 520, 320, 0x111811, 0.95).setStrokeStyle(2, 0x66aa66);
    this.gameOverTitle = this.add.text(0, -110, 'Game Over', { fontFamily: 'Arial', fontSize: '42px', color: '#ff6666', fontStyle: 'bold' }).setOrigin(0.5);
    this.gameOverStats = this.add.text(0, -30, '', { fontFamily: 'Arial', fontSize: '18px', color: '#cccccc', align: 'center' }).setOrigin(0.5);
    const retryBtn = this.add.rectangle(-160, 95, 150, 48, 0x2a5a28).setStrokeStyle(2, 0x66aa66).setInteractive({ useHandCursor: true });
    const retryText = this.add.text(-160, 95, 'Play Again', { fontFamily: 'Arial', fontSize: '18px', color: '#ffffff' }).setOrigin(0.5);
    this.continueBtn = this.add.rectangle(0, 95, 150, 48, 0x6a2818).setStrokeStyle(2, 0xcc6644).setInteractive({ useHandCursor: true }).setVisible(false);
    this.continueText = this.add.text(0, 95, 'Continue', { fontFamily: 'Arial', fontSize: '18px', color: '#ffffff' }).setOrigin(0.5).setVisible(false);
    const menuBtn = this.add.rectangle(160, 95, 150, 48, 0x3a3a28).setStrokeStyle(2, 0xaaaa66).setInteractive({ useHandCursor: true });
    const menuText = this.add.text(160, 95, 'Levels', { fontFamily: 'Arial', fontSize: '18px', color: '#ffffff' }).setOrigin(0.5);

    retryBtn.on('pointerdown', () => {
      this.gameOverGroup.setVisible(false);
      this.hideCardPick();
      this.pendingContinue = null;
      if (this.gameScene?.isMultiplayer) {
        clearActiveNetplay();
        this.scene.stop('GameScene');
        this.scene.stop('UIScene');
        this.scene.start('LevelsScene');
        return;
      }
      const levelId = this.gameScene?.levelId || 'plains';
      this.scene.stop('GameScene');
      this.scene.stop('UIScene');
      this.scene.launch('UIScene');
      this.scene.start('GameScene', { levelId });
    });
    this.continueBtn.on('pointerover', () => {
      if (this.continueBtn.visible) this.continueBtn.setFillStyle(0x8a3820);
    });
    this.continueBtn.on('pointerout', () => {
      if (this.continueBtn.visible) this.continueBtn.setFillStyle(0x6a2818);
    });
    this.continueBtn.on('pointerdown', () => this.onContinuePressed());
    menuBtn.on('pointerdown', () => {
      this.gameOverGroup.setVisible(false);
      this.hideCardPick();
      this.pendingContinue = null;
      clearActiveNetplay();
      this.scene.stop('GameScene');
      this.scene.stop('UIScene');
      this.scene.start('LevelsScene');
    });
    this.gameOverGroup.add([
      this.goBg,
      this.gameOverTitle,
      this.gameOverStats,
      retryBtn,
      retryText,
      this.continueBtn,
      this.continueText,
      menuBtn,
      menuText,
    ]);
    this.menuBtnLabel = menuText;

    this.gameScene.events.on('hud-update', () => this.refreshHud());
    this.gameScene.events.on('player-damaged', (amount) => this.onPlayerDamaged(amount));
    this.gameScene.events.on('clear-damage-glow', () => {
      this.damageGlowIntensity = 0;
      this.damageGlowGfx?.clear();
    });
    this.gameScene.events.on('game-over', (data) => this.showGameOver(data));
    this.gameScene.events.on('level-complete', (data) => this.showVictory(data));
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
    this.gameScene.events.on('boss-stunned', (boss) => {
      const name = boss?.enemyData?.name || 'Boss';
      this.bossMessage.setText(`The ${name} is stunned!`);
      this.bossMessage.setColor('#88ccff');
    });
    this.gameScene.events.on('game-paused', () => this.showPauseMenu());
    this.gameScene.events.on('game-unpaused', () => this.hidePauseMenu());
    this.gameScene.events.on('wave-cleared', (wave) => this.showWaveCompleted(wave));
  }

  showWaveCompleted(wave) {
    if (this.tweens) {
      this.tweens.killTweensOf(this.waveCompleteText);
    }
    this.waveCompleteText.setText('Wave Completed');
    this.waveCompleteText.setAlpha(1);
    this.waveCompleteText.setScale(1);
    this.waveCompleteText.y = 100;

    this.tweens.add({
      targets: this.waveCompleteText,
      alpha: 0,
      y: 70,
      scale: 1.08,
      duration: 1600,
      ease: 'Sine.easeIn',
      delay: 400,
    });
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
    if (boss.typeId === 'yeti') {
      this.bossNameText.setColor('#aaddff');
    } else if (boss.typeId === 'kingMagmaCube') {
      this.bossNameText.setColor('#ffaa66');
    } else {
      this.bossNameText.setColor('#ffcc88');
    }
    this.updateBossBar(boss);
  }

  updateBossBar(boss) {
    if (!boss || !boss.active) {
      this.hideBossBar();
      return;
    }
    const ratio = Math.max(0, boss.hp / boss.maxHp);
    this.bossBar.width = 500 * ratio;
    if (boss.typeId === 'yeti') {
      this.bossBar.setFillStyle(ratio > 0.5 ? 0x4488cc : ratio > 0.25 ? 0x66aadd : 0x2266aa);
    } else {
      this.bossBar.setFillStyle(ratio > 0.5 ? 0xcc3344 : ratio > 0.25 ? 0xcc8844 : 0xaa2222);
    }
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
    this.continuePickMode = false;
    this.continueSelected = new Set();
    this.continuePickCards = null;
    this.continuePickWeapon = null;
    this.continuePickLevel = 1;
    this.continuePickXp = 0;
    this.continueConfirmBtn = null;
    this.continueConfirmLabel = null;
    this.continueCountText = null;
    this.continueCardNodes = [];
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
    this.hpText.setText(`HP ${Math.max(0, Math.ceil(player.hp))} / ${player.maxHp}`);

    const needed = xpToNextLevel(state.level);
    const xpRatio = state.xp / needed;
    this.xpBar.width = 200 * xpRatio;
    this.levelText.setText(`Lv ${state.level}`);

    this.waveText.setText(
      `Wave ${gs.waveManager?.currentWave || 1}/${gs.levelData?.maxWaves || 21}`,
    );

    const weaponName = state.weapon ? state.weapon.name : 'None';
    this.weaponText.setText(`Weapon: ${weaponName}`);

    if (gs.isMultiplayer) {
      this.coopText.setVisible(true);
      this.coopText.setText(gs.mpRole === 'host' ? 'Co-op Host' : 'Co-op Guest');
      this.allyWeaponText.setVisible(true);
      const label = gs.mpRole === 'host' ? 'Ally' : 'Host';
      this.allyWeaponText.setText(`${label}: ${gs.allyState?.weapon?.name || '—'}`);
      this.shieldText.setY(128);
      this.attackText.setY(148);
      this.coinText.setY(168);
    } else {
      this.coopText.setVisible(false);
      this.allyWeaponText.setVisible(false);
      this.shieldText.setY(110);
      this.attackText.setY(130);
      this.coinText.setY(150);
    }

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
    this.pendingContinue = null;
    this.continueBtn.setVisible(false);
    this.continueText.setVisible(false);
    this.retryLayoutTwoButtons();
    this.gameOverTitle.setText(data.disconnect ? 'Disconnected' : 'Game Over');
    this.gameOverTitle.setColor('#ff6666');
    this.menuBtnLabel?.setText('Levels');
    this.gameOverStats.setText(
      data.disconnect
        ? 'Connection lost.\nReturn to Levels to host or join again.'
        : `Reached Wave ${data.wave}\nLevel ${data.level}\nCoins banked: ${loadMeta().coins}`,
    );
    this.gameOverGroup.setVisible(true);
  }

  showVictory(data) {
    this.hidePauseMenu();
    this.gameOverTitle.setText('Level Complete!');
    this.gameOverTitle.setColor('#88ff88');
    this.menuBtnLabel?.setText('Levels');
    const diamondLine =
      data.diamondReward > 0 ? `\n+${data.diamondReward} diamonds` : '';
    this.gameOverStats.setText(
      `${data.levelName || 'Level'} cleared!\n+${data.goldReward || 1200} gold${diamondLine}\nSurvived ${data.wave} waves\nPlayer level ${data.playerLevel}\nCoins banked: ${loadMeta().coins}`,
    );

    if (data.canContinue) {
      this.pendingContinue = {
        weapon: data.continueWeapon || null,
        cardIds: Array.isArray(data.continueCards) ? data.continueCards : [],
        level: data.playerLevel || 1,
        xp: data.playerXp || 0,
      };
      this.continueBtn.setVisible(true);
      this.continueText.setVisible(true);
      this.retryLayoutThreeButtons();
    } else {
      this.pendingContinue = null;
      this.continueBtn.setVisible(false);
      this.continueText.setVisible(false);
      this.retryLayoutTwoButtons();
    }

    this.gameOverGroup.setVisible(true);
  }

  retryLayoutTwoButtons() {
    const retry = this.gameOverGroup.list[3];
    const retryLabel = this.gameOverGroup.list[4];
    const menu = this.gameOverGroup.list[7];
    const menuLabel = this.gameOverGroup.list[8];
    if (retry?.setPosition) retry.setPosition(-110, 95);
    if (retryLabel?.setPosition) retryLabel.setPosition(-110, 95);
    if (menu?.setPosition) menu.setPosition(110, 95);
    if (menuLabel?.setPosition) menuLabel.setPosition(110, 95);
  }

  retryLayoutThreeButtons() {
    const retry = this.gameOverGroup.list[3];
    const retryLabel = this.gameOverGroup.list[4];
    const menu = this.gameOverGroup.list[7];
    const menuLabel = this.gameOverGroup.list[8];
    if (retry?.setPosition) retry.setPosition(-160, 95);
    if (retryLabel?.setPosition) retryLabel.setPosition(-160, 95);
    if (menu?.setPosition) menu.setPosition(160, 95);
    if (menuLabel?.setPosition) menuLabel.setPosition(160, 95);
    this.continueBtn.setPosition(0, 95);
    this.continueText.setPosition(0, 95);
  }

  onContinuePressed() {
    if (!this.pendingContinue) return;
    const pending = this.pendingContinue;
    this.gameOverGroup.setVisible(false);

    const cards = (pending.cardIds || [])
      .map((id, index) => {
        const card = getPowerup(id);
        if (!card) return null;
        return { ...card, pickIndex: index };
      })
      .filter(Boolean);

    if (cards.length === 0) {
      this.startVolcanicContinue(pending.weapon, [], pending.level, pending.xp);
      return;
    }

    this.showContinueCardPick(cards, pending.weapon, pending.level, pending.xp);
  }

  showContinueCardPick(cards, weapon, level, xp) {
    this.hideCardPick();
    this.continuePickMode = true;
    this.continueSelected = new Set();
    this.continuePickCards = cards;
    this.continuePickWeapon = weapon;
    this.continuePickLevel = level || 1;
    this.continuePickXp = xp || 0;
    this.continuePickNeeded = Math.min(CONTINUE_PICK_COUNT, cards.length);

    this.cardPickGroup.setVisible(true);

    const width = 1280;
    const height = 720;
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.78);
    this.cardPickGroup.add(overlay);

    const titleText = this.add
      .text(width / 2, 48, `Pick ${this.continuePickNeeded} cards`, {
        fontFamily: 'Arial',
        fontSize: '36px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.cardPickGroup.add(titleText);

    const weaponName = weapon?.name || 'your weapon';
    const subtitle = this.add
      .text(
        width / 2,
        92,
        `Keep level ${this.continuePickLevel}. Damage resets to 1, then your 4 cards apply.\nYou keep ${weaponName} until wave 5, then you can change.`,
        {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: '#ccbbaa',
          align: 'center',
        },
      )
      .setOrigin(0.5);
    this.cardPickGroup.add(subtitle);

    this.continueCountText = this.add
      .text(width / 2, 140, `Selected 0 / ${this.continuePickNeeded}`, {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffcc88',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.cardPickGroup.add(this.continueCountText);

    const cols = cards.length <= 4 ? cards.length : cards.length <= 8 ? 4 : 5;
    const cardW = cards.length > 8 ? 170 : 200;
    const cardH = cards.length > 8 ? 200 : 240;
    const gapX = 14;
    const gapY = 12;
    const rows = Math.ceil(cards.length / cols);
    const gridW = cols * cardW + (cols - 1) * gapX;
    const startX = (width - gridW) / 2 + cardW / 2;
    const gridH = rows * cardH + (rows - 1) * gapY;
    const startY = Math.max(190, Math.min(250, (height - 100 - gridH) / 2 + cardH / 2));

    this.continueCardNodes = [];
    cards.forEach((card, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);
      this.createContinueCardPanel(x, y, cardW, cardH, card, index);
    });

    this.continueConfirmBtn = this.add
      .rectangle(width / 2, height - 48, 240, 50, 0x444444)
      .setStrokeStyle(2, 0x888888);
    this.continueConfirmLabel = this.add
      .text(width / 2, height - 48, 'Confirm', {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#aaaaaa',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.cardPickGroup.add([this.continueConfirmBtn, this.continueConfirmLabel]);
    this.refreshContinueConfirm();
  }

  createContinueCardPanel(x, y, w, h, card, index) {
    const premium = isPremiumShopCard(card);
    const fill = premium ? 0x14081f : 0x1a2a18;
    const stroke = premium ? 0xffd24a : card.color || 0x88aa88;

    const bg = this.add
      .rectangle(x, y, w, h, fill, 0.98)
      .setStrokeStyle(3, stroke)
      .setInteractive({ useHandCursor: true });

    const icon = this.add.circle(x, y - 70, 28, card.color || 0xffffff, 1);
    const name = this.add
      .text(x, y - 18, card.name, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: premium ? '#ffe9b0' : '#ffffff',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: w - 16 },
      })
      .setOrigin(0.5);

    const desc = this.add
      .text(x, y + 50, card.description || '', {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#ccdccc',
        align: 'center',
        wordWrap: { width: w - 18 },
      })
      .setOrigin(0.5);

    const check = this.add
      .text(x + w / 2 - 16, y - h / 2 + 14, '', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#88ff88',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    bg.on('pointerdown', () => this.toggleContinueCard(index));

    this.cardPickGroup.add([bg, icon, name, desc, check]);
    this.continueCardNodes.push({ bg, check, stroke, fill, index });
  }

  toggleContinueCard(index) {
    if (!this.continuePickMode) return;
    if (this.continueSelected.has(index)) {
      this.continueSelected.delete(index);
    } else {
      if (this.continueSelected.size >= this.continuePickNeeded) return;
      this.continueSelected.add(index);
    }

    this.continueCardNodes.forEach((node) => {
      const selected = this.continueSelected.has(node.index);
      node.bg.setStrokeStyle(selected ? 4 : 3, selected ? 0x88ff88 : node.stroke);
      node.bg.setFillStyle(selected ? 0x2a4a28 : node.fill, 0.98);
      node.check.setText(selected ? '✓' : '');
    });

    this.continueCountText.setText(
      `Selected ${this.continueSelected.size} / ${this.continuePickNeeded}`,
    );
    this.refreshContinueConfirm();
  }

  refreshContinueConfirm() {
    const ready = this.continueSelected.size === this.continuePickNeeded;
    if (!this.continueConfirmBtn) return;
    this.continueConfirmBtn.off('pointerdown');
    this.continueConfirmBtn.disableInteractive();
    if (ready) {
      this.continueConfirmBtn.setFillStyle(0x6a2818);
      this.continueConfirmBtn.setStrokeStyle(2, 0xcc6644);
      this.continueConfirmLabel.setColor('#ffffff');
      this.continueConfirmBtn.setInteractive({ useHandCursor: true });
      this.continueConfirmBtn.on('pointerdown', () => this.confirmContinuePick());
    } else {
      this.continueConfirmBtn.setFillStyle(0x444444);
      this.continueConfirmBtn.setStrokeStyle(2, 0x888888);
      this.continueConfirmLabel.setColor('#aaaaaa');
    }
  }

  confirmContinuePick() {
    if (this.continueSelected.size !== this.continuePickNeeded) return;
    const cardIds = [...this.continueSelected]
      .sort((a, b) => a - b)
      .map((i) => this.continuePickCards[i].id);
    const weapon = this.continuePickWeapon;
    const level = this.continuePickLevel;
    const xp = this.continuePickXp;
    this.hideCardPick();
    this.startVolcanicContinue(weapon, cardIds, level, xp);
  }

  startVolcanicContinue(weapon, cardIds, level = 1, xp = 0) {
    this.pendingContinue = null;
    this.continuePickMode = false;
    this.hideCardPick();
    this.scene.stop('GameScene');
    this.scene.stop('UIScene');
    this.scene.start('LoadingScene', {
      durationMs: 3000,
      nextScene: 'GameScene',
      launchScenes: ['UIScene'],
      levelId: 'volcanic',
      continueCarry: {
        continued: true,
        weapon: weapon ? { ...weapon, damage: 1 } : null,
        cardIds: [...cardIds],
        level: Math.max(1, Number(level) || 1),
        xp: Math.max(0, Number(xp) || 0),
      },
    });
  }

  update() {
    if (this.gameScene?.gameState === 'game_over') return;
    if (this.gameScene?.gameState === 'victory') return;
    if (this.gameScene?.gameState === 'paused') return;
    this.refreshHud();
    this.tickDamageGlow();
  }

  onPlayerDamaged(amount) {
    const maxHp = this.gameScene?.player?.maxHp || 100;
    const boost = Phaser.Math.Clamp(Number(amount) / (maxHp * 0.32), 0.1, 0.75);
    this.damageGlowIntensity = Math.min(1, (this.damageGlowIntensity || 0) + boost);
    this.drawDamageGlow();
  }

  tickDamageGlow() {
    if (!this.damageGlowIntensity || this.damageGlowIntensity <= 0) {
      this.damageGlowGfx?.clear();
      return;
    }
    this.damageGlowIntensity = Math.max(0, this.damageGlowIntensity - 0.014);
    this.drawDamageGlow();
  }

  drawDamageGlow() {
    const g = this.damageGlowGfx;
    if (!g) return;
    g.clear();
    const t = this.damageGlowIntensity || 0;
    if (t <= 0.01) return;

    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;
    const edge = 0.14 + t * 0.1;
    const a = t * 0.72;

    // Soft full-screen wash — brighter with heavier hits
    g.fillStyle(0xff2200, a * 0.22);
    g.fillRect(0, 0, w, h);

    // Edge vignette bands
    g.fillStyle(0xff1500, a);
    g.fillRect(0, 0, w, h * edge);
    g.fillRect(0, h * (1 - edge), w, h * edge);
    g.fillRect(0, 0, w * edge, h);
    g.fillRect(w * (1 - edge), 0, w * edge, h);

    // Inner rim for stronger hits
    if (t > 0.45) {
      const a2 = (t - 0.45) * 0.9;
      g.fillStyle(0xff6600, a2);
      g.fillRect(0, 0, w, h * 0.06);
      g.fillRect(0, h * 0.94, w, h * 0.06);
      g.fillRect(0, 0, w * 0.05, h);
      g.fillRect(w * 0.95, 0, w * 0.05, h);
    }
  }
}
