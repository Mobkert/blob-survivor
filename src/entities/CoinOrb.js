import Phaser from 'phaser';
import { XP_MAGNET_RANGE } from '../data/constants.js';

export class CoinOrb extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, value) {
    super(scene, x, y, 'coin');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.value = value;
    this.setCircle(7);
    this.setDepth(4);
    this.magnetized = false;
  }

  update(player) {
    const magnet = XP_MAGNET_RANGE + (player.playerState?.magnetBonus || 0);
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    if (dist < magnet) {
      this.magnetized = true;
    }

    if (this.magnetized) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
      this.setVelocity(Math.cos(angle) * 340, Math.sin(angle) * 340);
    } else {
      this.setVelocity(0, 0);
    }
  }
}
