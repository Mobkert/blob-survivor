import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../data/constants.js';
import { getShopOffers, SHOP_OFFER_COUNT, isPremiumShopCard } from '../data/shop.js';
import { loadMeta, saveMeta } from '../data/meta.js';

export class ShopScene extends Phaser.Scene {
  constructor() {
    super('ShopScene');
  }

  create() {
    this.buildWoodBackground();
    this.meta = loadMeta();
    this.offerUntil = 0;
    this.pillowSlots = [];

    this.add
      .text(GAME_WIDTH / 2, 48, 'Shop', {
        fontFamily: 'Arial',
        fontSize: '48px',
        color: '#f5e6c8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.coinText = this.add
      .text(GAME_WIDTH / 2, 100, '', {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#ffd76a',
      })
      .setOrigin(0.5);

    this.diamondText = this.add
      .text(GAME_WIDTH / 2, 126, '', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#88e0ff',
      })
      .setOrigin(0.5);

    this.timerText = this.add
      .text(GAME_WIDTH / 2, 150, '', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#d2b48c',
      })
      .setOrigin(0.5);

    this.messageText = this.add
      .text(GAME_WIDTH / 2, 600, '', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffe8a8',
      })
      .setOrigin(0.5);

    this.createLeaveButton();
    this.refreshOffers(true);

    this.time.addEvent({
      delay: 250,
      loop: true,
      callback: () => this.tickTimer(),
    });
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

