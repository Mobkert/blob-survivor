/**
 * Multiplayer helpers mixed into GameScene (keeps GameScene readable).
 */
import Phaser from 'phaser';
import { createPlayerState, getMaxHp, getMoveSpeed } from '../data/constants.js';
import { getWeapon } from '../data/weapons.js';
import { Player } from '../entities/Player.js';
import { CombatSystem } from './CombatSystem.js';
import { getActiveNetplay } from './NetplayManager.js';
import { Enemy } from '../entities/Enemy.js';
import { Wizard, isWizardType } from '../entities/Wizard.js';
import { MagmaCube, isMagmaType } from '../entities/MagmaCube.js';
import { GoblinKing } from '../entities/GoblinKing.js';
import { KingMagmaCube } from '../entities/KingMagmaCube.js';

export function initMultiplayerFlags(scene, data) {
  scene.mpConfig = data.multiplayer || null;
  scene.isMultiplayer = !!scene.mpConfig;
  scene.mpRole = scene.mpConfig?.role || null;
  scene.net = scene.isMultiplayer ? getActiveNetplay() : null;
  scene.ally = null;
  scene.allyState = null;
  scene.allyCombat = null;
  scene.guestInput = null;
  scene.lastSnapshotAt = 0;
  scene.guestEnemyMap = new Map();
  scene.guestProjectileMap = new Map();
  scene._guestNetId = 1;
  scene._guestQPending = false;
}

export function setupMultiplayerPlayers(scene) {
  if (!scene.isMultiplayer) return;

  scene.allyState = createPlayerState();
  // Shared level/xp live on host playerState; guestState mirrors for card eligibility.
  scene.allyState.level = scene.playerState.level;
  scene.allyState.xp = scene.playerState.xp;

  const allyX = scene.mpRole === 'host' ? 40 : -40;
  scene.ally = new Player(scene, allyX, 0, scene.allyState);
  scene.ally.setTint(0xffaa66);
  scene.ally.hp = getMaxHp(scene.allyState);
  scene.ally.maxHp = getMaxHp(scene.allyState);

  scene.sharedMaxHp = Math.max(scene.player.maxHp, scene.ally.maxHp);
  scene.sharedHp = scene.sharedMaxHp;
  scene.syncSharedHpToPlayers();

  if (scene.mpRole === 'host') {
    scene.allyCombat = new CombatSystem(scene, scene.ally, scene.waveManager, scene.allyState, {
      shareWith: scene.combatSystem,
    });
  }

  if (scene.net) {
    scene.net.on('message', (msg) => scene.handleNetMessage(msg));
    scene.net.on('disconnected', () => scene.handleNetDisconnect());
  }
}

export function syncSharedLevelToAlly(scene) {
  if (!scene.allyState) return;
  scene.allyState.level = scene.playerState.level;
  scene.allyState.xp = scene.playerState.xp;
}

export function buildSnapshot(scene) {
  const enemies = [];
  scene.waveManager.enemies.getChildren().forEach((enemy) => {
    if (!enemy.active || enemy.isDying) return;
    if (enemy._netId == null) enemy._netId = scene._guestNetId++;
    enemies.push({
      id: enemy._netId,
      type: enemy.typeId,
      x: Math.round(enemy.x),
      y: Math.round(enemy.y),
      hp: Math.ceil(enemy.hp),
      maxHp: enemy.maxHp,
    });
  });

  const projectiles = [];
  const pushProjs = (group) => {
    if (!group) return;
    group.getChildren().forEach((p) => {
      if (!p.active) return;
      if (p._netId == null) p._netId = scene._guestNetId++;
      projectiles.push({
        id: p._netId,
        x: Math.round(p.x),
        y: Math.round(p.y),
        r: Math.round((p.rotation || 0) * 100) / 100,
      });
    });
  };
  pushProjs(scene.combatSystem?.projectiles);
  pushProjs(scene.allyCombat?.projectiles);

  return {
    type: 'snapshot',
    hp: scene.sharedHp,
    maxHp: scene.sharedMaxHp,
    level: scene.playerState.level,
    xp: scene.playerState.xp,
    lives: scene.lives,
    wave: scene.waveManager.currentWave,
    gameState: scene.gameState,
    host: {
      x: Math.round(scene.player.x),
      y: Math.round(scene.player.y),
      aimX: scene.player.aimX,
      aimY: scene.player.aimY,
      weapon: scene.playerState.weapon?.name || 'None',
      weaponId: scene.playerState.weapon?.id || null,
      shield: !!scene.player.shieldActive,
    },
    guest: {
      x: Math.round(scene.ally.x),
      y: Math.round(scene.ally.y),
      aimX: scene.ally.aimX,
      aimY: scene.ally.aimY,
      weapon: scene.allyState.weapon?.name || 'None',
      weaponId: scene.allyState.weapon?.id || null,
      shield: !!scene.ally.shieldActive,
    },
    enemies,
    projectiles,
  };
}

