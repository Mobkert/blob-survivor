import Phaser from 'phaser';

/**
 * Reusable FX pool — avoids create/destroy spam that freezes the game.
 * Circles are recycled; beams/bolts are drawn into a shared Graphics buffer.
 */
export class FxPool {
  constructor(scene, { circleCount = 96 } = {}) {
    this.scene = scene;
    this.free = [];
    this.all = [];
    this.particles = [];
    this.gfxLife = [];
    this.gfx = scene.add.graphics().setDepth(14);

    for (let i = 0; i < circleCount; i++) {
      const c = scene.add
        .circle(0, 0, 4, 0xffffff, 1)
        .setDepth(12)
        .setVisible(false)
        .setActive(false);
      this.all.push(c);
      this.free.push(c);
    }

    scene.events.on('update', this.update, this);
    scene.events.once('shutdown', this.destroy, this);
    scene.events.once('destroy', this.destroy, this);
  }

  acquire(x, y, radius, color, alpha = 1, depth = 12) {
    const c = this.free.pop();
    if (!c) return null;
    c.setPosition(x, y);
    c.setRadius(radius);
    c.setFillStyle(color, alpha);
    c.setStrokeStyle();
    c.setDepth(depth);
    c.setScale(1);
    c.setAlpha(alpha);
    c.setVisible(true);
    c.setActive(true);
    return c;
  }

  release(c) {
    if (!c) return;
    // Only recycle pooled circles — Graphics/images would corrupt the pool and freeze the game.
    if (!this.all.includes(c)) return;
    // Already pooled / inactive — avoid double-release corruption.
    if (!c.visible && !c.active && this.free.includes(c)) return;
    this.scene.tweens.killTweensOf(c);
    c.setVisible(false);
    c.setActive(false);
    c.setAlpha(1);
    c.setScale(1);
    if (!this.free.includes(c)) this.free.push(c);
  }

  /** Short-lived drifting particle burst (pooled, no per-particle tweens). */
  burst(x, y, { count = 6, color = 0xffffff, speed = 90, life = 280, size = 3, depth = 12 } = {}) {
    const n = Math.min(count, this.free.length);
    for (let i = 0; i < n; i++) {
      const c = this.acquire(x, y, size * (0.7 + Math.random() * 0.6), color, 0.85, depth);
      if (!c) break;
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.45 + Math.random());
      this.particles.push({
        obj: c,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life,
        maxLife: life,
        grow: 0,
      });
    }
  }

  /** Expanding flash circle. */
  flash(x, y, radius, color, life = 180, grow = 40) {
    const c = this.acquire(x, y, radius, color, 0.75, 13);
    if (!c) return;
    this.particles.push({
      obj: c,
      vx: 0,
      vy: 0,
      life,
      maxLife: life,
      grow: grow / (life / 16),
    });
  }

  /** Lightning bolt into shared graphics (auto-fades). */
  bolt(x1, y1, x2, y2, color = 0xffffff, life = 90) {
    const mids = [];
    const segs = 4;
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      mids.push({
        x: Phaser.Math.Linear(x1, x2, t) + (Math.random() - 0.5) * 22,
        y: Phaser.Math.Linear(y1, y2, t) + (Math.random() - 0.5) * 14,
      });
    }
    this.gfxLife.push({
      life,
      maxLife: life,
      draw: (g, a) => {
        g.lineStyle(3, color, a);
        g.beginPath();
        g.moveTo(x1, y1);
        mids.forEach((p) => g.lineTo(p.x, p.y));
        g.lineTo(x2, y2);
        g.strokePath();
        g.lineStyle(1, 0xaaddff, a * 0.8);
        g.strokePath();
      },
    });
  }

  /** Beam line into shared graphics. */
  beam(x1, y1, x2, y2, color = 0x66ffaa, life = 220, width = 4) {
    this.gfxLife.push({
      life,
      maxLife: life,
      draw: (g, a) => {
        g.lineStyle(width + 2, color, a * 0.35);
        g.beginPath();
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        g.strokePath();
        g.lineStyle(Math.max(1, width - 1), color, a);
        g.beginPath();
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        g.strokePath();
      },
    });
  }

  /** Hold a circle for scripted FX (caller must release). */
  hold(x, y, radius, color, alpha = 1, depth = 10) {
    return this.acquire(x, y, radius, color, alpha, depth);
  }

  update(_time, delta) {
    const dt = Math.min(delta, 40) / 1000;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      p.obj.x += p.vx * dt;
      p.obj.y += p.vy * dt;
      if (p.grow) p.obj.setRadius(Math.max(1, p.obj.radius + p.grow));
      p.obj.setAlpha(Math.max(0, (p.life / p.maxLife) * 0.9));
      if (p.life <= 0) {
        this.release(p.obj);
        this.particles.splice(i, 1);
      }
    }

    this.gfx.clear();
    for (let i = this.gfxLife.length - 1; i >= 0; i--) {
      const cmd = this.gfxLife[i];
      cmd.life -= delta;
      if (cmd.life <= 0) {
        this.gfxLife.splice(i, 1);
        continue;
      }
      cmd.draw(this.gfx, Math.max(0, cmd.life / cmd.maxLife));
    }
  }

  destroy() {
    this.scene.events.off('update', this.update, this);
    this.clearAll();
    this.all.forEach((c) => c.destroy());
    this.all.length = 0;
    this.free.length = 0;
    this.gfx?.destroy();
    this.gfx = null;
  }

  /** Force-release every pooled circle and wipe beams/particles (call on player death). */
  clearAll() {
    this.particles.length = 0;
    this.gfxLife.length = 0;
    this.gfx?.clear();
    this.free.length = 0;
    this.all.forEach((c) => {
      if (!c || !c.scene) return;
      try {
        this.scene.tweens.killTweensOf(c);
      } catch {
        /* ignore */
      }
      c.setVisible(false);
      c.setActive(false);
      c.setAlpha(1);
      c.setScale(1);
      c.setStrokeStyle();
      this.free.push(c);
    });
  }
}