    const diamBtn = this.add
      .rectangle(GAME_WIDTH - 120, 48, 180, 44, 0x1a3a55, 1)
      .setStrokeStyle(3, 0x88e0ff)
      .setInteractive({ useHandCursor: true })
      .setDepth(20);
    this.add
      .text(GAME_WIDTH - 120, 48, 'Diamonds', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#e8f8ff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(21);
    diamBtn.on('pointerover', () => diamBtn.setFillStyle(0x2a5577));
    diamBtn.on('pointerout', () => diamBtn.setFillStyle(0x1a3a55));
    diamBtn.on('pointerdown', () => this.scene.start('DiamondsScene'));

    const bottom = this.add
      .rectangle(GAME_WIDTH / 2, 680, 200, 44, 0x3a2210, 1)
      .setStrokeStyle(3, 0xffe8b0)
      .setInteractive({ useHandCursor: true })
      .setDepth(20);
    this.add
      .text(GAME_WIDTH / 2, 680, 'Back to Menu', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#fff4dd',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(21);
    bottom.on('pointerover', () => bottom.setFillStyle(0x5a3a1a));
    bottom.on('pointerout', () => bottom.setFillStyle(0x3a2210));
    bottom.on('pointerdown', () => this.scene.start('MenuScene'));
  }

  refreshOffers(force = false) {
    const { offers, until, meta, catalogEmpty } = getShopOffers();
    this.meta = meta;
    this.offerUntil = until;
    this.coinText.setText(`Coins: ${this.meta.coins}`);
    this.diamondText.setText(`Diamonds: ${this.meta.diamonds || 0}`);

    this.pillowSlots.forEach((slot) => slot.destroy());
    this.pillowSlots = [];

    const positions = [260, 640, 1020];
    for (let i = 0; i < SHOP_OFFER_COUNT; i++) {
      const x = positions[i];
      const item = offers[i] || null;
      this.pillowSlots.push(this.createPillowSlot(x, 400, item));
    }

    if (force && catalogEmpty) {
      this.messageText.setText('You already own every shop card!');
    }
  }

  createPillowSlot(x, y, item) {
    const group = this.add.container(x, y);

    const pillow = this.add.ellipse(0, 110, 220, 70, 0xc9a66b, 1).setStrokeStyle(3, 0x8b6914);
    const pillowShade = this.add.ellipse(0, 118, 180, 28, 0xa88855, 0.45);
    group.add([pillow, pillowShade]);

    if (!item) {
      const empty = this.add
        .text(0, 20, 'Sold out', {
          fontFamily: 'Arial',
          fontSize: '20px',
          color: '#aa8866',
        })
        .setOrigin(0.5);
      group.add(empty);
      return group;
    }

    const owned = this.meta.unlocked.includes(item.id);
    const premium = isPremiumShopCard(item);

    const glow = premium
      ? this.add.ellipse(0, -20, 230, 280, 0xffaa33, 0.12)
      : null;

    const cardBg = this.add
      .rectangle(0, -20, 200, 250, premium ? 0x14081f : 0x2a1a10, 0.96)
      .setStrokeStyle(premium ? 4 : 3, premium ? 0xffd24a : item.color || 0xd2b48c);

    const innerFrame = premium
      ? this.add.rectangle(0, -20, 184, 234, 0x000000, 0).setStrokeStyle(1, 0xffe8a0, 0.45)
      : null;

    const sheen = premium
      ? this.add.rectangle(0, -95, 184, 70, 0xffcc66, 0.08)
      : null;

    const icon = this.add.circle(0, -90, 28, item.color || 0xffffff, 1);

    const premiumTag = premium
      ? this.add
          .text(0, -118, '✦ PREMIUM', {
            fontFamily: 'Arial',
            fontSize: '11px',
            color: '#ffd76a',
            fontStyle: 'bold',
          })
          .setOrigin(0.5)
      : null;

    const name = this.add
      .text(0, -40, item.name, {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: premium ? '#ffe9b0' : '#fff4dd',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: 180 },
      })
      .setOrigin(0.5);

    const category = this.add
      .text(0, -10, `[${item.category}]`, {
        fontFamily: 'Arial',
        fontSize: '13px',
        color: premium ? '#e0c878' : '#cbb892',
      })
      .setOrigin(0.5);

    const desc = this.add
      .text(0, 40, item.description, {
        fontFamily: 'Arial',
        fontSize: '13px',
        color: premium ? '#f0e0b8' : '#e8d7b0',
        align: 'center',
        wordWrap: { width: 176 },
      })
      .setOrigin(0.5);

    const priceLabel = owned ? 'OWNED' : `${item.price} coins`;

    const buyBtn = this.add
      .rectangle(0, 120, 150, 36, owned ? 0x444444 : premium ? 0x6b4a12 : 0x3d6b2e, 1)
      .setStrokeStyle(2, owned ? 0x666666 : premium ? 0xffd76a : 0x88cc66);

    const buyText = this.add
      .text(0, 120, priceLabel, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: owned ? '#999999' : '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    group.add(
      [glow, cardBg, innerFrame, sheen, icon, premiumTag, name, category, desc, buyBtn, buyText].filter(
        Boolean,
      ),
    );

    if (!owned) {
      const btnIdle = premium ? 0x6b4a12 : 0x3d6b2e;
      const btnHover = premium ? 0x8a6218 : 0x4d8b3e;
      buyBtn.setInteractive({ useHandCursor: true });
      buyBtn.on('pointerover', () => buyBtn.setFillStyle(btnHover));
      buyBtn.on('pointerout', () => buyBtn.setFillStyle(btnIdle));
      buyBtn.on('pointerdown', () => this.buyItem(item));
    }

    return group;
  }

  buyItem(item) {
    this.meta = loadMeta();
    if (this.meta.unlocked.includes(item.id)) {
      this.messageText.setText('Already owned.');
      return;
    }
    if (this.meta.coins < item.price) {
      this.messageText.setText(`Need ${item.price} coins.`);
      return;
    }

    this.meta.coins -= item.price;
    if (!this.meta.unlocked.includes(item.id)) {
      this.meta.unlocked.push(item.id);
    }
    this.meta.shopOfferIds = (this.meta.shopOfferIds || []).map((id) =>
      id === item.id ? null : id,
    );

    saveMeta(this.meta);
    this.messageText.setText(`Bought ${item.name}! Wait for restock for new cards.`);
    this.refreshOffers(false);
  }

  tickTimer() {
    const now = Date.now();
    if (now >= this.offerUntil) {
      this.refreshOffers(true);
      this.messageText.setText('New cards arrived on the pillows!');
      return;
    }

    const left = Math.max(0, this.offerUntil - now);
    const mins = Math.floor(left / 60000);
    const secs = Math.floor((left % 60000) / 1000);
    this.timerText.setText(`New stock in ${mins}:${String(secs).padStart(2, '0')}`);
    const meta = loadMeta();
    this.coinText.setText(`Coins: ${meta.coins}`);
    this.diamondText.setText(`Diamonds: ${meta.diamonds || 0}`);
  }
}
