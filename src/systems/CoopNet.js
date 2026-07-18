/**
 * Lightweight co-op net helpers (no CombatSystem import — avoids cycles).
 */
import Phaser from 'phaser';
import { addCoins } from '../data/meta.js';

/** Host grants coins locally and mirrors the same amount to the guest. */
export function grantCoopCoins(scene, amount) {
  const value = Math.max(0, Math.floor(amount));
  if (value <= 0) return;
  addCoins(value);
  scene.events.emit('coins-collected', value);
  if (scene.isMultiplayer && scene.mpRole === 'host') {
    scene.net?.send({ type: 'coins', amount: value });
  }
}

/** Wrap FxPool so host flashes/bursts/beams also play on the guest. */
export function wireFxNetworking(scene) {
  if (!scene.isMultiplayer || !scene.fx || scene.fx._netWired) return;
  const fx = scene.fx;
  fx._netWired = true;

  const send = (payload) => {
    if (scene.mpRole !== 'host' || !scene.net) return;
    scene.net.send({ type: 'fx', ...payload });
  };

  const origFlash = fx.flash.bind(fx);
  fx.flash = (x, y, radius, color, life = 180, grow = 40) => {
    const result = origFlash(x, y, radius, color, life, grow);
    send({
      kind: 'flash',
      x: Math.round(x),
      y: Math.round(y),
      radius: Math.round(radius),
      color,
      life,
      grow: Math.round(grow),
    });
    return result;
  };

  const origBurst = fx.burst.bind(fx);
  fx.burst = (x, y, opts = {}) => {
    const result = origBurst(x, y, opts);
    send({
      kind: 'burst',
      x: Math.round(x),
      y: Math.round(y),
      count: opts.count ?? 6,
      color: opts.color ?? 0xffffff,
      speed: opts.speed ?? 90,
      life: opts.life ?? 280,
      size: opts.size ?? 3,
    });
    return result;
  };

  const origBeam = fx.beam.bind(fx);
  fx.beam = (x1, y1, x2, y2, color = 0x66ffaa, life = 220, width = 4) => {
    const result = origBeam(x1, y1, x2, y2, color, life, width);
    send({
      kind: 'beam',
      x1: Math.round(x1),
      y1: Math.round(y1),
      x2: Math.round(x2),
      y2: Math.round(y2),
      color,
      life,
      width,
    });
    return result;
  };

  const origBolt = fx.bolt.bind(fx);
  fx.bolt = (x1, y1, x2, y2, color = 0xffffff, life = 90) => {
    const result = origBolt(x1, y1, x2, y2, color, life);
    send({
      kind: 'bolt',
      x1: Math.round(x1),
      y1: Math.round(y1),
      x2: Math.round(x2),
      y2: Math.round(y2),
      color,
      life,
    });
    return result;
  };
}

export function playNetFx(scene, msg) {
  if (!msg?.kind || !scene.fx) return;
  const fx = scene.fx;
  switch (msg.kind) {
    case 'flash':
      fx.flash(msg.x, msg.y, msg.radius, msg.color, msg.life, msg.grow);
      break;
    case 'burst':
      fx.burst(msg.x, msg.y, {
        count: msg.count,
        color: msg.color,
        speed: msg.speed,
        life: msg.life,
        size: msg.size,
      });
      break;
    case 'beam':
      fx.beam(msg.x1, msg.y1, msg.x2, msg.y2, msg.color, msg.life, msg.width);
      break;
    case 'bolt':
      fx.bolt(msg.x1, msg.y1, msg.x2, msg.y2, msg.color, msg.life);
      break;
    case 'melee':
      drawMeleeArc(scene, msg.x, msg.y, msg.angle, msg.range, msg.arc);
      break;
    default:
      break;
  }
}

export function broadcastMeleeArc(scene, x, y, angle, range, arcDegrees) {
  if (!scene.isMultiplayer || scene.mpRole !== 'host') return;
  scene.net?.send({
    type: 'fx',
    kind: 'melee',
    x: Math.round(x),
    y: Math.round(y),
    angle,
    range: Math.round(range),
    arc: arcDegrees,
  });
}

function drawMeleeArc(scene, x, y, angle, range, arcDegrees) {
  const gfx = scene.add.graphics().setDepth(9);
  const halfArc = Phaser.Math.DegToRad((arcDegrees || 90) / 2);
  const start = angle - halfArc;
  const end = angle + halfArc;
  gfx.fillStyle(0xffffff, 0.15);
  gfx.lineStyle(3, 0xffffff, 0.5);
  gfx.beginPath();
  gfx.moveTo(x, y);
  gfx.arc(x, y, range, start, end, false);
  gfx.closePath();
  gfx.fillPath();
  gfx.strokePath();
  scene.time.delayedCall(100, () => gfx.destroy());
}

/** Smooth guest enemy / projectile sprites between snapshots. */
export function updateGuestInterp(scene) {
  scene.guestEnemyMap?.forEach((sprite) => {
    if (sprite._tx == null) return;
    sprite.x += (sprite._tx - sprite.x) * 0.28;
    sprite.y += (sprite._ty - sprite.y) * 0.28;
  });
  scene.guestProjectileMap?.forEach((sprite) => {
    if (sprite._tx == null) return;
    sprite.x += (sprite._tx - sprite.x) * 0.4;
    sprite.y += (sprite._ty - sprite.y) * 0.4;
    if (sprite._tr != null) sprite.rotation = sprite._tr;
  });
  if (scene.ally?._tx != null) {
    scene.ally.x += (scene.ally._tx - scene.ally.x) * 0.3;
    scene.ally.y += (scene.ally._ty - scene.ally.y) * 0.3;
  }
}
