import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../data/constants.js';
import {
  listSaveSlots,
  switchToSlot,
  saveActiveToSlot,
  clearSaveSlot,
  getActiveSlotIndex,
  getSlotMeta,
  findEmptySlotIndex,
  writeMetaToSlot,
  SAVE_SLOT_COUNT,
} from '../data/meta.js';
import { cloudSaveSlot, cloudLoadSlot, normalizePassword, validatePassword } from '../systems/CloudSave.js';
import { Music } from '../systems/MusicManager.js';

const INPUT_STYLE =
  'width: 150px; height: 28px; font-size: 14px; font-family: Arial; padding: 2px 6px; border: 2px solid #3a5a7a; border-radius: 4px; background: #0e1824; color: #e8f0ff;';

export class SavesScene extends Phaser.Scene {
  constructor() {
    super('SavesScene');
  }

  create() {
    Music.play('chill');
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x101828);

    this.add
      .image(GAME_WIDTH / 2 - 70, 36, 'icon_save_folder')
      .setDisplaySize(32, 32)
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2 + 18, 36, 'Saves', {
        fontFamily: 'Arial',
        fontSize: '36px',
        color: '#6eb6ff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.hintText = this.add
      .text(
        GAME_WIDTH / 2,
        72,
        'Load a slot to play it. Set a password to sync that slot to other browsers.',
        {
          fontFamily: 'Arial',
          fontSize: '14px',
          color: '#9bb4d0',
        },
      )
      .setOrigin(0.5);

    this.messageText = this.add
      .text(GAME_WIDTH / 2, 96, '', {
        fontFamily: 'Arial',
        fontSize: '15px',
        color: '#ffe8a8',
      })
      .setOrigin(0.5);

    this.slotRows = [];
    this.slotPasswordInputs = [];
    this.createBackButton();
    this.createCloudLoadBar();
    this.refreshSlots();
  }

  createCloudLoadBar() {
    const y = GAME_HEIGHT - 118;
    this.add
      .rectangle(GAME_WIDTH / 2, y, 920, 64, 0x152030, 1)
      .setStrokeStyle(2, 0x3a5a7a);

    this.add
      .text(GAME_WIDTH / 2 - 430, y - 14, 'Load cloud password into an empty slot', {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#9bb4d0',
      })
      .setOrigin(0, 0.5);

    this.cloudLoadInput = this.add
      .dom(GAME_WIDTH / 2 - 80, y + 12, 'input', INPUT_STYLE, '')
      .setOrigin(0.5);
    if (this.cloudLoadInput.node) {
      this.cloudLoadInput.node.type = 'password';
      this.cloudLoadInput.node.placeholder = 'Cloud password';
      this.cloudLoadInput.node.autocomplete = 'off';
    }

    this.makeSmallButton(GAME_WIDTH / 2 + 120, y + 12, 'Load Cloud', 0x2a6aad, () => {
      this.onCloudLoad().catch((err) => this.setMessage(err?.message || 'Cloud load failed.'));
    });
  }