export function applyGuestInputOnHost(scene, input) {
  if (!scene.ally || !input) return;
  const speed = getMoveSpeed(scene.allyState, scene.time.now);
  let vx = 0;
  let vy = 0;
  if (input.up) vy -= 1;
  if (input.down) vy += 1;
  if (input.left) vx -= 1;
  if (input.right) vx += 1;
  if (vx !== 0 || vy !== 0) {
    const len = Math.hypot(vx, vy) || 1;
    scene.ally.setVelocity((vx / len) * speed, (vy / len) * speed);
  } else {
    scene.ally.setVelocity(0, 0);
  }
  scene.ally.aimX = input.aimX;
  scene.ally.aimY = input.aimY;
  syncAllyWeaponVisual(scene.ally, scene.allyState.weapon, input.aimX, input.aimY);

  const fakePointer = {
    worldX: input.aimX,
    worldY: input.aimY,
    x: input.aimX,
    y: input.aimY,
    positionToCamera: () => ({ x: input.aimX, y: input.aimY }),
    leftButtonDown: () => !!input.fire,
    rightButtonDown: () => !!input.shield,
  };

  if (input.fire && scene.allyCombat && scene.allyState.weapon) {
    scene.allyCombat.performPrimaryAttack(fakePointer);
  }
  if (input.shield && scene.ally.activateShield(scene.time.now)) {
    scene.allyCombat?.onShieldActivate();
  }
  if (input.q || scene._guestQPending) {
    scene._guestQPending = false;
    scene.allyCombat?.useAttackPowerup(fakePointer);
  }
}

export function collectLocalInput(scene) {
  const p = scene.input.activePointer;
  const world = p.positionToCamera(scene.cameras.main);
  return {
    type: 'input',
    up: scene.cursors.W.isDown,
    down: scene.cursors.S.isDown,
    left: scene.cursors.A.isDown,
    right: scene.cursors.D.isDown,
    aimX: world.x,
    aimY: world.y,
    fire: p.leftButtonDown(),
    shield: p.rightButtonDown(),
    q: Phaser.Input.Keyboard.JustDown(scene.cursors.Q),
  };
}

