import Phaser from 'phaser';

/**
 * Shared Murk Swamp hazard helpers: acid puddles and spider webs.
 * Uses FxPool when available; cleans up via scene timers.
 */

/** Spawn a lingering acid puddle.
 *  opts.hurtPlayer — damage the player (default true for swamp frog puddles)
 *  opts.poisonEnemies — apply poison DoT to enemies standing in it
 */
export function spawnAcidPuddle(scene, x, y, opts = {}) {
  const duration = opts.durationMs ?? 2800 + Math.random() * 1400;
  const radius = opts.radius ?? 78;
  const tickDamage = opts.tickDamage ?? 5;
  const tickMs = opts.tickMs ?? 220;
  const hurtPlayer = opts.hurtPlayer !== false;
  const poisonEnemies = !!opts.poisonEnemies;
  const poisonDamage = opts.poisonDamage ?? 4;
  const poisonMs = opts.poisonMs ?? 2200;
  const fx = scene.fx;

  const pool = scene.add.circle(x, y, radius, 0x66cc33, 0.32).setDepth(7);
  pool.setStrokeStyle(2, 0xaaff66, 0.75);
  const glow = scene.add.circle(x, y, radius * 0.5, 0x88ee44, 0.28).setDepth(8);

  fx?.burst(x, y, { count: 14, color: 0x88ee44, speed: 130, life: 340, size: 5 });
  fx?.flash(x, y, 22, 0xaaff66, 260, radius * 0.45);

  let elapsed = 0;
  const tick = scene.time.addEvent({
    delay: tickMs,
    loop: true,
    callback: () => {
      elapsed += tickMs;
      if (!pool.active) {
        tick.remove(false);
        return;
      }
      pool.setAlpha(0.28 + Math.sin(elapsed * 0.01) * 0.06);
      glow.setAlpha(0.22 + Math.sin(elapsed * 0.014) * 0.08);

      const player = scene.player;
      if (hurtPlayer && player?.active && scene.gameState === 'playing') {
        const dist = Phaser.Math.Distance.Between(x, y, player.x, player.y);
        if (dist <= radius + (player.body?.halfWidth || 14)) {
          player.takeDamage(tickDamage, scene.time.now);
          player.applyChill?.(scene.time.now, 400, 0.7);
        }
      }

      if (poisonEnemies && (scene.gameState === 'playing' || scene.gameState === 'wave_pause')) {
        const enemies = scene.waveManager?.enemies?.getChildren?.() || [];
        const now = scene.time.now;
        enemies.forEach((enemy) => {
          if (!enemy?.active || enemy.isDying) return;
          const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
          if (dist <= radius + (enemy.enemyData?.radius || 14)) {
            enemy.applyPoison?.(now, Math.max(0, (poisonDamage || 4) - 3), Math.max(0, poisonMs - 3000));
          }
        });
      }

      if (elapsed >= duration) {
        tick.remove(false);
        scene.tweens.add({
          targets: [pool, glow],
          alpha: 0,
          duration: 280,
          onComplete: () => {
            pool.destroy();
            glow.destroy();
          },
        });
      }
    },
  });

  return { pool, glow, tick };
}

/** Sticky web patch — heavy slow while standing on it. */
export function spawnSpiderWeb(scene, x, y, opts = {}) {
  const duration = opts.durationMs ?? 4500;
  const radius = opts.radius ?? 70;
  const strength = opts.slowStrength ?? 0.28;

  const web = scene.add.circle(x, y, radius, 0xccc8b0, 0.35).setDepth(6);
  web.setStrokeStyle(2, 0xeee8d0, 0.7);
  // Cross strands
  const g = scene.add.graphics().setDepth(7);
  g.lineStyle(2, 0xe8e0c8, 0.65);
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI * i) / 4;
    g.lineBetween(
      x + Math.cos(a) * radius * 0.85,
      y + Math.sin(a) * radius * 0.85,
      x - Math.cos(a) * radius * 0.85,
      y - Math.sin(a) * radius * 0.85,
    );
  }

  if (!scene.swampWebs) scene.swampWebs = [];
  const entry = { x, y, radius, strength, until: scene.time.now + duration };
  scene.swampWebs.push(entry);

  scene.fx?.burst(x, y, { count: 10, color: 0xddd8c0, speed: 90, life: 280, size: 3 });

  scene.time.delayedCall(duration, () => {
    const i = scene.swampWebs?.indexOf(entry);
    if (i >= 0) scene.swampWebs.splice(i, 1);
    scene.tweens.add({
      targets: [web, g],
      alpha: 0,
      duration: 300,
      onComplete: () => {
        web.destroy();
        g.destroy();
      },
    });
  });

  return entry;
}

/** Place infrequent non-overlapping swamp ponds. */
export function buildSwampPonds(scene, half) {
  const ponds = [];
  const count = 11;
  const minGap = 160;
  const attempts = 80;

  for (let n = 0; n < count; n++) {
    let placed = false;
    for (let a = 0; a < attempts && !placed; a++) {
      const radius = 42 + Math.random() * 28;
      const margin = radius + 90;
      const x = Phaser.Math.FloatBetween(-half + margin, half - margin);
      const y = Phaser.Math.FloatBetween(-half + margin, half - margin);
      const ok = ponds.every(
        (p) => Phaser.Math.Distance.Between(x, y, p.x, p.y) >= p.radius + radius + minGap,
      );
      if (!ok) continue;

      const water = scene.add.circle(x, y, radius, 0x8a9a3a, 0.55).setDepth(1);
      water.setStrokeStyle(2, 0x6a7a28, 0.7);
      const shine = scene.add.circle(x - radius * 0.2, y - radius * 0.25, radius * 0.35, 0xb8c860, 0.22).setDepth(2);

      // Small rocks / grass tufts around rim
      for (let i = 0; i < 5; i++) {
        const ang = (Math.PI * 2 * i) / 5 + Math.random() * 0.4;
        const d = radius + 6 + Math.random() * 8;
        const rx = x + Math.cos(ang) * d;
        const ry = y + Math.sin(ang) * d;
        scene.add.circle(rx, ry, 3 + Math.random() * 2, 0x667755, 0.85).setDepth(2);
      }

      ponds.push({ x, y, radius, water, shine });
      placed = true;
    }
  }

  scene.swampPonds = ponds;
  return ponds;
}

/** Apply pond / web slows to the player. Call from GameScene.update. */
export function updateSwampPlayerHazards(scene, player, time) {
  if (!player?.active) return;

  let inPond = false;
  for (const p of scene.swampPonds || []) {
    if (Phaser.Math.Distance.Between(player.x, player.y, p.x, p.y) <= p.radius) {
      inPond = true;
      break;
    }
  }
  if (inPond) {
    player.applyChill?.(time, 180, 0.48);
  }

  let webStrength = 1;
  const now = time;
  for (const w of scene.swampWebs || []) {
    if (now > w.until) continue;
    if (Phaser.Math.Distance.Between(player.x, player.y, w.x, w.y) <= w.radius) {
      webStrength = Math.min(webStrength, w.strength);
    }
  }
  if (webStrength < 1) {
    player.applyChill?.(time, 180, webStrength);
  }
}
