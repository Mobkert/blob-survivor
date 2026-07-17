import Phaser from 'phaser';
import { XP_MAGNET_RANGE } from '../data/constants.js';

export class XpOrb extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {number} value
   */
  constructor(scene, x, y, value) {
    super(scene, x, y, 'xp_orb');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.value = value;
    this.setCircle(6);
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
      const speed = 320;
      this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    } else {
      this.setVelocity(0, 0);
    }
  }
}
