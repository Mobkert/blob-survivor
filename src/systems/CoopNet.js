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

/**
 * Rate-limited FX sync — only flashes (no burst spam).
 * Unthrottled burst/flash networking was freezing the guest under PeerJS load.
 */
export function wireFxNetworking(scene) {
  if (!scene.isMultiplayer || !scene.fx || scene.fx._netWired) return;
  const fx = scene.fx;
  fx._netWired = true;
  scene._fxNetBudget = 0;
  scene._fxNetLastMs = 0;

  const origFlash = fx.flash.bind(fx);
  fx.flash = (x, y, radius, color, life = 180, grow = 40) => {
    const result = origFlash(x, y, radius, color, life, grow);
    if (scene.mpRole !== 'host' || !scene.net) return result;
    const now = scene.time.now;
    if (now - scene._fxNetLastMs > 250) {
      scene._fxNetBudget = 0;
      scene._fxNetLastMs = now;
    }
    if (scene._fxNetBudget >= 4) return result;
    // Skip tiny particle flashes; keep explosion-sized ones.
    if ((grow || 0) < 25 && (radius || 0) < 12) return result;
    scene._fxNetBudget += 1;
    scene.net.send({
      type: 'fx',
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
}

export function playNetFx(scene, msg) {
  if (!msg?.kind || !scene.fx) return;
  if (msg.kind === 'flash') {
    scene.fx.flash(msg.x, msg.y, msg.radius, msg.color, msg.life, msg.grow);
    return;
  }
  if (msg.kind === 'melee') {
    drawMeleeArc(scene, msg.x, msg.y, msg.angle, msg.range, msg.arc);
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

/** Register a long-lived zone VFX for snapshot sync (host only). */
export function registerCoopVfx(scene, data) {
  if (!scene.isMultiplayer || scene.mpRole !== 'host') return null;
  if (!scene.coopVfx) scene.coopVfx = new Map();
  const id = scene._guestNetId++;
  scene.coopVfx.set(id, { id, ...data });
  return id;
}

export function unregisterCoopVfx(scene, id) {
  if (id == null) return;
  scene.coopVfx?.delete(id);
}

export function snapshotCoopVfx(scene) {
  if (!scene.coopVfx?.size) return [];
  const out = [];
  scene.coopVfx.forEach((v) => {
    out.push({
      id: v.id,
      kind: v.kind,
      x: Math.round(v.x),
      y: Math.round(v.y),
      r: Math.round(v.r || 40),
    });
  });
  return out;
}

export function serializeBossTelegraph(enemy) {
  if (!enemy || enemy.phase !== 'telegraph' || !enemy.pendingAttack) return null;
  return {
    a: enemy.pendingAttack,
    ang: Math.round((enemy.aimAngle || 0) * 1000) / 1000,
    lx: Math.round(enemy.lockedX || enemy.x),
    ly: Math.round(enemy.lockedY || enemy.y),
    boss:
      enemy.typeId === 'kingMagmaCube'
        ? 'magma'
        : enemy.typeId === 'yeti'
          ? 'yeti'
          : enemy.typeId === 'kingFrog'
            ? 'frog'
            : 'goblin',
  };
}

/** Smooth guest enemy / projectile sprites between snapshots. */
export function updateGuestInterp(scene) {
  scene.guestEnemyMap?.forEach((sprite) => {
    if (sprite._tx == null) return;
    sprite.x += (sprite._tx - sprite.x) * 0.28;
    sprite.y += (sprite._ty - sprite.y) * 0.28;
    if (sprite._telegraphGfx && sprite._lastTelegraph) {
      drawGuestTelegraph(sprite._telegraphGfx, sprite, sprite._lastTelegraph);
    }
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
  // Pulse singularity rings on guest
  scene.guestVfxMap?.forEach((entry) => {
    if (entry.kind !== 'singularity' || !entry.ring?.active) return;
    const t = scene.time.now / 80;
    entry.ring.setRadius(20 + Math.sin(t) * 8);
  });
}

export function applyGuestVfxZones(scene, zones) {
  if (!scene.guestVfxMap) scene.guestVfxMap = new Map();
  const seen = new Set();
  (zones || []).forEach((z) => {
    seen.add(z.id);
    let entry = scene.guestVfxMap.get(z.id);
    if (!entry) {
      entry = createGuestVfx(scene, z);
      scene.guestVfxMap.set(z.id, entry);
    }
    entry.kind = z.kind;
    entry.core?.setPosition(z.x, z.y);
    entry.ring?.setPosition(z.x, z.y);
    if (entry.ring && z.kind === 'toxic') entry.ring.setRadius(z.r * 0.55);
    if (entry.core && z.kind === 'toxic') entry.core.setRadius(z.r * 0.5);
    if (entry.core && z.kind === 'scorch') entry.core.setRadius(z.r);
    if (entry.ring && z.kind === 'scorch') entry.ring.setRadius(z.r * 0.6);
    if (entry.core && z.kind === 'molotovFire') entry.core.setRadius(z.r * 0.55);
    if (entry.ring && z.kind === 'molotovFire') entry.ring.setRadius(z.r);
    if (entry.core && z.kind === 'singularity') entry.core.setRadius(12);
  });
  scene.guestVfxMap.forEach((entry, id) => {
    if (seen.has(id)) return;
    entry.core?.destroy();
    entry.ring?.destroy();
    scene.guestVfxMap.delete(id);
  });
}

function createGuestVfx(scene, z) {
  if (z.kind === 'toxic') {
    return {
      kind: 'toxic',
      core: scene.add.circle(z.x, z.y, z.r * 0.5, 0x66dd22, 0.28).setDepth(7),
      ring: scene.add.circle(z.x, z.y, z.r * 0.55, 0x44aa11, 0.2).setDepth(6),
    };
  }
  if (z.kind === 'singularity') {
    const core = scene.add.circle(z.x, z.y, 12, 0x220033, 0.9).setDepth(10);
    core.setStrokeStyle(3, 0xbb44ff, 0.95);
    const ring = scene.add.circle(z.x, z.y, 22, 0x6611aa, 0.28).setDepth(9);
    return { kind: 'singularity', core, ring };
  }
  if (z.kind === 'scorch') {
    return {
      kind: 'scorch',
      core: scene.add.circle(z.x, z.y, z.r, 0xff4400, 0.4).setDepth(5),
      ring: scene.add.circle(z.x, z.y, z.r * 0.6, 0xffaa33, 0.35).setDepth(6),
    };
  }
  if (z.kind === 'molotovFire') {
    return {
      kind: 'molotovFire',
      core: scene.add.circle(z.x, z.y, z.r * 0.55, 0xff8800, 0.35).setDepth(8),
      ring: scene.add.circle(z.x, z.y, z.r, 0xff4400, 0.28).setDepth(7),
    };
  }
  return {
    kind: z.kind,
    core: scene.add.circle(z.x, z.y, z.r || 30, 0xffffff, 0.25).setDepth(7),
    ring: null,
  };
}

export function applyGuestEnemyTelegraph(sprite, telegraph) {
  if (!sprite) return;
  if (!sprite._telegraphGfx) {
    sprite._telegraphGfx = sprite.scene.add.graphics().setDepth(4);
  }
  const g = sprite._telegraphGfx;
  if (!telegraph) {
    g.clear();
    sprite._lastTelegraph = null;
    return;
  }
  sprite._lastTelegraph = telegraph;
  drawGuestTelegraph(g, sprite, telegraph);
}

function drawGuestTelegraph(g, sprite, t) {
  g.clear();
  const isMagma = t.boss === 'magma';
  const isYeti = t.boss === 'yeti';
  const isFrog = t.boss === 'frog';
  const fill = isFrog ? 0x55aa33 : isYeti ? 0x66aadd : isMagma ? 0xff3300 : 0xff2222;
  const line = isFrog ? 0x88cc55 : isYeti ? 0xaaddff : isMagma ? 0xff8844 : 0xff4444;
  g.fillStyle(fill, isYeti || isMagma || isFrog ? 0.32 : 0.35);
  g.lineStyle(2, line, isYeti || isMagma || isFrog ? 0.85 : 0.8);

  const x = sprite.x;
  const y = sprite.y;
  const ang = t.ang || 0;
  const attack = t.a;

  if (attack === 'line' || attack === 'dash' || attack === 'cannon' || attack === 'blast' || attack === 'blizzard') {
    const len =
      attack === 'cannon' || attack === 'blast'
        ? 500
        : attack === 'blizzard'
          ? 420
          : attack === 'dash'
            ? isMagma
              ? 540
              : isFrog
                ? 460
                : 560
            : 520;
    const width =
      attack === 'cannon' || attack === 'blast'
        ? 34
        : attack === 'blizzard'
          ? 110
          : attack === 'dash'
            ? isMagma
              ? 72
              : isFrog
                ? 48
                : 70
            : 56;
    drawOrientedRect(g, x, y, ang, len, width);
  } else if (attack === 'cone' || attack === 'tongueWhip') {
    if (attack === 'tongueWhip') {
      const length = 360;
      const tipX = x + Math.cos(ang) * length;
      const tipY = y + Math.sin(ang) * length;
      g.fillStyle(0xff6688, 0.3);
      g.lineStyle(2, 0xff99aa, 0.9);
      g.fillTriangle(
        x + Math.cos(ang + Math.PI / 2) * 70,
        y + Math.sin(ang + Math.PI / 2) * 70,
        tipX,
        tipY,
        x + Math.cos(ang - Math.PI / 2) * 70,
        y + Math.sin(ang - Math.PI / 2) * 70,
      );
      g.strokeTriangle(
        x + Math.cos(ang + Math.PI / 2) * 70,
        y + Math.sin(ang + Math.PI / 2) * 70,
        tipX,
        tipY,
        x + Math.cos(ang - Math.PI / 2) * 70,
        y + Math.sin(ang - Math.PI / 2) * 70,
      );
    } else {
      drawCone(g, x, y, ang, 340, Phaser.Math.DegToRad(55));
    }
  } else if (attack === 'aoe' || attack === 'explosion' || attack === 'frostNova') {
    const r = attack === 'frostNova' ? 240 : attack === 'explosion' ? 230 : 200;
    g.fillCircle(x, y, r);
    g.strokeCircle(x, y, r);
  } else if (attack === 'normal') {
    const nx = x + Math.cos(ang) * 70;
    const ny = y + Math.sin(ang) * 70;
    g.fillCircle(nx, ny, 110);
    g.strokeCircle(nx, ny, 110);
  } else if (
    attack === 'bomb' ||
    attack === 'eruption' ||
    attack === 'spikeRain' ||
    attack === 'avalanche' ||
    attack === 'slamJump' ||
    attack === 'acidSpit'
  ) {
    const r =
      attack === 'avalanche'
        ? 120
        : attack === 'slamJump'
          ? 110
          : attack === 'acidSpit'
            ? 95
            : attack === 'spikeRain'
              ? 95
              : attack === 'eruption'
                ? 110
                : 95;
    g.fillCircle(t.lx, t.ly, r);
    g.strokeCircle(t.lx, t.ly, r);
  }
}

function drawOrientedRect(g, x, y, angle, length, width) {
  const hx = Math.cos(angle);
  const hy = Math.sin(angle);
  const px = -hy;
  const py = hx;
  const hw = width / 2;
  const points = [
    { x: x + px * hw, y: y + py * hw },
    { x: x + hx * length + px * hw, y: y + hy * length + py * hw },
    { x: x + hx * length - px * hw, y: y + hy * length - py * hw },
    { x: x - px * hw, y: y - py * hw },
  ];
  g.beginPath();
  g.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
  g.closePath();
  g.fillPath();
  g.strokePath();
}

function drawCone(g, x, y, angle, range, halfWidth) {
  const steps = 10;
  g.beginPath();
  g.moveTo(x, y);
  for (let i = 0; i <= steps; i++) {
    const a = angle - halfWidth + (halfWidth * 2 * i) / steps;
    g.lineTo(x + Math.cos(a) * range, y + Math.sin(a) * range);
  }
  g.closePath();
  g.fillPath();
  g.strokePath();
}