  refreshSlots() {
    this.slotRows.forEach((row) => row.destroy(true));
    this.slotRows = [];
    this.slotPasswordInputs.forEach((el) => {
      try {
        el.destroy();
      } catch {
        /* ignore */
      }
    });
    this.slotPasswordInputs = [];

    const slots = listSaveSlots();
    const startY = 130;
    const rowH = 74;

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
      .rectangle(0, 0, 920, 66, bgColor, 1)
      .setStrokeStyle(2, stroke);

    const icon = this.add
      .image(-420, -6, 'icon_save_folder')
      .setDisplaySize(30, 30)
      .setOrigin(0.5);
    if (!slot.empty) icon.setTint(0x6eb6ff);
    else icon.setTint(0x556677);

    const title = slot.empty ? `Slot ${slot.index + 1} — Empty` : `Slot ${slot.index + 1}`;
    const titleText = this.add
      .text(-390, -16, title, {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: isActive ? '#9fd0ff' : '#e8f0ff',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    const detail = slot.empty
      ? 'Fresh start — no cards bought yet'
      : `${slot.cards} cards · ${slot.coins} coins · ${slot.diamonds} diamonds`;
    const detailText = this.add
      .text(-390, 10, detail, {
        fontFamily: 'Arial',
        fontSize: '13px',
        color: '#9bb4d0',
      })
      .setOrigin(0, 0.5);

    const kids = [bg, icon, titleText, detailText];

    if (isActive) {
      const badge = this.add
        .text(40, -16, 'ACTIVE', {
          fontFamily: 'Arial',
          fontSize: '12px',
          color: '#6eb6ff',
          fontStyle: 'bold',
        })
        .setOrigin(0, 0.5);
      kids.push(badge);
    }

    kids.push(
                this.makeSmallButton(120, -10, 'Load', 0x2a6aad, () => this.onLoad(slot.index), isActive),
      this.makeSmallButton(220, -10, 'Save Here', 0x2a7a4a, () => this.onSaveHere(slot.index)),
      this.makeSmallButton(320, -10, 'Clear', 0x7a2a2a, () => this.onClear(slot.index), slot.empty),
    );

    // Password field + cloud save for this slot (world coords for DOM).
    const input = this.add
      .dom(GAME_WIDTH / 2 + 40, y + 14, 'input', INPUT_STYLE.replace('width: 150px', 'width: 140px'), '')
      .setOrigin(0.5);
    if (input.node) {
      input.node.type = 'password';
      input.node.placeholder = 'Password';
      input.node.autocomplete = 'off';
    }
    this.slotPasswordInputs.push(input);

    kids.push(
      this.makeSmallButton(400, 14, 'Cloud Save', 0x6a4a2a, () => {
        const password = normalizePassword(input.node?.value || '');
        this.onCloudSave(slot.index, password).catch((err) =>
          this.setMessage(err?.message || 'Cloud save failed.'),
        );
      }, slot.empty),
    );

    container.add(kids);
    return container;
  }

  makeSmallButton(x, y, label, color, onClick, disabled = false) {
    const fill = disabled ? 0x333333 : color;
    const hover = disabled ? 0x333333 : Phaser.Display.Color.IntegerToColor(color).lighten(18).color;
    const container = this.add.container(x, y);
    const bg = this.add
      .rectangle(0, 0, label.length > 8 ? 92 : 88, 30, fill, 1)
      .setStrokeStyle(1, disabled ? 0x444444 : 0xffffff, 0.35);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'Arial',
        fontSize: '12px',
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

  async onCloudSave(index, password) {
    const err = validatePassword(password);
    if (err) {
      this.setMessage(err);
      return;
    }
    const meta = getSlotMeta(index);
    if (!meta) {
      this.setMessage('Slot is empty — save progress here first.');
      return;
    }
    this.setMessage('Uploading cloud save…');
    await cloudSaveSlot(meta, password);
    this.setMessage(`Slot ${index + 1} saved to cloud. Use that password on any browser.`);
  }

  async onCloudLoad() {
    const password = normalizePassword(this.cloudLoadInput?.node?.value || '');
    const err = validatePassword(password);
    if (err) {
      this.setMessage(err);
      return;
    }
    const empty = findEmptySlotIndex();
    if (empty < 0) {
      this.setMessage('No empty slot available — clear one first.');
      return;
    }
    this.setMessage('Loading cloud save…');
    const meta = await cloudLoadSlot(password);
    writeMetaToSlot(empty, meta);
    this.setMessage(`Cloud save loaded into Slot ${empty + 1}.`);
    if (this.cloudLoadInput?.node) this.cloudLoadInput.node.value = '';
    this.refreshSlots();
  }

  setMessage(text) {
    this.messageText.setText(text);
    this.time.delayedCall(3200, () => {
      if (this.messageText.active && this.messageText.text === text) {
        this.messageText.setText('');
      }
    });
  }

  createBackButton() {
    const bg = this.add
      .rectangle(90, GAME_HEIGHT - 40, 140, 40, 0x2a5a28)
      .setStrokeStyle(2, 0x66aa66)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(90, GAME_HEIGHT - 40, 'Back', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    bg.on('pointerover', () => bg.setFillStyle(0x3a7a38));
    bg.on('pointerout', () => bg.setFillStyle(0x2a5a28));
    bg.on('pointerdown', () => this.scene.start('MenuScene'));
  }

  shutdown() {
    this.slotPasswordInputs.forEach((el) => {
      try {
        el.destroy();
      } catch {
        /* ignore */
      }
    });
    this.slotPasswordInputs = [];
    try {
      this.cloudLoadInput?.destroy();
    } catch {
      /* ignore */
    }
  }
}
