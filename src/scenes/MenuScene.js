import Phaser from 'phaser';
import { loadMeta, getActiveSlotIndex } from '../data/meta.js';
import { ShopItems } from '../data/shop.js';
import { Music, bindMusicUnlock } from '../systems/MusicManager.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  getCoins() {
    return loadMeta().coins;
  }

  create() {
    bindMusicUnlock(this);
    Music.play('chill');

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

    this.createButton(width / 2, height * 0.38, 'Levels', () => {
      this.scene.start('LevelsScene');
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

    this.createSettingsButton(width - 44, 44);
  }

  createSettingsButton(x, y) {
    const btn = this.add
      .circle(x, y, 26, 0x2a3a28, 1)
      .setStrokeStyle(2, 0x88aa88)
      .setDepth(80)
      .setInteractive({ useHandCursor: true });
    const icon = this.add
      .image(x, y, 'icon_settings_gear')
      .setDisplaySize(28, 28)
      .setDepth(81);

    btn.on('pointerover', () => btn.setFillStyle(0x3a5a38));
    btn.on('pointerout', () => btn.setFillStyle(0x2a3a28));
    btn.on('pointerdown', () => this.toggleSettingsPanel());

    this.settingsBtn = btn;
    this.settingsIcon = icon;
    this.settingsOpen = false;
    this.settingsPanel = null;
  }

  toggleSettingsPanel() {
    if (this.settingsOpen) {
      this.closeSettingsPanel();
      return;
    }
    this.openSettingsPanel();
  }

  openSettingsPanel() {
    this.closeSettingsPanel();
    this.settingsOpen = true;
    const { width } = this.scale;
    const panel = this.add.container(width - 170, 120).setDepth(90);

    const bg = this.add
      .rectangle(0, 0, 280, 140, 0x152015, 0.96)
      .setStrokeStyle(2, 0x66aa66);
    const title = this.add
      .text(0, -48, 'Settings', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#c8e8c8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const label = this.add
      .text(0, -18, 'Music Volume', {
        fontFamily: 'Arial',
        fontSize: '15px',
        color: '#a8c8a8',
      })
      .setOrigin(0.5);

    const barW = 200;
    const barH = 14;
    const barX = 0;
    const barY = 22;

    const track = this.add
      .rectangle(barX, barY, barW, barH, 0x223322, 1)
      .setStrokeStyle(2, 0x557755)
      .setInteractive({ useHandCursor: true });

    const fill = this.add
      .rectangle(barX - barW / 2, barY, 1, barH - 2, 0x55cc66, 1)
      .setOrigin(0, 0.5);

    const knob = this.add
      .circle(barX, barY, 11, 0xe8ffe8, 1)
      .setStrokeStyle(2, 0x66aa66)
      .setInteractive({ useHandCursor: true });

    const valueText = this.add
      .text(0, 52, '', {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#ddeedd',
      })
      .setOrigin(0.5);

    const applyVolumeVisual = (vol) => {
      const v = Math.max(0, Math.min(1, vol));
      fill.width = Math.max(2, barW * v);
      knob.x = barX - barW / 2 + barW * v;
      valueText.setText(`${Math.round(v * 100)}%`);
    };

    const setFromLocalX = (localX) => {
      const left = barX - barW / 2;
      const t = Math.max(0, Math.min(1, (localX - left) / barW));
      Music.unlock();
      Music.setVolume(t);
      applyVolumeVisual(t);
    };

    applyVolumeVisual(Music.getVolume());

    const onPointerDown = (pointer) => {
      this._volumeDragging = true;
      const local = panel.getLocalPoint(pointer.x, pointer.y);
      setFromLocalX(local.x);
    };
    const onPointerMove = (pointer) => {
      if (!this._volumeDragging || !this.settingsOpen) return;
      const local = panel.getLocalPoint(pointer.x, pointer.y);
      setFromLocalX(local.x);
    };
    const onPointerUp = () => {
      this._volumeDragging = false;
    };

    track.on('pointerdown', onPointerDown);
    knob.on('pointerdown', onPointerDown);
    this._volumeMove = onPointerMove;
    this._volumeUp = onPointerUp;
    this.input.on('pointermove', onPointerMove);
    this.input.on('pointerup', onPointerUp);

    panel.add([bg, title, label, track, fill, knob, valueText]);
    this.settingsPanel = panel;
  }

  closeSettingsPanel() {
    this.settingsOpen = false;
    this._volumeDragging = false;
    if (this._volumeMove) {
      this.input.off('pointermove', this._volumeMove);
      this._volumeMove = null;
    }
    if (this._volumeUp) {
      this.input.off('pointerup', this._volumeUp);
      this._volumeUp = null;
    }
    this.settingsPanel?.destroy(true);
    this.settingsPanel = null;
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
