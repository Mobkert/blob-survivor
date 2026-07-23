import Phaser from 'phaser';
import { loadMeta, getActiveSlotIndex } from '../data/meta.js';
import { ShopItems } from '../data/shop.js';
import { Music, bindMusicUnlock } from '../systems/MusicManager.js';
import { CHANGELOG } from '../data/changelog.js';
import {
  DEFAULT_KEYBINDS,
  getKeybinds,
  setKeybinds,
  resetKeybinds,
  formatBindLabel,
  eventToBind,
  pointerToBind,
} from '../data/gameSettings.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../data/constants.js';

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

    this.createButton(width / 2, height * 0.36, 'Levels', () => {
      this.scene.start('LevelsScene');
    });

    this.createButton(width / 2, height * 0.45, 'Shop', () => {
      this.scene.start('ShopScene');
    });

    this.createButton(width / 2, height * 0.54, 'Deck', () => {
      this.scene.start('DeckScene');
    });

    this.createButton(
      width / 2,
      height * 0.63,
      'Forge',
      () => {
        this.scene.start('ForgeScene');
      },
      false,
      {
        color: 0x5a3a18,
        hoverColor: 0x7a5028,
        stroke: 0xc8a060,
      },
    );

    this.createButton(
      width / 2,
      height * 0.72,
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
      .text(width / 2, height * 0.81, `Coins: ${this.getCoins()}  ·  Slot ${getActiveSlotIndex() + 1}`, {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffd76a',
      })
      .setOrigin(0.5);

    const unlocked = loadMeta().unlocked || [];
    if (unlocked.includes('fortune') || unlocked.some((id) => ShopItems[id]?.name === 'Fortune')) {
      this.add
        .text(width / 2, height * 0.86, 'Fortune needs a ranged weapon to appear', {
          fontFamily: 'Arial',
          fontSize: '14px',
          color: '#ffd700',
        })
        .setOrigin(0.5);
    }

    this.hintText = this.add
      .text(width / 2, height * 0.94, this.buildControlsHint(), {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#778877',
      })
      .setOrigin(0.5);

    this.createSettingsButton(width - 44, 44);
    this.createChangelogButton(width - 108, 44);
    this.createQuestsSideButton(140, height * 0.42);

    this.settingsOpen = false;
    this.settingsPanel = null;
    this.changelogOpen = false;
    this.changelogPanel = null;
    this.waitingBindAction = null;

    this.time.delayedCall(280, () => {
      if (typeof window !== 'undefined' && window.__blobChangelogShown) return;
      if (typeof window !== 'undefined') window.__blobChangelogShown = true;
      this.openChangelogPopup(true);
    });
  }

  buildControlsHint() {
    const k = getKeybinds();
    return `${k.up}${k.left}${k.down}${k.right} move | ${formatBindLabel(k.attack)} attack | ${formatBindLabel(k.shield)} shield | ${formatBindLabel(k.special)} special`;
  }

  createChangelogButton(x, y) {
    const btn = this.add
      .circle(x, y, 26, 0x4a3820, 1)
      .setStrokeStyle(2, 0xd4b483)
      .setDepth(80)
      .setInteractive({ useHandCursor: true });

    // Scroll silhouette
    const scroll = this.add.graphics().setDepth(81);
    scroll.fillStyle(0xf0e0c0, 1);
    scroll.fillRoundedRect(x - 10, y - 14, 20, 28, 3);
    scroll.fillStyle(0xc8a060, 1);
    scroll.fillRoundedRect(x - 12, y - 16, 8, 32, 3);
    scroll.fillRoundedRect(x + 4, y - 16, 8, 32, 3);
    scroll.lineStyle(1, 0x8a7040, 0.8);
    scroll.strokeRoundedRect(x - 10, y - 14, 20, 28, 3);

    btn.on('pointerover', () => btn.setFillStyle(0x6a5030));
    btn.on('pointerout', () => btn.setFillStyle(0x4a3820));
    btn.on('pointerdown', () => {
      if (this.settingsOpen) this.closeSettingsPanel();
      if (this.changelogOpen) this.closeChangelogPopup();
      else this.openChangelogPopup(false);
    });

    this.changelogBtn = btn;
    this.changelogIcon = scroll;
  }

  openChangelogPopup(auto = false) {
    this.closeChangelogPopup();
    this.changelogOpen = true;

    const panelW = 520;
    const panelH = 420;
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const root = this.add.container(0, 0).setDepth(200);

    const dim = this.add
      .rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, auto ? 0.35 : 0.45)
      .setInteractive();
    dim.on('pointerdown', () => this.closeChangelogPopup());

    const parchment = this.add
      .rectangle(cx, cy, panelW, panelH, 0xf3e2c0, 0.98)
      .setStrokeStyle(3, 0x8a6230);
    parchment.setInteractive(); // block clicks through

    const title = this.add
      .text(cx, cy - panelH / 2 + 28, 'Update Log', {
        fontFamily: 'Georgia, serif',
        fontSize: '28px',
        color: '#5a3818',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const closeBtn = this.add
      .text(cx + panelW / 2 - 22, cy - panelH / 2 + 18, '✕', {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#8a6230',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.closeChangelogPopup());

    const maskShape = this.add
      .rectangle(cx, cy + 18, panelW - 40, panelH - 80, 0xffffff, 0)
      .setVisible(false);
    const geoMask = maskShape.createGeometryMask();

    const content = this.add.container(cx - panelW / 2 + 36, cy - panelH / 2 + 64);
    content.setMask(geoMask);

    let y = 0;
    CHANGELOG.forEach((entry, idx) => {
      const name = this.add.text(0, y, entry.name, {
        fontFamily: 'Georgia, serif',
        fontSize: '22px',
        color: idx === 0 ? '#7a4010' : '#5a3818',
        fontStyle: 'bold',
      });
      y += 28;
      if (entry.date) {
        content.add(
          this.add.text(0, y, entry.date, {
            fontFamily: 'Arial',
            fontSize: '13px',
            color: '#9a7850',
          }),
        );
        y += 22;
      }
      content.add(name);

      (entry.highlights || []).forEach((line) => {
        const bullet = this.add.text(0, y, `• ${line}`, {
          fontFamily: 'Arial',
          fontSize: '14px',
          color: '#4a3828',
          wordWrap: { width: panelW - 80 },
        });
        content.add(bullet);
        y += bullet.height + 8;
      });
      y += 18;
    });

    const contentH = y;
    const viewH = panelH - 80;
    let scrollY = 0;
    const maxScroll = Math.max(0, contentH - viewH);

    const onWheel = (_pointer, _gos, _dx, dy) => {
      if (!this.changelogOpen) return;
      scrollY = Phaser.Math.Clamp(scrollY + dy * 0.45, 0, maxScroll);
      content.y = cy - panelH / 2 + 64 - scrollY;
    };
    this.input.on('wheel', onWheel);
    this._changelogWheel = onWheel;

    if (maxScroll > 0) {
      const hint = this.add
        .text(cx, cy + panelH / 2 - 18, 'Scroll for older updates', {
          fontFamily: 'Arial',
          fontSize: '12px',
          color: '#9a7850',
        })
        .setOrigin(0.5);
      root.add(hint);
    }

    root.add([dim, parchment, title, closeBtn, content, maskShape]);
    this.changelogPanel = root;
    this._changelogMask = maskShape;
  }

  closeChangelogPopup() {
    this.changelogOpen = false;
    if (this._changelogWheel) {
      this.input.off('wheel', this._changelogWheel);
      this._changelogWheel = null;
    }
    this.changelogPanel?.destroy(true);
    this.changelogPanel = null;
    this._changelogMask?.destroy();
    this._changelogMask = null;
  }

  createQuestsSideButton(x, y) {
    const container = this.add.container(x, y).setDepth(50);
    const bg = this.add
      .rectangle(0, 0, 160, 200, 0x5a3a18, 1)
      .setStrokeStyle(3, 0xc8a060)
      .setInteractive({ useHandCursor: true });
    const label = this.add
      .text(0, 10, 'QUESTS', {
        fontFamily: 'Georgia, serif',
        fontSize: '22px',
        color: '#f5e6c8',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5);
    const sub = this.add
      .text(0, 48, 'Board', {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#d2b48c',
      })
      .setOrigin(0.5);

    bg.on('pointerover', () => bg.setFillStyle(0x7a5028));
    bg.on('pointerout', () => bg.setFillStyle(0x5a3a18));
    bg.on('pointerdown', () => this.scene.start('QuestBoardScene'));

    container.add([bg, label, sub]);
    this.addNewUpdateBadge(container, 55, -78);
    return container;
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
    this.closeChangelogPopup();
    this.settingsOpen = true;
    this.settingsTab = 'audio';
    this.waitingBindAction = null;

    const root = this.add.container(0, 0).setDepth(190);
    const dim = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a120a, 0.92)
      .setInteractive();

    const title = this.add
      .text(GAME_WIDTH / 2, 48, 'Settings', {
        fontFamily: 'Arial',
        fontSize: '36px',
        color: '#c8e8c8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const closeBtn = this.add
      .text(GAME_WIDTH - 48, 44, '✕', {
        fontFamily: 'Arial',
        fontSize: '28px',
        color: '#a8c8a8',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.closeSettingsPanel());

    root.add([dim, title, closeBtn]);

    this.settingsPanel = root;
    this.settingsBody = this.add.container(0, 0);
    root.add(this.settingsBody);

    this.buildSettingsTabs();
    this.renderSettingsTab();
  }

  buildSettingsTabs() {
    const tabs = [
      { id: 'audio', label: 'Audio', x: GAME_WIDTH / 2 - 90 },
      { id: 'gameplay', label: 'Gameplay', x: GAME_WIDTH / 2 + 90 },
    ];
    this.settingsTabButtons = [];
    tabs.forEach((tab) => {
      const bg = this.add
        .rectangle(tab.x, 100, 150, 42, 0x1a2a18, 1)
        .setStrokeStyle(2, 0x66aa66)
        .setInteractive({ useHandCursor: true });
      const label = this.add
        .text(tab.x, 100, tab.label, {
          fontFamily: 'Arial',
          fontSize: '18px',
          color: '#ddeedd',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      bg.on('pointerdown', () => {
        this.settingsTab = tab.id;
        this.waitingBindAction = null;
        this.renderSettingsTab();
      });
      this.settingsPanel.add([bg, label]);
      this.settingsTabButtons.push({ id: tab.id, bg, label });
    });
  }

  renderSettingsTab() {
    this.clearSettingsBody();
    (this.settingsTabButtons || []).forEach(({ id, bg }) => {
      bg.setFillStyle(id === this.settingsTab ? 0x2a5a28 : 0x1a2a18);
    });

    if (this.settingsTab === 'audio') this.renderAudioSettings();
    else this.renderGameplaySettings();
  }

  clearSettingsBody() {
    if (this._volumeMove) {
      this.input.off('pointermove', this._volumeMove);
      this._volumeMove = null;
    }
    if (this._volumeUp) {
      this.input.off('pointerup', this._volumeUp);
      this._volumeUp = null;
    }
    if (this._bindKeyHandler) {
      this.input.keyboard?.off('keydown', this._bindKeyHandler);
      this._bindKeyHandler = null;
    }
    if (this._bindPointerHandler) {
      this.input.off('pointerdown', this._bindPointerHandler);
      this._bindPointerHandler = null;
    }
    this.settingsBody?.removeAll(true);
  }

  renderAudioSettings() {
    const cx = GAME_WIDTH / 2;
    const label = this.add
      .text(cx, 180, 'Music Volume', {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#a8c8a8',
      })
      .setOrigin(0.5);

    const barW = 360;
    const barH = 18;
    const barY = 240;

    const track = this.add
      .rectangle(cx, barY, barW, barH, 0x223322, 1)
      .setStrokeStyle(2, 0x557755)
      .setInteractive({ useHandCursor: true });

    const fill = this.add
      .rectangle(cx - barW / 2, barY, 1, barH - 2, 0x55cc66, 1)
      .setOrigin(0, 0.5);

    const knob = this.add
      .circle(cx, barY, 14, 0xe8ffe8, 1)
      .setStrokeStyle(2, 0x66aa66)
      .setInteractive({ useHandCursor: true });

    const valueText = this.add
      .text(cx, 290, '', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ddeedd',
      })
      .setOrigin(0.5);

    const applyVolumeVisual = (vol) => {
      const v = Math.max(0, Math.min(1, vol));
      fill.width = Math.max(2, barW * v);
      knob.x = cx - barW / 2 + barW * v;
      valueText.setText(`${Math.round(v * 100)}%`);
    };

    const setFromPointer = (pointer) => {
      const left = cx - barW / 2;
      const t = Math.max(0, Math.min(1, (pointer.x - left) / barW));
      Music.unlock();
      Music.setVolume(t);
      applyVolumeVisual(t);
    };

    applyVolumeVisual(Music.getVolume());

    const onPointerDown = (pointer) => {
      this._volumeDragging = true;
      setFromPointer(pointer);
    };
    const onPointerMove = (pointer) => {
      if (!this._volumeDragging || !this.settingsOpen) return;
      setFromPointer(pointer);
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

    this.settingsBody.add([label, track, fill, knob, valueText]);
  }

  renderGameplaySettings() {
    const cx = GAME_WIDTH / 2;
    const actions = [
      { id: 'up', label: 'Move Up' },
      { id: 'down', label: 'Move Down' },
      { id: 'left', label: 'Move Left' },
      { id: 'right', label: 'Move Right' },
      { id: 'attack', label: 'Attack' },
      { id: 'shield', label: 'Shield' },
      { id: 'special', label: 'Special' },
    ];

    const header = this.add
      .text(cx, 160, 'Keybinds — click a bind, then press a key or mouse button', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#88aa88',
      })
      .setOrigin(0.5);
    this.settingsBody.add(header);

    const binds = getKeybinds();
    this._bindRows = [];

    actions.forEach((action, i) => {
      const y = 210 + i * 48;
      const name = this.add
        .text(cx - 200, y, action.label, {
          fontFamily: 'Arial',
          fontSize: '18px',
          color: '#c8e8c8',
        })
        .setOrigin(0, 0.5);

      const btn = this.add
        .rectangle(cx + 120, y, 160, 36, 0x1a2a18, 1)
        .setStrokeStyle(2, 0x66aa66)
        .setInteractive({ useHandCursor: true });
      const val = this.add
        .text(cx + 120, y, formatBindLabel(binds[action.id]), {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      btn.on('pointerdown', (pointer) => {
        pointer.event?.stopPropagation?.();
        this.beginRebind(action.id, val, btn);
      });

      this.settingsBody.add([name, btn, val]);
      this._bindRows.push({ id: action.id, val, btn });
    });

    const resetBtn = this.add
      .rectangle(cx, 580, 220, 48, 0x4a2a18, 1)
      .setStrokeStyle(2, 0xcc8866)
      .setInteractive({ useHandCursor: true });
    const resetText = this.add
      .text(cx, 580, 'Reset Keybinds', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffccaa',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    resetBtn.on('pointerover', () => resetBtn.setFillStyle(0x6a3a28));
    resetBtn.on('pointerout', () => resetBtn.setFillStyle(0x4a2a18));
    resetBtn.on('pointerdown', () => {
      resetKeybinds();
      this.waitingBindAction = null;
      this.renderSettingsTab();
      this.hintText?.setText(this.buildControlsHint());
    });
    this.settingsBody.add([resetBtn, resetText]);
  }

  beginRebind(actionId, valText, btn) {
    this.waitingBindAction = actionId;
    valText.setText('...');
    btn.setFillStyle(0x3a5a28);

    if (this._bindKeyHandler) {
      this.input.keyboard?.off('keydown', this._bindKeyHandler);
    }
    if (this._bindPointerHandler) {
      this.input.off('pointerdown', this._bindPointerHandler);
    }

    const finish = (bind) => {
      if (!bind || !this.waitingBindAction) return;
      const next = { ...getKeybinds(), [this.waitingBindAction]: bind };
      // Avoid duplicate keys on keyboard actions (mouse can share with keys).
      for (const [k, v] of Object.entries(next)) {
        if (k !== this.waitingBindAction && v === bind && !['attack', 'shield'].includes(k)) {
          next[k] = DEFAULT_KEYBINDS[k];
        }
      }
      setKeybinds(next);
      this.waitingBindAction = null;
      if (this._bindKeyHandler) {
        this.input.keyboard?.off('keydown', this._bindKeyHandler);
        this._bindKeyHandler = null;
      }
      if (this._bindPointerHandler) {
        this.input.off('pointerdown', this._bindPointerHandler);
        this._bindPointerHandler = null;
      }
      this.renderSettingsTab();
      this.hintText?.setText(this.buildControlsHint());
    };

    this._bindKeyHandler = (event) => {
      if (!this.waitingBindAction) return;
      if (event.key === 'Escape') {
        this.waitingBindAction = null;
        this.renderSettingsTab();
        return;
      }
      const bind = eventToBind(event);
      if (bind) {
        event.preventDefault?.();
        finish(bind);
      }
    };

    this._bindPointerHandler = (pointer) => {
      if (!this.waitingBindAction) return;
      // Ignore clicks on UI for a frame — only accept after starting wait
      const bind = pointerToBind(pointer);
      if (bind && (this.waitingBindAction === 'attack' || this.waitingBindAction === 'shield')) {
        finish(bind);
      }
    };

    // Delay mouse listen so the click that started rebind doesn't instantly bind
    this.time.delayedCall(180, () => {
      if (!this.waitingBindAction) return;
      this.input.keyboard?.on('keydown', this._bindKeyHandler);
      this.input.on('pointerdown', this._bindPointerHandler);
    });
  }

  closeSettingsPanel() {
    this.settingsOpen = false;
    this._volumeDragging = false;
    this.waitingBindAction = null;
    this.clearSettingsBody();
    this.settingsPanel?.destroy(true);
    this.settingsPanel = null;
    this.settingsBody = null;
    this.settingsTabButtons = null;
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

  addNewUpdateBadge(parent, ox = 118, oy = -22) {
    const badge = this.add
      .text(ox, oy, 'New Update', {
        fontFamily: 'Arial',
        fontSize: '13px',
        color: '#ffe14a',
        fontStyle: 'bold',
        stroke: '#5a4000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setAngle(18)
      .setDepth(60);

    parent.add(badge);

    this.tweens.add({
      targets: badge,
      scale: { from: 0.92, to: 1.18 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
