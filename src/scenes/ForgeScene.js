import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../data/constants.js';
import { WeaponList, isWeaponInPool } from '../data/weapons.js';
import {
  RarityList,
  FORGE_GOLD_COST,
  FORGE_DIAMOND_COST,
  rollForgeEnchant,
  getEnchant,
  getRarity,
  luckyRateLabel,
  enchantsForRarity,
} from '../data/enchants.js';
import {
  loadMeta,
  spendCoins,
  spendDiamonds,
  getWeaponEnchant,
  setWeaponEnchant,
} from '../data/meta.js';
import { Music } from '../systems/MusicManager.js';

const COLS = 4;
const CARD_W = 200;
const CARD_H = 150;
const GAP = 18;

export class ForgeScene extends Phaser.Scene {
  constructor() {
    super('ForgeScene');
  }

  create() {
    Music.play('chill');
    this.selectedWeapon = null;
    this.revealing = false;
    this.skipReveal = false;
    this.uiRoot = null;
    this.enchantRoot = null;
    this.revealRoot = null;
    this.rarityPopup = null;

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x12181f);

    // Soft forge glow
    for (let i = 0; i < 3; i++) {
      this.add
        .circle(GAME_WIDTH * (0.2 + i * 0.3), GAME_HEIGHT * 0.55, 180 + i * 40, 0x3a2210, 0.12)
        .setBlendMode(Phaser.BlendModes.ADD);
    }

    this.add
      .text(GAME_WIDTH / 2, 36, 'Forge', {
        fontFamily: 'Arial',
        fontSize: '40px',
        color: '#ffc878',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.balanceText = this.add
      .text(GAME_WIDTH / 2, 72, '', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#d8c8a0',
      })
      .setOrigin(0.5);

    this.createBackButton();
    this.refreshBalance();
    this.showWeaponList();
  }

  refreshBalance() {
    const meta = loadMeta();
    this.balanceText?.setText(`Gold: ${meta.coins}  ·  Diamonds: ${meta.diamonds}`);
  }

  createBackButton() {
    const back = this.add
      .rectangle(120, 42, 180, 40, 0x3a2a18, 1)
      .setStrokeStyle(2, 0xc8a060)
      .setInteractive({ useHandCursor: true })
      .setDepth(30);
    this.add
      .text(120, 42, 'Menu', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffe8c0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(31);
    back.on('pointerover', () => back.setFillStyle(0x5a4030));
    back.on('pointerout', () => back.setFillStyle(0x3a2a18));
    back.on('pointerdown', () => {
      if (this.revealing) return;
      if (this.selectedWeapon) {
        this.closeEnchantUi();
        return;
      }
      this.scene.start('MenuScene');
    });
  }

  clearUiRoot() {
    this.uiRoot?.destroy(true);
    this.uiRoot = null;
  }

  showWeaponList() {
    this.selectedWeapon = null;
    this.clearUiRoot();
    this.enchantRoot?.destroy(true);
    this.enchantRoot = null;

    this.uiRoot = this.add.container(0, 0).setDepth(10);

    const subtitle = this.add
      .text(GAME_WIDTH / 2, 100, 'Choose a weapon to enchant', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#c8b890',
      })
      .setOrigin(0.5);
    this.uiRoot.add(subtitle);

    const owned = WeaponList.filter((w) => isWeaponInPool(w));
    const gridW = COLS * CARD_W + (COLS - 1) * GAP;
    const startX = (GAME_WIDTH - gridW) / 2 + CARD_W / 2;
    const startY = 180;

    owned.forEach((weapon, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = startX + col * (CARD_W + GAP);
      const y = startY + row * (CARD_H + GAP);
      this.uiRoot.add(this.createWeaponCard(x, y, weapon));
    });
  }

