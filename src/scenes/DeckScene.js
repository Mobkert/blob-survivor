import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../data/constants.js';
import { ShopItems, isPremiumShopCard, isDiamondShopCard, isBossDropCard } from '../data/shop.js';
import { PowerupList } from '../data/powerups.js';
import { loadMeta } from '../data/meta.js';

const CARD_W = 160;
const CARD_H = 210;
const GAP_X = 18;
const GAP_Y = 18;
const COLS = 6;
const TOP = 100;
const BOTTOM = 660;

export class DeckScene extends Phaser.Scene {
  constructor() {
    super('DeckScene');
  }

  create() {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x142010);

    this.add
      .text(GAME_WIDTH / 2, 42, 'Deck', {
        fontFamily: 'Arial',
        fontSize: '42px',
        color: '#88ff88',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.createBackButton();

    const unlocked = loadMeta().unlocked || [];
    const freeCards = PowerupList.map((item) => ({ ...item, source: 'free' }));
    const shopCards = unlocked
      .map((id) => ShopItems[id])
      .filter(Boolean)
      .map((item) => ({ ...item, source: 'shop' }));
    const cards = [...freeCards, ...shopCards];

    this.add
      .text(
        GAME_WIDTH / 2,
        78,
        `${freeCards.length} starter · ${shopCards.length} from shop`,
        {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: '#aacdaa',
        },
      )
      .setOrigin(0.5);

    this.scrollRoot = this.add.container(0, 0);
    const maskShape = this.make.graphics({ x: 0, y: 0, add: false });
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(0, TOP, GAME_WIDTH, BOTTOM - TOP);
    this.scrollRoot.setMask(maskShape.createGeometryMask());

    const gridW = COLS * CARD_W + (COLS - 1) * GAP_X;
    const startX = (GAME_WIDTH - gridW) / 2 + CARD_W / 2;
    const startY = TOP + CARD_H / 2 + 8;

    cards.forEach((item, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = startX + col * (CARD_W + GAP_X);
      const y = startY + row * (CARD_H + GAP_Y);
      this.scrollRoot.add(this.createCard(x, y, item));
    });

    const rows = Math.ceil(cards.length / COLS);
    this.contentHeight = rows * (CARD_H + GAP_Y) + 16;
    this.viewHeight = BOTTOM - TOP;
    this.scrollY = 0;
    this.maxScroll = Math.max(0, this.contentHeight - this.viewHeight);

    if (this.maxScroll > 0) {
      this.add
        .text(GAME_WIDTH / 2, BOTTOM + 16, 'Scroll to see more', {
          fontFamily: 'Arial',
          fontSize: '14px',
          color: '#778877',
        })
        .setOrigin(0.5);

      this.input.on('wheel', (_pointer, _over, _dx, dy) => {
        this.scrollY = Phaser.Math.Clamp(this.scrollY + dy * 0.45, 0, this.maxScroll);
        this.scrollRoot.y = -this.scrollY;
      });
    }
  }

  createCard(x, y, item) {
    const group = this.add.container(x, y);
    const isShop = item.source === 'shop';
    const diamond = isDiamondShopCard(item);
    const boss = isBossDropCard(item);
    const premium = !diamond && !boss && isPremiumShopCard(item);

    const glow = diamond
      ? this.add.ellipse(0, 0, CARD_W + 18, CARD_H + 18, 0x44ddff, 0.18)
      : boss
        ? this.add.ellipse(0, 0, CARD_W + 18, CARD_H + 18, 0xffe8a0, 0.2)
        : premium
          ? this.add.ellipse(0, 0, CARD_W + 18, CARD_H + 18, 0xffaa33, 0.14)
          : null;

    const bg = this.add
      .rectangle(
        0,
        0,
        CARD_W,
        CARD_H,
        diamond ? 0x0c1830 : boss ? 0x2a2418 : premium ? 0x14081f : isShop ? 0x2a2410 : 0x1a2e18,
        0.98,
      )
      .setStrokeStyle(
        3,
        diamond ? 0x66e0ff : boss ? 0xffe8a0 : premium ? 0xffd24a : item.color || 0x66aa66,
      );

    const sheen = diamond || premium || boss
      ? this.add.rectangle(
          0,
          -72,
          CARD_W - 10,
          48,
          diamond ? 0x66ddff : boss ? 0xffe8a0 : 0xffcc66,
          0.1,
        )
      : null;

    const icon = this.add.circle(0, -68, 22, item.color || 0xffffff, 1);

    const badgeLabel = diamond
      ? '✦ DIAMOND'
      : boss
        ? '♛ BOSS'
        : premium
          ? '✦ PREMIUM'
          : isShop
            ? 'SHOP'
            : 'STARTER';
    const badgeColor = diamond
      ? '#9ef0ff'
      : boss
        ? '#ffe8a0'
        : premium || isShop
          ? '#ffd76a'
          : '#88cc88';

    const badge = this.add
      .text(0, -92, badgeLabel, {
        fontFamily: 'Arial',
        fontSize: '10px',
        color: badgeColor,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const name = this.add
      .text(0, -28, item.name, {
        fontFamily: 'Arial',
        fontSize: '15px',
        color: diamond || premium || boss ? '#e8fbff' : '#e8ffe8',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: CARD_W - 16 },
      })
      .setOrigin(0.5);

    const category = this.add
      .text(0, 2, `[${item.category}]`, {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: diamond ? '#88cce0' : premium ? '#e0c878' : '#9bbb9b',
      })
      .setOrigin(0.5);

    const desc = this.add
      .text(0, 48, item.description, {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: diamond ? '#c8eaf5' : premium ? '#f0e0b8' : '#c8ddc8',
        align: 'center',
        wordWrap: { width: CARD_W - 18 },
      })
      .setOrigin(0.5);

    group.add([glow, bg, sheen, icon, badge, name, category, desc].filter(Boolean));
    return group;
  }

  createBackButton() {
    const bg = this.add
      .rectangle(110, 42, 160, 44, 0x2a5a28, 1)
      .setStrokeStyle(2, 0x66aa66)
      .setInteractive({ useHandCursor: true })
      .setDepth(20);
    this.add
      .text(110, 42, 'Back', {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(21);

    bg.on('pointerover', () => bg.setFillStyle(0x3a7a38));
    bg.on('pointerout', () => bg.setFillStyle(0x2a5a28));
    bg.on('pointerdown', () => this.scene.start('MenuScene'));
  }
}
