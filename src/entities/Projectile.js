import Phaser from 'phaser';

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, angle, speed, damage, pierceRemaining, ownerState) {
    super(scene, x, y, 'projectile');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.damage = damage;
    this.pierceRemaining = pierceRemaining;
    this.ownerState = ownerState;
    this.hitIds = new Set();
    this.lifetime = 2000;
    this.spawnTime = scene.time.now;
    this.bouncesLeft = 0;

    this.setDepth(8);
    this.setCircle(5);
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.rotation = angle;
  }

  update(time) {
    if (time - this.spawnTime > this.lifetime) {
      this.destroy();
    }
  }

  /** @returns {boolean} true if projectile was destroyed */
  onHitEnemy(enemy) {
    if (this.hitIds.has(enemy)) return false;
    this.hitIds.add(enemy);

    if (this.ownerState.poison) enemy.applyPoison(this.scene.time.now);
    if (this.ownerState.slowOnHit) enemy.applySlow(this.scene.time.now);

    if (this.pierceRemaining <= 0 && this.bouncesLeft <= 0) {
      this.destroy();
      return true;
    }

    if (this.pierceRemaining > 0) {
      this.pierceRemaining -= 1;
    }
    return false;
  }
}
