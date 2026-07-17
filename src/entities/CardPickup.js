import Phaser from 'phaser';

/**
 * Ground card drop — shiny rectangle. Collect to unlock into the deck.
 */
export class CardPickup extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, cardId) {
    super(scene, x, y, 'card_pickup');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.cardId = cardId;
    this.setDepth(6);
    this.setDisplaySize(36, 48);
    this.body.setSize(28, 38);
    this.body.setAllowGravity(false);
    this.setVelocity(0, 0);

    this.glow = scene.add.ellipse(x, y, 56, 64, 0xffe8a0, 0.35).setDepth(5);
    this.glow.setStrokeStyle(2, 0xffffff, 0.45);

    scene.tweens.add({
      targets: [this, this.glow],
      y: y - 6,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    scene.tweens.add({
      targets: this.glow,
      alpha: 0.15,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    scene.tweens.add({
      targets: this,
      angle: { from: -4, to: 4 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.glow?.active) {
      this.glow.setPosition(this.x, this.y);
    }
  }

  destroy(fromScene) {
    this.glow?.destroy();
    this.glow = null;
    super.destroy(fromScene);
  }
}
