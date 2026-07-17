import Phaser from 'phaser';
import { loadMeta, getActiveSlotIndex } from '../data/meta.js';
import { ShopItems } from '../data/shop.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  getCoins() {
    return loadMeta().coins;
  }

  create() {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x142010);

    this.add
      .text(width / 2, height * 0.18, 'Blob Survivor', {
        fontFamily: 'Arial',
        fontSize: '64px',
        color: '#88ff88',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.27, 'Survive the waves. Pick your cards wisely.', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#aacdaa',
      })
      .setOrigin(0.5);

    this.createButton(width / 2, height * 0.38, 'Play', () => {
      if (this.scene.isActive('UIScene')) {
        this.scene.stop('UIScene');
      }
      this.scene.launch('UIScene');
      this.scene.start('GameScene');
    });

    this.createButton(width / 2, height * 0.48, 'Shop', () => {
      this.scene.start('ShopScene');
    });

    this.createButton(width / 2, height * 0.58, 'Deck', () => {
      this.scene.start('DeckScene');
    });

    this.createButton(
      width / 2,
      height * 0.68,
      'Saves',
      () => {
        this.scene.start('SavesScene');
      },
      false,
      {
        color: 0x1a4a88,
        hoverColor: 0x2a6aad,
        stroke: 0x6eb6ff,
        icon: 'icon_save_folder',
      },
    );

    this.add
      .text(width / 2, height * 0.77, `Coins: ${this.getCoins()}  ·  Slot ${getActiveSlotIndex() + 1}`, {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffd76a',
      })
      .setOrigin(0.5);

    const unlocked = loadMeta().unlocked || [];
    if (unlocked.includes('fortune') || unlocked.some((id) => ShopItems[id]?.name === 'Fortune')) {
      this.add
        .text(width / 2, height * 0.83, 'Fortune needs a ranged weapon to appear', {
          fontFamily: 'Arial',
          fontSize: '14px',
          color: '#ffd700',
        })
        .setOrigin(0.5);
    }

    this.add
      .text(width / 2, height * 0.92, 'WASD move | LMB attack | RMB shield | Q special', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#778877',
      })
      .setOrigin(0.5);
  }

  createButton(x, y, label, onClick, disabled = false, style = {}) {
    const color = disabled ? 0x333333 : style.color ?? 0x2a5a28;
    const hoverColor = disabled ? 0x333333 : style.hoverColor ?? 0x3a7a38;
    const stroke = disabled ? 0x444444 : style.stroke ?? 0x66aa66;
    const textColor = disabled ? '#666666' : '#ffffff';
    const hasIcon = Boolean(style.icon);

    const container = this.add.container(x, y).setDepth(50);

    const bg = this.add
      .rectangle(0, 0, 280, 56, color, 1)
      .setStrokeStyle(2, stroke);

    const kids = [bg];

    if (hasIcon) {
      const icon = this.add
        .image(-88, 0, style.icon)
        .setDisplaySize(28, 28)
        .setOrigin(0.5);
      kids.push(icon);
    }

    const text = this.add
      .text(hasIcon ? 12 : 0, 0, label, {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: textColor,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    kids.push(text);
    container.add(kids);

    if (!disabled && onClick) {
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => bg.setFillStyle(hoverColor));
      bg.on('pointerout', () => bg.setFillStyle(color));
      bg.on('pointerdown', () => onClick());
    }

    return container;
  }
}
