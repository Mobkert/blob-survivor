import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../data/constants.js';
import {
  listSaveSlots,
  switchToSlot,
  saveActiveToSlot,
  clearSaveSlot,
  getActiveSlotIndex,
  SAVE_SLOT_COUNT,
} from '../data/meta.js';
import { Music } from '../systems/MusicManager.js';

export class SavesScene extends Phaser.Scene {
  constructor() {
    super('SavesScene');
  }

  create() {
    Music.play('chill');
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x101828);

    this.add
      .image(GAME_WIDTH / 2 - 70, 48, 'icon_save_folder')
      .setDisplaySize(36, 36)
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2 + 18, 48, 'Saves', {
        fontFamily: 'Arial',
        fontSize: '42px',
        color: '#6eb6ff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.hintText = this.add
      .text(
        GAME_WIDTH / 2,
        92,
        'Load a slot to play it. Save Here copies your current progress into that slot.',
        {
          fontFamily: 'Arial',
          fontSize: '15px',
          color: '#9bb4d0',
        },
      )
      .setOrigin(0.5);

    this.messageText = this.add
      .text(GAME_WIDTH / 2, 118, '', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffe8a8',
      })
      .setOrigin(0.5);

    this.slotRows = [];
    this.createBackButton();
    this.refreshSlots();
  }

  refreshSlots() {
    this.slotRows.forEach((row) => row.destroy(true));
    this.slotRows = [];

    const slots = listSaveSlots();
    const startY = 160;
    const rowH = 88;

    for (let i = 0; i < SAVE_SLOT_COUNT; i += 1) {
      const slot = slots[i];
      const y = startY + i * rowH;
      this.slotRows.push(this.createSlotRow(slot, y));
    }
  }

  createSlotRow(slot, y) {
    const container = this.add.container(GAME_WIDTH / 2, y);
    const isActive = slot.active;
    const bgColor = isActive ? 0x1a3a5c : 0x1a2434;
    const stroke = isActive ? 0x6eb6ff : 0x3a4a60;

    const bg = this.add
      .rectangle(0, 0, 920, 76, bgColor, 1)
      .setStrokeStyle(2, stroke);

    const icon = this.add
      .image(-420, 0, 'icon_save_folder')
      .setDisplaySize(34, 34)
      .setOrigin(0.5);
    if (!slot.empty) icon.setTint(0x6eb6ff);
    else icon.setTint(0x556677);

    const title = slot.empty
      ? `Slot ${slot.index + 1} — Empty`
      : `Slot ${slot.index + 1}`;
    const titleText = this.add
      .text(-390, -16, title, {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: isActive ? '#9fd0ff' : '#e8f0ff',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    const detail = slot.empty
      ? 'Fresh start — no cards bought yet'
      : `${slot.cards} cards · ${slot.coins} coins · ${slot.diamonds} diamonds`;
    const detailText = this.add
      .text(-390, 14, detail, {
        fontFamily: 'Arial',
        fontSize: '15px',
        color: '#9bb4d0',
      })
      .setOrigin(0, 0.5);

    const kids = [bg, icon, titleText, detailText];

    if (isActive) {
      const badge = this.add
        .text(80, -16, 'ACTIVE', {
          fontFamily: 'Arial',
          fontSize: '14px',
          color: '#6eb6ff',
          fontStyle: 'bold',
        })
        .setOrigin(0, 0.5);
      kids.push(badge);
    }

    kids.push(
      this.makeSmallButton(220, 0, 'Load', 0x2a6aad, () => this.onLoad(slot.index), isActive),
      this.makeSmallButton(340, 0, 'Save Here', 0x2a7a4a, () => this.onSaveHere(slot.index)),
      this.makeSmallButton(460, 0, 'Clear', 0x7a2a2a, () => this.onClear(slot.index), slot.empty),
    );

    container.add(kids);
    return container;
  }

  makeSmallButton(x, y, label, color, onClick, disabled = false) {
    const fill = disabled ? 0x333333 : color;
    const hover = disabled ? 0x333333 : Phaser.Display.Color.IntegerToColor(color).lighten(18).color;
    const container = this.add.container(x, y);
    const bg = this.add
      .rectangle(0, 0, 100, 36, fill, 1)
      .setStrokeStyle(1, disabled ? 0x444444 : 0xffffff, 0.35);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: disabled ? '#666666' : '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    container.add([bg, text]);

    if (!disabled && onClick) {
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => bg.setFillStyle(hover));
      bg.on('pointerout', () => bg.setFillStyle(fill));
      bg.on('pointerdown', () => onClick());
    }

    return container;
  }

  onLoad(index) {
    switchToSlot(index);
    const slots = listSaveSlots();
    const slot = slots[index];
    this.setMessage(
      slot.empty || (slot.cards === 0 && slot.coins === 0)
        ? `Loaded Slot ${index + 1} — fresh start.`
        : `Loaded Slot ${index + 1} — ${slot.cards} cards ready.`,
    );
    this.refreshSlots();
  }

  onSaveHere(index) {
    const active = getActiveSlotIndex();
    saveActiveToSlot(index);
    this.setMessage(
      index === active
        ? `Slot ${index + 1} updated.`
        : `Current progress saved into Slot ${index + 1}.`,
    );
    this.refreshSlots();
  }

  onClear(index) {
    clearSaveSlot(index);
    this.setMessage(`Slot ${index + 1} cleared.`);
    this.refreshSlots();
  }

  setMessage(text) {
    this.messageText.setText(text);
    this.time.delayedCall(2800, () => {
      if (this.messageText.active && this.messageText.text === text) {
        this.messageText.setText('');
      }
    });
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