  createWeaponCard(x, y, weapon) {
    const container = this.add.container(x, y);
    const saved = getWeaponEnchant(weapon.id);
    const rarity = saved ? getRarity(saved.rarityId) : null;
    const stroke = rarity?.hex || 0xa08050;

    const bg = this.add
      .rectangle(0, 0, CARD_W, CARD_H, 0x1e1810, 0.95)
      .setStrokeStyle(2, stroke)
      .setInteractive({ useHandCursor: true });

    const texKey = `weapon_${weapon.id}`;
    const hasTex = this.textures.exists(texKey);
    const icon = hasTex
      ? this.add.image(0, -28, texKey).setDisplaySize(56, 56)
      : this.add.circle(0, -28, 22, weapon.color || 0x888888);

    const name = this.add
      .text(0, 28, weapon.name, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffe8c8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    let enchantLabel = 'No enchant';
    let enchantColor = '#887766';
    if (saved) {
      const ench = getEnchant(saved.enchantId);
      enchantLabel = ench?.name || saved.enchantId;
      enchantColor = rarity?.color || '#ffd080';
    }
    const enchText = this.add
      .text(0, 52, enchantLabel, {
        fontFamily: 'Arial',
        fontSize: '13px',
        color: enchantColor,
      })
      .setOrigin(0.5);

    if (rarity?.icon && this.textures.exists(rarity.icon)) {
      container.add(
        this.add.image(CARD_W / 2 - 22, -CARD_H / 2 + 22, rarity.icon).setDisplaySize(28, 28),
      );
    }

    container.add([bg, icon, name, enchText]);

    bg.on('pointerover', () => bg.setFillStyle(0x2e2418));
    bg.on('pointerout', () => bg.setFillStyle(0x1e1810));
    bg.on('pointerdown', () => this.openEnchantUi(weapon));

    return container;
  }

  closeEnchantUi() {
    this.closeRarityPopup();
    this.enchantRoot?.destroy(true);
    this.enchantRoot = null;
    this.selectedWeapon = null;
    this.showWeaponList();
    this.refreshBalance();
  }

  openEnchantUi(weapon) {
    this.clearUiRoot();
    this.selectedWeapon = weapon;
    this.enchantRoot?.destroy(true);
    this.enchantRoot = this.add.container(0, 0).setDepth(20);

    const root = this.enchantRoot;

    root.add(
      this.add
        .text(GAME_WIDTH / 2, 100, `Enchant: ${weapon.name}`, {
          fontFamily: 'Arial',
          fontSize: '28px',
          color: '#ffd090',
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );

    // Rarity panel (left)
    const panelX = 170;
    const panelY = 380;
    root.add(
      this.add
        .rectangle(panelX, panelY, 280, 420, 0x16120e, 0.95)
        .setStrokeStyle(2, 0x8a7040),
    );
    root.add(
      this.add
        .text(panelX, 190, 'Rarities', {
          fontFamily: 'Arial',
          fontSize: '20px',
          color: '#ffd090',
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );
    root.add(
      this.add
        .text(panelX, 210, 'Click a rarity to preview', {
          fontFamily: 'Arial',
          fontSize: '12px',
          color: '#887766',
        })
        .setOrigin(0.5),
    );

    RarityList.forEach((r, i) => {
      const y = 242 + i * 48;
      const hit = this.add
        .rectangle(panelX, y, 250, 42, 0x000000, 0.001)
        .setStrokeStyle(1, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      const rowBg = this.add.rectangle(panelX, y, 250, 42, 0x2a2014, 0).setStrokeStyle(1, 0x000000, 0);

      if (r.icon && this.textures.exists(r.icon)) {
        root.add(this.add.image(panelX - 100, y, r.icon).setDisplaySize(28, 28));
      }
      root.add(
        this.add
          .text(panelX - 72, y, r.name, {
            fontFamily: 'Arial',
            fontSize: '15px',
            color: r.color,
            fontStyle: 'bold',
          })
          .setOrigin(0, 0.5),
      );
      root.add(
        this.add
          .text(panelX + 90, y, r.rateLabel, {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#c8b890',
          })
          .setOrigin(1, 0.5),
      );

      hit.on('pointerover', () => {
        rowBg.setFillStyle(0x2a2014, 0.85);
        rowBg.setStrokeStyle(1, r.hex, 0.7);
      });
      hit.on('pointerout', () => {
        rowBg.setFillStyle(0x2a2014, 0);
        rowBg.setStrokeStyle(1, 0x000000, 0);
      });
      hit.on('pointerdown', () => {
        if (this.revealing) return;
        this.showRarityEnchants(r);
      });
      root.add([rowBg, hit]);
    });

    // Book in the middle
    const bookKey = this.textures.exists('forge_book') ? 'forge_book' : null;
    if (bookKey) {
      root.add(this.add.image(GAME_WIDTH / 2, 340, bookKey).setDisplaySize(220, 260));
    } else {
      root.add(
        this.add
          .rectangle(GAME_WIDTH / 2, 340, 180, 220, 0x4a3020)
          .setStrokeStyle(3, 0xc8a060),
      );
      root.add(
        this.add
          .text(GAME_WIDTH / 2, 340, 'BOOK', {
            fontFamily: 'Arial',
            fontSize: '28px',
            color: '#ffd090',
            fontStyle: 'bold',
          })
          .setOrigin(0.5),
      );
    }

    // Current enchant
    const saved = getWeaponEnchant(weapon.id);
    let currentLine = 'Current: none';
    let currentColor = '#887766';
    if (saved) {
      const ench = getEnchant(saved.enchantId);
      const rar = getRarity(saved.rarityId);
      currentLine = `Current: ${ench?.name || saved.enchantId} (${rar?.name || '?'})`;
      currentColor = rar?.color || '#ffd090';
    }
    root.add(
      this.add
        .text(GAME_WIDTH / 2, 500, currentLine, {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: currentColor,
        })
        .setOrigin(0.5),
    );

    // Lucky rates note (right)
    const rightX = GAME_WIDTH - 170;
    root.add(
      this.add
        .rectangle(rightX, 380, 280, 420, 0x16120e, 0.95)
        .setStrokeStyle(2, 0x4a88aa),
    );
    root.add(
      this.add
        .text(rightX, 190, 'Lucky rates', {
          fontFamily: 'Arial',
          fontSize: '20px',
          color: '#88d8ff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );
    root.add(
      this.add
        .text(rightX, 220, 'No Common · better odds', {
          fontFamily: 'Arial',
          fontSize: '13px',
          color: '#88aacc',
        })
        .setOrigin(0.5),
    );
    RarityList.forEach((r, i) => {
      const y = 255 + i * 48;
      root.add(
        this.add
          .text(rightX - 90, y, r.name, {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: r.color,
          })
          .setOrigin(0, 0.5),
      );
      root.add(
        this.add
          .text(rightX + 90, y, luckyRateLabel(r.id), {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#a8c8d8',
          })
          .setOrigin(1, 0.5),
      );
    });

    // Roll buttons
    this.createRollButton(root, GAME_WIDTH / 2 - 140, 580, `Normal  ${FORGE_GOLD_COST}g`, 0x5a4020, 0xc8a060, () =>
      this.tryRoll(false),
    );
    this.createRollButton(root, GAME_WIDTH / 2 + 140, 580, `Lucky  ${FORGE_DIAMOND_COST}◆`, 0x1a4060, 0x66ccee, () =>
      this.tryRoll(true),
    );

    this.messageText = this.add
      .text(GAME_WIDTH / 2, 640, 'Enchanting replaces the current enchant.', {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#998870',
      })
      .setOrigin(0.5);
    root.add(this.messageText);
  }

  showRarityEnchants(rarity) {
    this.closeRarityPopup();
    const pool = enchantsForRarity(rarity.id);
    const panelH = Math.max(280, 120 + pool.length * 68 + 50);
    const panelW = 500;

    this.rarityPopup = this.add.container(0, 0).setDepth(150);

    const dim = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55)
      .setInteractive();
    dim.on('pointerdown', () => this.closeRarityPopup());
    this.rarityPopup.add(dim);

    const panel = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, panelW, panelH, 0x1a1410, 0.98)
      .setStrokeStyle(3, rarity.hex);
    this.rarityPopup.add(panel);

    // Stop clicks on panel from closing via dim
    const panelHit = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, panelW, panelH, 0x000000, 0.001)
      .setInteractive();
    this.rarityPopup.add(panelHit);

    if (rarity.icon && this.textures.exists(rarity.icon)) {
      this.rarityPopup.add(
        this.add
          .image(GAME_WIDTH / 2 - panelW / 2 + 40, GAME_HEIGHT / 2 - panelH / 2 + 36, rarity.icon)
          .setDisplaySize(36, 36),
      );
    }

    this.rarityPopup.add(
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - panelH / 2 + 36, `${rarity.name} enchants`, {
          fontFamily: 'Arial',
          fontSize: '24px',
          color: rarity.color,
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );

    const startY = GAME_HEIGHT / 2 - panelH / 2 + 82;
    pool.forEach((ench, i) => {
      const y = startY + i * 68;
      this.rarityPopup.add(
        this.add
          .text(GAME_WIDTH / 2 - panelW / 2 + 28, y, ench.name, {
            fontFamily: 'Arial',
            fontSize: '17px',
            color: rarity.color,
            fontStyle: 'bold',
          })
          .setOrigin(0, 0.5),
      );
      this.rarityPopup.add(
        this.add
          .text(GAME_WIDTH / 2 - panelW / 2 + 28, y + 20, ench.description, {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#d8c8a8',
            wordWrap: { width: panelW - 56 },
          })
          .setOrigin(0, 0.5),
      );
    });

    const closeY = GAME_HEIGHT / 2 + panelH / 2 - 32;
    const closeBtn = this.add
      .rectangle(GAME_WIDTH / 2, closeY, 120, 36, 0x3a2a18, 1)
      .setStrokeStyle(2, 0xc8a060)
      .setInteractive({ useHandCursor: true });
    const closeText = this.add
      .text(GAME_WIDTH / 2, closeY, 'Close', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffe8c0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    closeBtn.on('pointerover', () => closeBtn.setFillStyle(0x5a4030));
    closeBtn.on('pointerout', () => closeBtn.setFillStyle(0x3a2a18));
    closeBtn.on('pointerdown', () => this.closeRarityPopup());
    this.rarityPopup.add([closeBtn, closeText]);
  }

  closeRarityPopup() {
    this.rarityPopup?.destroy(true);
    this.rarityPopup = null;
  }

  createRollButton(root, x, y, label, color, stroke, onClick) {
    const bg = this.add
      .rectangle(x, y, 240, 48, color, 1)
      .setStrokeStyle(2, stroke)
      .setInteractive({ useHandCursor: true });
    const text = this.add
      .text(x, y, label, {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const hover = color === 0x5a4020 ? 0x7a5830 : 0x2a6088;
    bg.on('pointerover', () => bg.setFillStyle(hover));
    bg.on('pointerout', () => bg.setFillStyle(color));
    bg.on('pointerdown', () => {
      if (this.revealing) return;
      onClick();
    });
    root.add([bg, text]);
  }

  tryRoll(lucky) {
    if (!this.selectedWeapon || this.revealing) return;

    const ok = lucky ? spendDiamonds(FORGE_DIAMOND_COST) : spendCoins(FORGE_GOLD_COST);
    if (!ok) {
      this.messageText?.setText(
        lucky ? `Need ${FORGE_DIAMOND_COST} diamonds.` : `Need ${FORGE_GOLD_COST} gold.`,
      );
      this.messageText?.setColor('#ff8866');
      return;
    }

    this.refreshBalance();
    const result = rollForgeEnchant(lucky);
    if (!result?.enchant) {
      this.messageText?.setText('Roll failed — try again.');
      return;
    }

    setWeaponEnchant(this.selectedWeapon.id, result.enchant.id, result.rarity.id);
    this.playReveal(result);
  }

  playReveal(result) {
    this.revealing = true;
    this.skipReveal = false;
    this.revealRoot?.destroy(true);
    this.revealRoot = this.add.container(0, 0).setDepth(200);

    const fade = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0);
    this.revealRoot.add(fade);

    const spaceHint = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 40, 'Press SPACE to skip', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#888888',
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.revealRoot.add(spaceHint);

    const onSpace = (event) => {
      if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault?.();
        this.skipReveal = true;
        this.finishReveal(result);
      }
    };
    this._revealKeyHandler = onSpace;
    this.input.keyboard?.on('keydown', onSpace);

    // Fade to black
    this.tweens.add({
      targets: fade,
      alpha: 1,
      duration: 400,
      onComplete: () => {
        if (this.skipReveal) return;
        spaceHint.setAlpha(1);
        this.showRarityDiamond(result, fade);
      },
    });
  }

  showRarityDiamond(result, fade) {
    if (this.skipReveal || !this.revealRoot) return;

    const iconKey = result.rarity.icon;
    const diamond = this.textures.exists(iconKey)
      ? this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, iconKey).setDisplaySize(160, 160).setAlpha(0)
      : this.add.circle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 70, result.rarity.hex, 0).setStrokeStyle(4, result.rarity.hex);

    const label = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 110, result.rarity.name.toUpperCase(), {
        fontFamily: 'Arial',
        fontSize: '36px',
        color: result.rarity.color,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.revealRoot.add([diamond, label]);
    this._revealDiamond = diamond;
    this._revealLabel = label;

    this.tweens.add({
      targets: [diamond, label],
      alpha: 1,
      duration: 500,
      onComplete: () => {
        if (this.skipReveal) return;
        this.time.delayedCall(1000, () => {
          if (this.skipReveal) return;
          this.explodeAndShowEnchant(result, diamond, label, fade);
        });
      },
    });
  }

  explodeAndShowEnchant(result, diamond, label, fade) {
    if (this.skipReveal || !this.revealRoot) return;

    // Particle burst
    const color = result.rarity.hex;
    for (let i = 0; i < 28; i++) {
      const ang = (Math.PI * 2 * i) / 28;
      const dist = 40 + Math.random() * 120;
      const p = this.add.circle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 3 + Math.random() * 5, color, 1);
      this.revealRoot.add(p);
      this.tweens.add({
        targets: p,
        x: GAME_WIDTH / 2 + Math.cos(ang) * dist,
        y: GAME_HEIGHT / 2 + Math.sin(ang) * dist,
        alpha: 0,
        duration: 450 + Math.random() * 200,
        onComplete: () => p.destroy(),
      });
    }

    this.tweens.add({
      targets: [diamond, label],
      scale: 2.2,
      alpha: 0,
      duration: 350,
      onComplete: () => {
        diamond?.destroy();
        label?.destroy();
        this.showEnchantResult(result, fade);
      },
    });
  }

  finishReveal(result) {
    if (!this.revealing) return;
    // Jump straight to result
    this.tweens.killAll();
    this.revealRoot?.destroy(true);
    this.revealRoot = this.add.container(0, 0).setDepth(200);
    const fade = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.92);
    this.revealRoot.add(fade);
    this.showEnchantResult(result, fade);
  }

  showEnchantResult(result, fade) {
    this.cleanupRevealKeys();

    const panel = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 520, 280, 0x1a1410, 0.98)
      .setStrokeStyle(3, result.rarity.hex);
    this.revealRoot.add(panel);

    if (result.rarity.icon && this.textures.exists(result.rarity.icon)) {
      this.revealRoot.add(
        this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, result.rarity.icon).setDisplaySize(64, 64),
      );
    }

    this.revealRoot.add(
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, result.enchant.name, {
          fontFamily: 'Arial',
          fontSize: '32px',
          color: result.rarity.color,
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );
    this.revealRoot.add(
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 24, result.rarity.name, {
          fontFamily: 'Arial',
          fontSize: '18px',
          color: '#c8b890',
        })
        .setOrigin(0.5),
    );
    this.revealRoot.add(
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 58, result.enchant.description, {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: '#e8dcc0',
          wordWrap: { width: 440 },
          align: 'center',
        })
        .setOrigin(0.5),
    );

    const ok = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 110, 160, 40, 0x3a2a18, 1)
      .setStrokeStyle(2, 0xc8a060)
      .setInteractive({ useHandCursor: true });
    const okText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 110, 'Continue', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffe8c0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.revealRoot.add([ok, okText]);

    ok.on('pointerdown', () => this.endReveal());
  }

  endReveal() {
    this.cleanupRevealKeys();
    this.revealing = false;
    this.skipReveal = false;
    this.revealRoot?.destroy(true);
    this.revealRoot = null;
    this.closeRarityPopup();
    if (this.selectedWeapon) {
      this.openEnchantUi(this.selectedWeapon);
    } else {
      this.showWeaponList();
    }
    this.refreshBalance();
  }

  cleanupRevealKeys() {
    if (this._revealKeyHandler) {
      this.input.keyboard?.off('keydown', this._revealKeyHandler);
      this._revealKeyHandler = null;
    }
  }

  shutdown() {
    this.cleanupRevealKeys();
    this.closeRarityPopup();
  }
}
