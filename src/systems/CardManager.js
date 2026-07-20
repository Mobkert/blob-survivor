import { pickWeaponCards } from '../data/weapons.js';
import { pickPowerupCards } from '../data/powerups.js';
import { unlockWeapon, unlockShopItem, getWeaponEnchant } from '../data/meta.js';
import { applyEnchantToWeapon } from '../data/enchants.js';

export class CardManager {
  /**
   * @param {Phaser.Scene} gameScene
   * @param {Phaser.Scene} uiScene
   * @param {object} playerState
   */
  constructor(gameScene, uiScene, playerState) {
    this.gameScene = gameScene;
    this.uiScene = uiScene;
    this.playerState = playerState;
    this.isOpen = false;
    this.mode = null;
    this.cards = [];
    this.resolvePick = null;
  }

  /**
   * @param {'weapon' | 'powerup'} mode
   * @returns {Promise<object>}
   */
  show(mode) {
    if (this.isOpen) {
      this.close(null);
    }

    this.mode = mode;
    this.isOpen = true;
    this.cards = mode === 'weapon'
      ? pickWeaponCards(3)
      : pickPowerupCards(this.playerState, 3, this.gameScene.levelId);

    if (this.cards.length === 0) {
      this.isOpen = false;
      return Promise.resolve(null);
    }

    while (this.cards.length < 3) {
      const extra =
        mode === 'weapon'
          ? pickWeaponCards(1)[0]
          : pickPowerupCards(this.playerState, 1, this.gameScene.levelId)[0];
      if (extra && !this.cards.some((c) => c.id === extra.id)) {
        this.cards.push(extra);
      } else {
        break;
      }
    }

    this.gameScene.physics.pause();

    const title = mode === 'weapon' ? 'Choose a New Weapon' : 'Choose a Powerup';
    const ui = this.uiScene?.showCardPick ? this.uiScene : this.gameScene.scene.get('UIScene');

    return new Promise((resolve) => {
      this.resolvePick = resolve;
      ui.showCardPick(this.cards, title, (card) => this.selectCard(card));
    });
  }

  /**
   * Permanent unlock pick (Frozen Tundra clear). Does not equip for this run.
   * @param {object[]} cards
   * @param {string} title
   * @returns {Promise<object|null>}
   */
  showUnlockPick(cards, title = 'Unlock a Weapon') {
    if (this.isOpen) this.close(null);
    if (!cards?.length) return Promise.resolve(null);

    this.mode = 'unlock';
    this.isOpen = true;
    this.cards = cards.map((c) => ({ ...c }));
    this.gameScene.physics.pause();

    const ui = this.uiScene?.showCardPick ? this.uiScene : this.gameScene.scene.get('UIScene');
    return new Promise((resolve) => {
      this.resolvePick = resolve;
      ui.showCardPick(this.cards, title, (card) => this.selectCard(card));
    });
  }

  selectCard(card) {
    if (!this.isOpen) return;

    if (this.mode === 'unlock') {
      if (card.swampUnlock || card.unlockKind === 'shop') {
        unlockShopItem(card.id);
      } else {
        unlockWeapon(card.id);
      }
      this.gameScene.events.emit('boss-message', `${card.name} unlocked for future runs!`);
    } else if (this.mode === 'weapon') {
      const saved = getWeaponEnchant(card.id);
      this.playerState.weapon = applyEnchantToWeapon({ ...card }, saved);
      this.gameScene.player?.syncStats?.();
    } else if (card.apply) {
      card.apply(this.playerState);
      if (!this.playerState.runPowerups) this.playerState.runPowerups = [];
      this.playerState.runPowerups.push(card.id);
      this.applyPowerupEffects(card);
    }

    this.close(card);
  }

  applyPowerupEffects(card) {
    const player = this.gameScene.player;
    if (!player) return;

    player.syncStats();

    if (card.id === 'maxHp' || card.id === 'turtle' || card.id === 'bulwark' || card.id === 'tank') {
      player.heal(card.id === 'tank' ? 125 : 15);
    }

    if (card.id === 'glassCannon' && player.hp > player.maxHp) {
      player.hp = player.maxHp;
    }

    if (card.category === 'attack') {
      player.attackCooldownEnd = 0;
    }

    this.gameScene.events.emit('hud-update');
  }

  close(result) {
    this.isOpen = false;
    const ui = this.uiScene?.hideCardPick ? this.uiScene : this.gameScene.scene.get('UIScene');
    ui.hideCardPick();
    this.gameScene.physics.resume();

    const resolve = this.resolvePick;
    this.resolvePick = null;
    resolve?.(result);
  }
}
