/**
 * Multiplayer helpers mixed into GameScene (keeps GameScene readable).
 */
import Phaser from 'phaser';
import { createPlayerState, getMaxHp, PLAYER_LIVES } from '../data/constants.js';
import { Player } from '../entities/Player.js';
import { CombatSystem } from './CombatSystem.js';
import { getActiveNetplay, clearActiveNetplay } from './NetplayManager.js';
import { Enemy } from '../entities/Enemy.js';
import { Wizard, isWizardType } from '../entities/Wizard.js';
import { MagmaCube, isMagmaType } from '../entities/MagmaCube.js';
import { GoblinKing } from '../entities/GoblinKing.js';
import { KingMagmaCube } from '../entities/KingMagmaCube.js';

const SNAPSHOT_MS = 80;

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
  scene._guestNetId = 1;
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
  scene.waveManager.enemies.getChildren().forEach((enemy, index) => {
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
      x: scene.player.x,
      y: scene.player.y,
      aimX: scene.player.aimX,
      aimY: scene.player.aimY,
      weapon: scene.playerState.weapon?.name || 'None',
    },
    guest: {
      x: scene.ally.x,
      y: scene.ally.y,
      aimX: scene.ally.aimX,
      aimY: scene.ally.aimY,
      weapon: scene.allyState.weapon?.name || 'None',
    },
    enemies,
  };
}

export function applyGuestInputOnHost(scene, input) {
  if (!scene.ally || !input) return;
  const speed = 220 * (scene.allyState.speedMultiplier || 1) * (1 + (scene.allyState.speedBonus || 0));
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
  scene.ally.aimAngle = Phaser.Math.Angle.Between(scene.ally.x, scene.ally.y, input.aimX, input.aimY);
  if (scene.ally.weaponSprite && scene.allyState.weapon) {
    const holdOffset = scene.allyState.weapon.type === 'melee' ? 22 : 18;
    scene.ally.weaponSprite.setPosition(
      scene.ally.x + Math.cos(scene.ally.aimAngle) * holdOffset,
      scene.ally.y + Math.sin(scene.ally.aimAngle) * holdOffset,
    );
    scene.ally.weaponSprite.setRotation(scene.ally.aimAngle);
    scene.ally.weaponSprite.setVisible(true);
  }

  if (input.fire && scene.allyCombat) {
    const fakePointer = {
      worldX: input.aimX,
      worldY: input.aimY,
      x: input.aimX,
      y: input.aimY,
      positionToCamera: () => ({ x: input.aimX, y: input.aimY }),
      leftButtonDown: () => true,
      rightButtonDown: () => false,
    };
    if (scene.ally.canAttack(scene.time.now)) {
      scene.allyCombat.performPrimaryAttack(fakePointer);
    }
  }
  if (input.shield && scene.ally.activateShield(scene.time.now)) {
    scene.allyCombat?.onShieldActivate();
  }
  if (input.q) {
    scene.allyCombat?.useAttackPowerup({
      worldX: input.aimX,
      worldY: input.aimY,
      positionToCamera: () => ({ x: input.aimX, y: input.aimY }),
    });
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

  // On guest: player = local guest, ally = remote host
  scene.player.setPosition(snap.guest.x, snap.guest.y);
  scene.ally.setPosition(snap.host.x, snap.host.y);
  scene.player.aimX = snap.guest.aimX;
  scene.player.aimY = snap.guest.aimY;
  scene.ally.aimX = snap.host.aimX;
  scene.ally.aimY = snap.host.aimY;

  // Sync enemy visuals
  const seen = new Set();
  (snap.enemies || []).forEach((e) => {
    seen.add(e.id);
    let sprite = scene.guestEnemyMap.get(e.id);
    if (!sprite || !sprite.active) {
      sprite = spawnGuestEnemy(scene, e);
      scene.guestEnemyMap.set(e.id, sprite);
    }
    sprite.setPosition(e.x, e.y);
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

  scene.events.emit('hud-update', { wave: snap.wave });
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
