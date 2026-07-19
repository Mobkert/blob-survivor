import Phaser from 'phaser';
import { TILE_SIZE } from '../data/constants.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Art weapons (transparent PNGs) — baked to in-game sizes in create().
    this.load.image('art_weapon_shortbow', 'images/weapon_shortbow_art.png');
    this.load.image('art_weapon_revolver', 'images/weapon_revolver_art.png');
    this.load.image('art_weapon_crossbow', 'images/weapon_crossbow_art.png');
    this.load.image('art_weapon_assaultrifle', 'images/weapon_assaultrifle_art.png');
    this.load.image('art_weapon_sword', 'images/weapon_sword_art.png');
    this.load.image('art_weapon_axe', 'images/weapon_axe_art.png');
    this.load.image('art_weapon_spear', 'images/weapon_spear_art.png');
    this.load.image('art_weapon_mace', 'images/weapon_mace_art.png');
    this.load.image('art_weapon_molotov', 'images/weapon_molotov_art.png');
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

    // Volcanic Ridge: red / brown / black checkered ash
    {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const a = 0x5a1810;
      const b = 0x2a1008;
      const s = 16;
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          g.fillStyle((row + col) % 2 === 0 ? a : b, 1);
          g.fillRect(col * s, row * s, s, s);
        }
      }
      g.fillStyle(0xff4400, 0.55);
      g.fillCircle(20, 44, 5);
      g.fillStyle(0xffaa33, 0.7);
      g.fillCircle(44, 18, 4);
      g.generateTexture('level_icon_volcanic', 64, 64);
      g.destroy();
    }

    // Frozen Tundra: blue / white / light-blue ice
    {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const a = 0x6ab0d8;
      const b = 0xe8f4ff;
      const s = 16;
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          g.fillStyle((row + col) % 2 === 0 ? a : b, 1);
          g.fillRect(col * s, row * s, s, s);
        }
      }
      g.fillStyle(0xaaddff, 0.7);
      g.fillTriangle(12, 52, 20, 28, 28, 52);
      g.fillStyle(0xffffff, 0.85);
      g.fillTriangle(38, 48, 46, 22, 54, 48);
      g.generateTexture('level_icon_tundra', 64, 64);
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

    this.createCrowTexture();
  }

  createCrowTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // Simple side-view crow silhouette
    g.fillStyle(0x0d0d12, 1);
    g.fillEllipse(14, 16, 16, 10);
    g.fillTriangle(22, 16, 30, 14, 22, 18);
    g.fillTriangle(8, 14, 2, 10, 10, 16);
    g.fillTriangle(8, 18, 2, 22, 10, 16);
    g.fillStyle(0x1a1a22, 1);
    g.fillCircle(18, 13, 2);
    g.generateTexture('fx_crow', 32, 32);
    g.destroy();
  }

  createWeaponTextures() {
    // Match previous procedural texture sizes; melee arts are tip-up so rotate 90° to aim +X.
    if (!this.bakeWeaponArt('art_weapon_shortbow', 'weapon_shortbow', 32, 32, 0)) this.drawShortbow();
    if (!this.bakeWeaponArt('art_weapon_revolver', 'weapon_revolver', 36, 36, 0)) this.drawRevolver();
    if (!this.bakeWeaponArt('art_weapon_crossbow', 'weapon_crossbow', 34, 34, 0)) this.drawCrossbow();
    if (!this.bakeWeaponArt('art_weapon_assaultrifle', 'weapon_assaultRifle', 48, 28, 0)) this.drawAssaultRifle();
    if (!this.bakeWeaponArt('art_weapon_sword', 'weapon_sword', 28, 32, 90)) this.drawSword();
    if (!this.bakeWeaponArt('art_weapon_axe', 'weapon_axe', 28, 32, 90)) this.drawAxe();
    if (!this.bakeWeaponArt('art_weapon_spear', 'weapon_spear', 64, 22, 90)) this.drawSpear();
    if (!this.bakeWeaponArt('art_weapon_mace', 'weapon_mace', 36, 48, 90)) this.drawMace();
    this.drawBomb();
    this.drawGrenade();
    if (!this.bakeWeaponArt('art_weapon_molotov', 'weapon_molotov', 24, 36, 0)) this.drawMolotov();
    this.drawShockwave();
  }

  /**
   * Scale art into a fixed-size canvas texture (same size as old procedural weapons).
   * @returns {boolean} true if baked from art
   */
  bakeWeaponArt(srcKey, destKey, w, h, rotateDeg = 0) {
    if (!this.textures.exists(srcKey)) return false;
    if (this.textures.exists(destKey)) this.textures.remove(destKey);

    const src = this.textures.get(srcKey).getSourceImage();
    const canvasTex = this.textures.createCanvas(destKey, w, h);
    const ctx = canvasTex.getContext();
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    if (rotateDeg) ctx.rotate((rotateDeg * Math.PI) / 180);

    const rad = (rotateDeg * Math.PI) / 180;
    const bw = Math.abs(src.width * Math.cos(rad)) + Math.abs(src.height * Math.sin(rad));
    const bh = Math.abs(src.width * Math.sin(rad)) + Math.abs(src.height * Math.cos(rad));
    const scale = Math.min(w / Math.max(1, bw), h / Math.max(1, bh));
    const dw = src.width * scale;
    const dh = src.height * scale;
    ctx.drawImage(src, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
    canvasTex.refresh();
    return true;
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

  drawAssaultRifle() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x8b6914, 1);
    g.fillRect(2, 10, 10, 8);
    g.fillStyle(0x9999aa, 1);
    g.fillRect(12, 10, 22, 8);
    g.fillStyle(0x8b6914, 1);
    g.fillRect(18, 18, 6, 10);
    g.fillStyle(0x444455, 1);
    g.fillRect(20, 18, 5, 12);
    g.fillStyle(0xaaaaaa, 1);
    g.fillRect(34, 12, 12, 4);
    g.generateTexture('weapon_assaultRifle', 48, 28);
    g.destroy();
  }

  drawMace() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x9999aa, 1);
    g.fillCircle(18, 12, 12);
    g.fillStyle(0xbbbbcc, 1);
    g.fillCircle(18, 12, 8);
    g.fillStyle(0x555566, 1);
    g.fillRect(15, 22, 6, 6);
    g.fillStyle(0x8b6914, 1);
    g.fillRect(15, 28, 6, 14);
    g.fillStyle(0x444455, 1);
    g.fillRect(15, 42, 6, 4);
    g.generateTexture('weapon_mace', 36, 48);
    g.destroy();
  }

  drawMolotov() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x2a6622, 1);
    g.fillRect(6, 12, 12, 20);
    g.fillStyle(0x3a8833, 1);
    g.fillRect(8, 8, 8, 6);
    g.fillStyle(0xd4b483, 1);
    g.fillRect(5, 2, 10, 8);
    g.fillStyle(0xe8d4b0, 1);
    g.fillRect(8, 22, 6, 6);
    g.generateTexture('weapon_molotov', 24, 36);
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

    // Ice wizard
    {
      const size = 40;
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x88ccee, 1);
      g.fillCircle(20, 24, 14);
      g.fillStyle(0xe8f6ff, 1);
      g.fillTriangle(10, 18, 20, 2, 30, 18);
      g.fillStyle(0xaaddff, 0.85);
      g.fillTriangle(14, 16, 20, 6, 26, 16);
      g.fillStyle(0x224466, 1);
      g.fillCircle(15, 22, 2.5);
      g.fillCircle(25, 22, 2.5);
      g.fillStyle(0xffffff, 0.95);
      g.fillCircle(20, 8, 2.5);
      g.fillStyle(0xccf0ff, 0.7);
      g.fillCircle(8, 28, 3);
      g.fillCircle(32, 28, 3);
      g.generateTexture('enemy_iceWizard', size, size);
      g.destroy();
    }

    this.drawMagmaCube('enemy_magmaCube', 36, 0xdd4422, 0x881100);
    this.drawMagmaCube('enemy_magmaBrute', 44, 0x882200, 0x440800);
    this.drawMagmaCube('enemy_magmaSpitter', 36, 0xff6622, 0xaa3300);
    this.drawKingMagmaCube();

    this.drawIceCube('enemy_iceCubeSmall', 30, 0x88ddff, 0x55aacc);
    this.drawIceCube('enemy_iceCubeMedium', 36, 0x66ccee, 0x4499bb);
    this.drawIceCube('enemy_iceCubeBig', 48, 0xaadfff, 0x77bbdd);
    this.drawYeti();
    this.drawIceSpikeTextures();
  }

  drawIceCube(key, size, body, shade) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const pad = 2;
    g.fillStyle(shade, 1);
    g.fillRoundedRect(pad + 2, pad + 2, size - pad * 2, size - pad * 2, 5);
    g.fillStyle(body, 0.92);
    g.fillRoundedRect(pad, pad, size - pad * 2 - 2, size - pad * 2 - 2, 5);
    g.fillStyle(0xffffff, 0.45);
    g.fillRoundedRect(pad + 3, pad + 3, (size - pad * 2) * 0.4, (size - pad * 2) * 0.3, 3);
    const eyeY = size * 0.42;
    const eyeR = Math.max(2.2, size * 0.07);
    g.fillStyle(0x224466, 1);
    g.fillCircle(size * 0.35, eyeY, eyeR);
    g.fillCircle(size * 0.65, eyeY, eyeR);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(size * 0.35, eyeY, eyeR * 0.4);
    g.fillCircle(size * 0.65, eyeY, eyeR * 0.4);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  drawYeti() {
    const size = 108;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // Body
    g.fillStyle(0xb8d0e8, 1);
    g.fillEllipse(54, 62, 78, 72);
    g.fillStyle(0xe8f4ff, 1);
    g.fillEllipse(54, 58, 68, 62);
    // Belly
    g.fillStyle(0xffffff, 0.85);
    g.fillEllipse(54, 70, 36, 30);
    // Head
    g.fillStyle(0xd8e8f8, 1);
    g.fillCircle(54, 34, 28);
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(54, 30, 18);
    // Horns / tufts
    g.fillStyle(0x88aacc, 1);
    g.fillTriangle(28, 28, 34, 8, 42, 26);
    g.fillTriangle(66, 26, 74, 8, 80, 28);
    // Eyes
    g.fillStyle(0x223344, 1);
    g.fillCircle(44, 34, 5);
    g.fillCircle(64, 34, 5);
    g.fillStyle(0x88eeff, 1);
    g.fillCircle(44, 34, 2);
    g.fillCircle(64, 34, 2);
    // Arms
    g.fillStyle(0xc8dcec, 1);
    g.fillEllipse(18, 62, 22, 16);
    g.fillEllipse(90, 62, 22, 16);
    g.generateTexture('enemy_yeti', size, size);
    g.destroy();
  }

  drawIceSpikeTextures() {
    // Obstacle spike (taller)
    {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x6a9ec8, 1);
      g.fillTriangle(20, 64, 8, 18, 32, 18);
      g.fillStyle(0xcceeff, 1);
      g.fillTriangle(20, 60, 12, 20, 28, 20);
      g.fillStyle(0xffffff, 0.75);
      g.fillTriangle(20, 52, 16, 22, 24, 22);
      g.fillStyle(0x88bbdd, 0.9);
      g.fillEllipse(20, 60, 18, 8);
      g.generateTexture('obstacle_ice_spike', 40, 68);
      g.destroy();
    }
    // Falling FX spike
    {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xaaddff, 1);
      g.fillTriangle(12, 4, 4, 36, 20, 36);
      g.fillStyle(0xffffff, 0.8);
      g.fillTriangle(12, 8, 8, 32, 16, 32);
      g.generateTexture('fx_ice_spike', 24, 40);
      g.destroy();
    }
  }

  drawMagmaCube(key, size, body, shade) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const pad = 2;
    g.fillStyle(shade, 1);
    g.fillRoundedRect(pad + 2, pad + 2, size - pad * 2, size - pad * 2, 4);
    g.fillStyle(body, 1);
    g.fillRoundedRect(pad, pad, size - pad * 2 - 2, size - pad * 2 - 2, 4);
    g.fillStyle(0xffaa44, 0.45);
    g.fillRoundedRect(pad + 3, pad + 3, (size - pad * 2) * 0.45, (size - pad * 2) * 0.35, 3);
    const eyeY = size * 0.42;
    const eyeR = Math.max(2.5, size * 0.08);
    g.fillStyle(0x111111, 1);
    g.fillCircle(size * 0.35, eyeY, eyeR);
    g.fillCircle(size * 0.65, eyeY, eyeR);
    g.fillStyle(0xffee88, 1);
    g.fillCircle(size * 0.35, eyeY, eyeR * 0.45);
    g.fillCircle(size * 0.65, eyeY, eyeR * 0.45);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  drawKingMagmaCube() {
    const size = 100;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x3a0800, 1);
    g.fillRoundedRect(10, 14, 80, 78, 8);
    g.fillStyle(0xcc2200, 1);
    g.fillRoundedRect(8, 10, 78, 76, 8);
    g.fillStyle(0xff5522, 1);
    g.fillRoundedRect(14, 16, 66, 58, 6);
    g.fillStyle(0xffaa44, 0.5);
    g.fillRoundedRect(18, 20, 30, 22, 4);
    g.fillStyle(0x111111, 1);
    g.fillCircle(34, 48, 9);
    g.fillCircle(66, 48, 9);
    g.fillStyle(0xffee66, 1);
    g.fillCircle(34, 48, 4);
    g.fillCircle(66, 48, 4);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(32, 46, 1.5);
    g.fillCircle(64, 46, 1.5);
    g.fillStyle(0xff3300, 0.7);
    g.fillEllipse(50, 72, 22, 8);
    g.generateTexture('enemy_kingMagmaCube', size, size);
    g.destroy();
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

    // Volcanic Ridge: red / brown / black ash floor
    const volcanic = [0x2a1008, 0x4a1810, 0x1a0808, 0x5a2210, 0x3a140c];
    volcanic.forEach((color, index) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(color, 1);
      g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

      g.fillStyle(0x111111, 0.35);
      for (let i = 0; i < 5; i++) {
        const x = Phaser.Math.Between(0, TILE_SIZE - 10);
        const y = Phaser.Math.Between(0, TILE_SIZE - 10);
        g.fillRect(x, y, 6, 4);
      }

      g.fillStyle(0xff4400, 0.22);
      for (let i = 0; i < 3; i++) {
        const x = Phaser.Math.Between(4, TILE_SIZE - 8);
        const y = Phaser.Math.Between(4, TILE_SIZE - 8);
        g.fillCircle(x, y, 2 + (i % 2));
      }

      g.generateTexture(`vtile_${index}`, TILE_SIZE, TILE_SIZE);
      g.destroy();
    });

    // Frozen Tundra: blue / white / light-blue ice floor
    const tundra = [0x4a8ab0, 0xe8f4ff, 0x7eb8d8, 0xc8e8f8, 0x5a9cc4];
    tundra.forEach((color, index) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(color, 1);
      g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

      g.fillStyle(0xffffff, 0.28);
      for (let i = 0; i < 5; i++) {
        const x = Phaser.Math.Between(0, TILE_SIZE - 10);
        const y = Phaser.Math.Between(0, TILE_SIZE - 10);
        g.fillRect(x, y, 5, 3);
      }

      g.fillStyle(0xaaddff, 0.35);
      for (let i = 0; i < 3; i++) {
        const x = Phaser.Math.Between(4, TILE_SIZE - 8);
        const y = Phaser.Math.Between(4, TILE_SIZE - 8);
        g.fillCircle(x, y, 2 + (i % 2));
      }

      g.generateTexture(`ttile_${index}`, TILE_SIZE, TILE_SIZE);
      g.destroy();
    });
  }
}
