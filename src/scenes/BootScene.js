import Phaser from 'phaser';
import { TILE_SIZE } from '../data/constants.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    this.generateTextures();
    this.scene.start('LoadingScene', {
      durationMs: 6000,
      nextScene: 'MenuScene',
    });
  }

  generateTextures() {
    this.createPlayerTexture();
    this.createWeaponTextures();
    this.createEnemyTextures();
    this.createProjectileTexture();
    this.createXpOrbTexture();
    this.createCoinTexture();
    this.createTileTextures();
    this.createSaveFolderIcon();
    this.createCardPickupTexture();
    this.createSettingsGearIcon();
    this.createLevelIcons();
  }

  createLevelIcons() {
    // Plains: green checkered floor like the arena grass
    {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const a = 0x3d7a37;
      const b = 0x4a8f42;
      const s = 16;
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          g.fillStyle((row + col) % 2 === 0 ? a : b, 1);
          g.fillRect(col * s, row * s, s, s);
        }
      }
      g.generateTexture('level_icon_plains', 64, 64);
      g.destroy();
    }

    // Locked / coming soon: grey checkered floor
    {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const a = 0x3a3a3a;
      const b = 0x4a4a4a;
      const s = 16;
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          g.fillStyle((row + col) % 2 === 0 ? a : b, 1);
          g.fillRect(col * s, row * s, s, s);
        }
      }
      g.generateTexture('level_icon_locked', 64, 64);
      g.destroy();
    }
  }

  createSettingsGearIcon() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xd0d8e0, 1);
    g.fillCircle(16, 16, 7);
    g.lineStyle(5, 0xd0d8e0, 1);
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8;
      const x1 = 16 + Math.cos(a) * 8;
      const y1 = 16 + Math.sin(a) * 8;
      const x2 = 16 + Math.cos(a) * 14;
      const y2 = 16 + Math.sin(a) * 14;
      g.lineBetween(x1, y1, x2, y2);
    }
    g.fillStyle(0x1a2a14, 1);
    g.fillCircle(16, 16, 4);
    g.generateTexture('icon_settings_gear', 32, 32);
    g.destroy();
  }

  createCardPickupTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xf5e6c8, 1);
    g.fillRoundedRect(2, 2, 28, 40, 3);
    g.lineStyle(2, 0xffd76a, 1);
    g.strokeRoundedRect(2, 2, 28, 40, 3);
    g.fillStyle(0xffffff, 0.35);
    g.fillRect(5, 5, 22, 10);
    g.fillStyle(0xd4a84b, 1);
    g.fillCircle(16, 24, 6);
    g.fillStyle(0xfff0c0, 1);
    g.fillCircle(14, 22, 2);
    g.generateTexture('card_pickup', 32, 44);
    g.destroy();
  }

  createSaveFolderIcon() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // Folder body
    g.fillStyle(0x4a9fff, 1);
    g.fillRoundedRect(2, 12, 28, 18, 3);
    // Folder tab
    g.fillStyle(0x6eb6ff, 1);
    g.fillRoundedRect(2, 6, 12, 8, 2);
    // Inner paper
    g.fillStyle(0xd6eaff, 1);
    g.fillRect(7, 16, 18, 10);
    // Disk / save mark
    g.fillStyle(0x1a4a88, 1);
    g.fillCircle(16, 21, 4);
    g.fillStyle(0xffffff, 1);
    g.fillRect(14, 18, 4, 3);
    g.generateTexture('icon_save_folder', 32, 32);
    g.destroy();
  }

  createPlayerTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x66ccff, 1);
    g.fillCircle(16, 16, 16);
    g.fillStyle(0x99eeff, 0.6);
    g.fillCircle(12, 12, 6);
    g.generateTexture('player', 32, 32);
    g.destroy();
  }

  createWeaponTextures() {
    this.drawShortbow();
    this.drawRevolver();
    this.drawCrossbow();
    this.drawSword();
    this.drawAxe();
    this.drawSpear();
    this.drawBomb();
    this.drawGrenade();
    this.drawShockwave();
  }

  drawShortbow() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.lineStyle(3, 0x8b6914, 1);
    g.beginPath();
    g.arc(16, 16, 14, Phaser.Math.DegToRad(-70), Phaser.Math.DegToRad(70), false);
    g.strokePath();
    g.lineStyle(2, 0xccccaa, 1);
    g.lineBetween(16, 16, 30, 16);
    g.generateTexture('weapon_shortbow', 32, 32);
    g.destroy();
  }

  drawRevolver() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x444455, 1);
    g.fillRect(4, 14, 18, 8);
    g.fillStyle(0x666677, 1);
    g.fillRect(18, 10, 16, 6);
    g.fillStyle(0x333344, 1);
    g.fillRect(8, 22, 8, 10);
    g.generateTexture('weapon_revolver', 36, 36);
    g.destroy();
  }

  drawCrossbow() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x553322, 1);
    g.fillRect(14, 8, 6, 20);
    g.lineStyle(3, 0x664433, 1);
    g.lineBetween(4, 12, 28, 12);
    g.lineBetween(4, 24, 28, 24);
    g.lineStyle(2, 0xaaaaaa, 1);
    g.lineBetween(16, 12, 30, 18);
    g.generateTexture('weapon_crossbow', 34, 34);
    g.destroy();
  }

  drawSword() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x888899, 1);
    g.fillRect(4, 14, 8, 8);
    g.fillStyle(0xccccdd, 1);
    g.fillRect(10, 6, 6, 24);
    g.fillStyle(0xeeeeff, 1);
    g.fillTriangle(13, 2, 10, 6, 16, 6);
    g.generateTexture('weapon_sword', 28, 32);
    g.destroy();
  }

  drawAxe() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x664422, 1);
    g.fillRect(6, 10, 5, 20);
    g.fillStyle(0xaa6644, 1);
    g.fillTriangle(10, 6, 10, 22, 24, 14);
    g.generateTexture('weapon_axe', 28, 32);
    g.destroy();
  }

  drawSpear() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x664422, 1);
    g.fillRect(6, 18, 4, 14);
    g.fillStyle(0x8899aa, 1);
    g.fillRect(6, 4, 4, 18);
    g.fillStyle(0xccddee, 1);
    g.fillTriangle(8, 2, 5, 8, 11, 8);
    g.generateTexture('weapon_spear', 16, 36);
    g.destroy();
  }

  drawBomb() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x222222, 1);
    g.fillCircle(14, 16, 12);
    g.fillStyle(0x333333, 1);
    g.fillCircle(10, 12, 3);
    g.lineStyle(2, 0x884422, 1);
    g.lineBetween(14, 4, 18, 0);
    g.fillStyle(0xffaa44, 1);
    g.fillCircle(18, 0, 3);
    g.generateTexture('weapon_bomb', 28, 28);
    g.generateTexture('bomb_placed', 28, 28);
    g.destroy();
  }

  drawGrenade() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x446633, 1);
    g.fillEllipse(14, 18, 12, 14);
    g.fillStyle(0x555544, 1);
    g.fillRect(10, 6, 8, 6);
    g.fillStyle(0xcccccc, 1);
    g.fillRect(12, 4, 4, 3);
    g.generateTexture('weapon_grenade', 28, 32);
    g.destroy();
  }

  drawShockwave() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.lineStyle(3, 0x6688ff, 0.9);
    g.strokeCircle(16, 16, 12);
    g.lineStyle(2, 0xaaccff, 0.6);
    g.strokeCircle(16, 16, 7);
    g.generateTexture('weapon_shockwave', 32, 32);
    g.destroy();
  }

  createEnemyTextures() {
    const enemies = [
      { key: 'enemy_zombie', color: 0x4a7a3a, size: 36 },
      { key: 'enemy_runner', color: 0xc44a4a, size: 36 },
      { key: 'enemy_brute', color: 0x553366, size: 36 },
    ];

    enemies.forEach(({ key, color, size }) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const r = size / 2;
      g.fillStyle(color, 1);
      g.fillCircle(r, r, r);
      g.fillStyle(0x000000, 1);
      g.fillCircle(r - 6, r - 4, 3);
      g.fillCircle(r + 6, r - 4, 3);
      g.generateTexture(key, size, size);
      g.destroy();
    });

    // Goblin King — larger crowned blob
    {
      const size = 96;
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const r = 40;
      g.fillStyle(0x1a5c28, 1);
      g.fillCircle(48, 52, r);
      g.fillStyle(0x2d8a3e, 1);
      g.fillCircle(48, 48, r - 4);
      g.fillStyle(0xd4a017, 1);
      g.fillTriangle(28, 28, 38, 8, 48, 28);
      g.fillTriangle(48, 28, 58, 4, 68, 28);
      g.fillTriangle(40, 28, 48, 12, 56, 28);
      g.fillStyle(0x000000, 1);
      g.fillCircle(36, 46, 5);
      g.fillCircle(60, 46, 5);
      g.fillStyle(0xff3344, 1);
      g.fillCircle(36, 46, 2);
      g.fillCircle(60, 46, 2);
      g.fillStyle(0x0a3012, 1);
      g.fillEllipse(48, 62, 18, 8);
      g.generateTexture('enemy_goblinKing', size, size);
      g.destroy();
    }

    const wizards = [
      { key: 'enemy_wizard', body: 0x4488ff, hat: 0x2266dd },
      { key: 'enemy_darkWizard', body: 0x5522aa, hat: 0x330066 },
      { key: 'enemy_healWizard', body: 0x44dd88, hat: 0x22aa55 },
      { key: 'enemy_lightningWizard', body: 0xffcc44, hat: 0xddaa22 },
    ];

    wizards.forEach(({ key, body, hat }) => {
      const size = 40;
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(body, 1);
      g.fillCircle(20, 24, 14);
      g.fillStyle(hat, 1);
      g.fillTriangle(10, 18, 20, 2, 30, 18);
      g.fillStyle(0x222222, 1);
      g.fillCircle(15, 22, 2.5);
      g.fillCircle(25, 22, 2.5);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(20, 8, 2);
      g.generateTexture(key, size, size);
      g.destroy();
    });
  }

  createProjectileTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffee88, 1);
    g.fillCircle(5, 5, 5);
    g.generateTexture('projectile', 10, 10);
    g.destroy();
  }

  createXpOrbTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x44ffaa, 1);
    g.fillCircle(6, 6, 6);
    g.generateTexture('xp_orb', 12, 12);
    g.destroy();
  }

  createCoinTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffd24a, 1);
    g.fillCircle(8, 8, 8);
    g.fillStyle(0xfff0a0, 1);
    g.fillCircle(6, 6, 3);
    g.lineStyle(2, 0xc99410, 1);
    g.strokeCircle(8, 8, 8);
    g.generateTexture('coin', 16, 16);
    g.destroy();
  }

  createTileTextures() {
    const greens = [0x3d7a37, 0x4a8f42, 0x356832, 0x5aa852, 0x2f5e2b];

    greens.forEach((color, index) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(color, 1);
      g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

      const accent = Phaser.Display.Color.ValueToColor(color).lighten(10).color;
      g.fillStyle(accent, 0.25);
      for (let i = 0; i < 6; i++) {
        const x = Phaser.Math.Between(0, TILE_SIZE - 8);
        const y = Phaser.Math.Between(0, TILE_SIZE - 8);
        g.fillRect(x, y, 4, 4);
      }

      g.generateTexture(`tile_${index}`, TILE_SIZE, TILE_SIZE);
      g.destroy();
    });
  }
}
