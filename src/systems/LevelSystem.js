import { xpToNextLevel } from '../data/constants.js';

export class LevelSystem {
  constructor(scene, playerState) {
    this.scene = scene;
    this.playerState = playerState;
    this.pendingLevelUp = false;
  }

  get xpNeeded() {
    return xpToNextLevel(this.playerState.level);
  }

  addXp(amount) {
    this.playerState.xp += amount;
    if (this.playerState.xp >= this.xpNeeded) {
      this.playerState.xp -= this.xpNeeded;
      this.playerState.level += 1;
      this.pendingLevelUp = true;
      return true;
    }
    return false;
  }

  consumeLevelUp() {
    this.pendingLevelUp = false;
  }
}
