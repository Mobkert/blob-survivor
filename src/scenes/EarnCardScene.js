import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../data/constants.js';
import { getShopItem, isPremiumShopCard } from '../data/shop.js';
import { unlockShopItem, isUnlocked, loadMeta } from '../data/meta.js';
import { Music } from '../systems/MusicManager.js';

/**
 * Post-boot screen: "You've earned a card!" for swamp clear reward (Bogged)
 * when the player finished Murk Swamp but has not claimed it yet.
 */
export class EarnCardScene extends Phaser.Scene {
  constructor() {
    super('EarnCardScene');
  }

  init(data = {}) {
    this.cardId = data.cardId || 'bogged';
    this.nextScene = data.nextScene || 'MenuScene';
  }

  create() {
    Music.play('chill');
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0c1810);

    const card = getShopItem(this.cardId);
    if (!card || isUnlocked(this.cardId)) {
      this.scene.start(this.nextScene);
      return;
    }

    this.add
      .text(GAME_WIDTH / 2, 70, "You've Earned a Card!", {
        fontFamily: 'Arial',
        fontSize: '40px',
        color: '#a8ee88',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 118, 'Murk Swamp clear reward — claim it for future runs.', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#9bb4d0',
      })
      .setOrigin(0.5);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 + 10;
    const w = 280;
    const h = 340;
    const premium = isPremiumShopCard(card);

    this.add.rectangle(cx, cy, w, h, premium ? 0x14081f : 0x1a2a18, 0.98).setStrokeStyle(4, card.color || 0x88cc33);
    this.add.circle(cx, cy - 90, 42, card.color || 0x88cc33, 1);
    // Simple acid-bolt icon mark
    this.add.circle(cx, cy - 90, 18, 0xccff66, 0.9);
    this.add.circle(cx + 10, cy - 78, 8, 0x88ee44, 0.8);

    this.add
      .text(cx, cy - 20, card.name, {
        fontFamily: 'Arial',
        fontSize: '28px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy + 50, card.description, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#c8e0c0',
        align: 'center',
        wordWrap: { width: w - 36 },
      })
      .setOrigin(0.5);

    const claim = this.add
      .rectangle(cx, GAME_HEIGHT - 70, 220, 52, 0x2a6a28)
      .setStrokeStyle(2, 0x66aa55)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(cx, GAME_HEIGHT - 70, 'Claim Card', {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    claim.on('pointerover', () => claim.setFillStyle(0x3a8a38));
    claim.on('pointerout', () => claim.setFillStyle(0x2a6a28));
    claim.on('pointerdown', () => {
      unlockShopItem(this.cardId);
      this.scene.start(this.nextScene);
    });
  }
}

/** True when active save cleared swamp but has not unlocked Bogged yet. */
export function shouldOfferBoggedEarn() {
  const meta = loadMeta();
  const completed = meta.completedLevels || [];
  if (!completed.includes('swamp')) return false;
  return !isUnlocked('bogged');
}
