import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../data/constants.js';
import {
  getDiamondShopCards,
  isDiamondShopCard,
} from '../data/shop.js';
import {
  loadMeta,
  saveMeta,
  exchangeGoldForDiamonds,
  GOLD_PER_DIAMOND_PACK,
  DIAMONDS_PER_PACK,
} from '../data/meta.js';

export class DiamondsScene extends Phaser.Scene {
  constructor() {
    super('DiamondsScene');
  }

  create() {
    this.buildBackground();
    this.meta = loadMeta();
    this.cardSlots = [];

    this.add
      .text(GAME_WIDTH / 2, 42, 'Diamonds', {
        fontFamily: 'Arial',
        fontSize: '42px',
        color: '#a8e7ff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.balanceText = this.add
      .text(GAME_WIDTH / 2, 88, '', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#d0f0ff',
        align: 'center',
      })
      .setOrigin(0.5);

    this.messageText = this.add
      .text(GAME_WIDTH / 2, 660, '', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#c8f0ff',
      })
      .setOrigin(0.5);

    this.createNavButtons();
    this.createExchangePanel();
    this.refreshCards();
    this.refreshBalance();
  }

  buildBackground() {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a1628);
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * GAME_WIDTH;
      const y = Math.random() * GAME_HEIGHT;
      this.add.circle(x, y, 1 + Math.random() * 2, 0x88ccff, 0.25 + Math.random() * 0.4);
    }
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x122040, 0.35);
  }

  createNavButtons() {
    const back = this.add
      .rectangle(150, 42, 220, 40, 0x1a3a55, 1)
      .setStrokeStyle(2, 0x88ddff)
      .setInteractive({ useHandCursor: true })
      .setDepth(20);
    this.add
      .text(150, 42, 'Return to Shop', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#e8f8ff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(21);
    back.on('pointerover', () => back.setFillStyle(0x2a5577));
    back.on('pointerout', () => back.setFillStyle(0x1a3a55));
    back.on('pointerdown', () => this.scene.start('ShopScene'));
  }

  createExchangePanel() {
    const panel = this.add
      .rectangle(GAME_WIDTH / 2, 150, 520, 70, 0x152a44, 0.95)
      .setStrokeStyle(2, 0x66ccee);

    this.add
      .text(GAME_WIDTH / 2 - 90, 150, `${GOLD_PER_DIAMOND_PACK} gold → ${DIAMONDS_PER_PACK} diamonds`, {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#dff6ff',
      })
      .setOrigin(0.5);

    const btn = this.add
      .rectangle(GAME_WIDTH / 2 + 170, 150, 140, 40, 0x1e6b8a, 1)
      .setStrokeStyle(2, 0x88e0ff)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(GAME_WIDTH / 2 + 170, 150, 'Exchange', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    btn.on('pointerover', () => btn.setFillStyle(0x2a88aa));
    btn.on('pointerout', () => btn.setFillStyle(0x1e6b8a));
    btn.on('pointerdown', () => this.doExchange());
  }

  doExchange() {
    this.meta = loadMeta();
    if (!exchangeGoldForDiamonds()) {
      this.messageText.setText(`Need ${GOLD_PER_DIAMOND_PACK} gold to exchange.`);
      return;
    }
    this.meta = loadMeta();
    this.refreshBalance();
    this.messageText.setText(`Exchanged ${GOLD_PER_DIAMOND_PACK} gold for ${DIAMONDS_PER_PACK} diamonds!`);
  }

  refreshBalance() {
    this.meta = loadMeta();
    this.balanceText.setText(`Gold: ${this.meta.coins}   |   Diamonds: ${this.meta.diamonds}`);
  }

  refreshCards() {
    this.cardSlots.forEach((s) => s.destroy());
    this.cardSlots = [];

    const cards = getDiamondShopCards();
    const positions = [260, 640, 1020];
    cards.forEach((item, i) => {
      const x = positions[i] ?? 640;
      this.cardSlots.push(this.createDiamondCard(x, 420, item));
    });
  }

  createDiamondCard(x, y, item) {
    const group = this.add.container(x, y);
    const owned = this.meta.unlocked.includes(item.id);

    const glow = this.add.ellipse(0, -10, 240, 300, 0x44ddff, 0.16);
    const bg = this.add
      .rectangle(0, -10, 210, 270, 0x0c1830, 0.98)
      .setStrokeStyle(4, 0x66e0ff);
    const inner = this.add.rectangle(0, -10, 192, 252, 0x000000, 0).setStrokeStyle(1, 0xa8f0ff, 0.5);
    const sheen = this.add.rectangle(0, -90, 192, 70, 0x66ddff, 0.12);

    const tag = this.add
      .text(0, -120, '✦ DIAMOND', {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#9ef0ff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const icon = this.add.circle(0, -85, 26, item.color || 0x66f0ff, 1);

    const name = this.add
      .text(0, -40, item.name, {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#e8fbff',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: 180 },
      })
      .setOrigin(0.5);

    const category = this.add
      .text(0, -8, `[${item.category}]`, {
        fontFamily: 'Arial',
        fontSize: '13px',
        color: '#88cce0',
      })
      .setOrigin(0.5);

    const desc = this.add
      .text(0, 45, item.description, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#c8eaf5',
        align: 'center',
        wordWrap: { width: 180 },
      })
      .setOrigin(0.5);

    const priceLabel = owned ? 'OWNED' : `${item.diamondPrice} diamonds`;
    const buyBtn = this.add
      .rectangle(0, 120, 160, 36, owned ? 0x444444 : 0x176a8a, 1)
      .setStrokeStyle(2, owned ? 0x666666 : 0x88e8ff);
    const buyText = this.add
      .text(0, 120, priceLabel, {
        fontFamily: 'Arial',
        fontSize: '15px',
        color: owned ? '#999999' : '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    group.add([glow, bg, inner, sheen, tag, icon, name, category, desc, buyBtn, buyText]);

    if (!owned) {
      buyBtn.setInteractive({ useHandCursor: true });
      buyBtn.on('pointerover', () => buyBtn.setFillStyle(0x2288aa));
      buyBtn.on('pointerout', () => buyBtn.setFillStyle(0x176a8a));
      buyBtn.on('pointerdown', () => this.buyDiamondCard(item));
    }

    return group;
  }

  buyDiamondCard(item) {
    this.meta = loadMeta();
    if (!isDiamondShopCard(item)) return;
    if (this.meta.unlocked.includes(item.id)) {
      this.messageText.setText('Already owned.');
      return;
    }
    const cost = item.diamondPrice || 0;
    if (this.meta.diamonds < cost) {
      this.messageText.setText(`Need ${cost} diamonds.`);
      return;
    }
    this.meta.diamonds -= cost;
    this.meta.unlocked.push(item.id);
    saveMeta(this.meta);
    this.messageText.setText(`Unlocked ${item.name}! It can appear in level-ups.`);
    this.refreshBalance();
    this.refreshCards();
  }
}