export function applySnapshotOnGuest(scene, snap) {
  if (!snap || snap.type !== 'snapshot') return;
  scene.sharedHp = snap.hp;
  scene.sharedMaxHp = snap.maxHp;
  scene.lives = snap.lives;
  scene.playerState.level = snap.level;
  scene.playerState.xp = snap.xp;
  if (scene.allyState) {
    scene.allyState.level = snap.level;
    scene.allyState.xp = snap.xp;
  }
  scene.syncSharedHpToPlayers();

  // Soft-correct guest body toward host authority (keeps WASD feeling responsive).
  const gx = snap.guest.x;
  const gy = snap.guest.y;
  const dx = gx - scene.player.x;
  const dy = gy - scene.player.y;
  if (Math.hypot(dx, dy) > 48) {
    scene.player.setPosition(gx, gy);
  } else {
    scene.player.setPosition(scene.player.x + dx * 0.35, scene.player.y + dy * 0.35);
  }
  const hx = snap.host.x;
  const hy = snap.host.y;
  if (scene.ally._tx == null || Math.hypot(hx - scene.ally.x, hy - scene.ally.y) > 64) {
    scene.ally.setPosition(hx, hy);
  }
  scene.ally._tx = hx;
  scene.ally._ty = hy;
  scene.player.aimX = snap.guest.aimX;
  scene.player.aimY = snap.guest.aimY;
  scene.ally.aimX = snap.host.aimX;
  scene.ally.aimY = snap.host.aimY;

  // Keep remote host weapon art in sync on the guest client.
  if (snap.host.weaponId && scene.allyState) {
    if (scene.allyState.weapon?.id !== snap.host.weaponId) {
      const remoteWeapon = getWeapon(snap.host.weaponId);
      if (remoteWeapon) scene.allyState.weapon = remoteWeapon;
    }
    syncAllyWeaponVisual(scene.ally, scene.allyState.weapon, snap.host.aimX, snap.host.aimY);
  }

  scene.player.shieldActive = !!snap.guest.shield;
  scene.player.shieldSprite?.setVisible(scene.player.shieldActive);
  scene.player.shieldSprite?.setPosition(scene.player.x, scene.player.y);
  scene.ally.shieldActive = !!snap.host.shield;
  scene.ally.shieldSprite?.setVisible(scene.ally.shieldActive);
  scene.ally.shieldSprite?.setPosition(scene.ally.x, scene.ally.y);

  // Sync enemy visuals (lerp toward targets each frame)
  const seen = new Set();
  (snap.enemies || []).forEach((e) => {
    seen.add(e.id);
    let sprite = scene.guestEnemyMap.get(e.id);
    if (!sprite || !sprite.active) {
      sprite = spawnGuestEnemy(scene, e);
      scene.guestEnemyMap.set(e.id, sprite);
      sprite.setPosition(e.x, e.y);
    }
    sprite._tx = e.x;
    sprite._ty = e.y;
    sprite.hp = e.hp;
    sprite.maxHp = e.maxHp;
    sprite.setVisible(true);
  });
  scene.guestEnemyMap.forEach((sprite, id) => {
    if (!seen.has(id)) {
      sprite.destroy();
      scene.guestEnemyMap.delete(id);
    }
  });

  // Sync projectiles (host + ally shots)
  const seenP = new Set();
  (snap.projectiles || []).forEach((p) => {
    seenP.add(p.id);
    let sprite = scene.guestProjectileMap.get(p.id);
    if (!sprite || !sprite.active) {
      sprite = scene.add.image(p.x, p.y, 'projectile').setDepth(8);
      scene.guestProjectileMap.set(p.id, sprite);
      sprite.setPosition(p.x, p.y);
    }
    sprite._tx = p.x;
    sprite._ty = p.y;
    sprite._tr = p.r || 0;
    sprite.setVisible(true);
  });
  scene.guestProjectileMap.forEach((sprite, id) => {
    if (!seenP.has(id)) {
      sprite.destroy();
      scene.guestProjectileMap.delete(id);
    }
  });

  scene.events.emit('hud-update', { wave: snap.wave });
}

/** Update held-weapon texture/pose for a co-op ally sprite. */
export function syncAllyWeaponVisual(player, weapon, aimX, aimY) {
  if (!player?.weaponSprite || !weapon) return;
  const textureKey = `weapon_${weapon.id}`;
  if (player.scene.textures.exists(textureKey) && player.weaponSprite.texture.key !== textureKey) {
    player.weaponSprite.setTexture(textureKey);
  }
  player.aimAngle = Phaser.Math.Angle.Between(player.x, player.y, aimX, aimY);
  const holdOffset = weapon.type === 'melee' ? 22 : 18;
  player.weaponSprite.setPosition(
    player.x + Math.cos(player.aimAngle) * holdOffset,
    player.y + Math.sin(player.aimAngle) * holdOffset,
  );
  player.weaponSprite.setRotation(player.aimAngle);
  player.weaponSprite.setVisible(true);
  if (weapon.type === 'melee') player.weaponSprite.setOrigin(0.25, 0.5);
  else if (weapon.type === 'ranged') player.weaponSprite.setOrigin(0.3, 0.5);
  else player.weaponSprite.setOrigin(0.5, 0.5);
}

function spawnGuestEnemy(scene, e) {
  let enemy;
  if (e.type === 'goblinKing') enemy = new GoblinKing(scene, e.x, e.y, 7);
  else if (e.type === 'kingMagmaCube') enemy = new KingMagmaCube(scene, e.x, e.y, 7);
  else if (isWizardType(e.type)) enemy = new Wizard(scene, e.x, e.y, e.type, 1);
  else if (isMagmaType(e.type)) enemy = new MagmaCube(scene, e.x, e.y, e.type, 1);
  else enemy = new Enemy(scene, e.x, e.y, e.type, 1);
  enemy._netId = e.id;
  enemy.body.enable = false;
  enemy.update = () => {};
  return enemy;
}
