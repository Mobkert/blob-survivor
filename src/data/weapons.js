/** @typedef {'ranged' | 'melee' | 'big'} WeaponType */

import { isWeaponUnlocked } from './meta.js';

/** Weapons earned by clearing Frozen Tundra (not in the base pool). */
export const TUNDRA_UNLOCK_WEAPON_IDS = ['assaultRifle', 'molotov', 'mace'];

export function isTundraUnlockWeapon(weaponId) {
  return TUNDRA_UNLOCK_WEAPON_IDS.includes(weaponId);
}

export function isWeaponInPool(weapon) {
  if (!weapon) return false;
  if (!isTundraUnlockWeapon(weapon.id)) return true;
  return isWeaponUnlocked(weapon.id);
}

/** @type {Record<string, object>} */
export const Weapons = {
  shortbow: {
    id: 'shortbow',
    name: 'Shortbow',
    type: 'ranged',
    color: 0x8b6914,
    damage: 12,
    cooldownMs: 350,
    projectileSpeed: 520,
    description: 'Fast shots, low damage.',
  },
  revolver: {
    id: 'revolver',
    name: 'Revolver',
    type: 'ranged',
    color: 0x666677,
    damage: 20,
    cooldownMs: 450,
    projectileSpeed: 600,
    description: 'Balanced sidearm.',
  },
  crossbow: {
    id: 'crossbow',
    name: 'Crossbow',
    type: 'ranged',
    color: 0x553322,
    damage: 35,
    cooldownMs: 700,
    projectileSpeed: 700,
    description: 'Slow, heavy bolts.',
  },
  assaultRifle: {
    id: 'assaultRifle',
    name: 'Assault Rifle',
    type: 'ranged',
    color: 0x777788,
    damage: 7,
    cooldownMs: 1600,
    projectileSpeed: 680,
    burstCount: 4,
    burstGapMs: 65,
    description: 'Fires a 4-round burst. Long reload between bursts.',
    tundraUnlock: true,
  },
  sword: {
    id: 'sword',
    name: 'Sword',
    type: 'melee',
    color: 0xccccdd,
    damage: 25,
    cooldownMs: 400,
    range: 70,
    arcDegrees: 90,
    zombiePerk: true,
    description: 'Balanced slash arc. Instantly kills zombies.',
  },
  axe: {
    id: 'axe',
    name: 'Axe',
    type: 'melee',
    color: 0xaa6644,
    damage: 32,
    cooldownMs: 550,
    range: 65,
    arcDegrees: 120,
    zombiePerk: true,
    description: 'Wide, slower swings. Instantly kills zombies.',
  },
  spear: {
    id: 'spear',
    name: 'Spear',
    type: 'melee',
    color: 0x8899aa,
    damage: 22,
    cooldownMs: 380,
    range: 110,
    arcDegrees: 45,
    zombiePerk: true,
    description: 'Long narrow thrust. Instantly kills zombies.',
  },
  mace: {
    id: 'mace',
    name: 'Mace',
    type: 'melee',
    color: 0x8899aa,
    damage: 45,
    cooldownMs: 1100,
    range: 88,
    circularHit: true,
    description: 'Heavy circular smash. Huge damage, long cooldown.',
    tundraUnlock: true,
  },
  bomb: {
    id: 'bomb',
    name: 'Bomb',
    type: 'big',
    color: 0x222222,
    damage: 40,
    cooldownMs: 900,
    radius: 90,
    fuseMs: 800,
    zombiePerk: true,
    description: 'Placed bomb with delayed fuse. Instantly kills zombies.',
  },
  grenade: {
    id: 'grenade',
    name: 'Grenade',
    type: 'big',
    color: 0x446633,
    damage: 35,
    cooldownMs: 750,
    radius: 75,
    throwSpeed: 400,
    zombiePerk: true,
    description: 'Thrown toward cursor. Instantly kills zombies.',
  },
  molotov: {
    id: 'molotov',
    name: 'Molotov',
    type: 'big',
    color: 0x335522,
    damage: 28,
    cooldownMs: 1550,
    radius: 80,
    throwSpeed: 400,
    fireDurationMinMs: 2000,
    fireDurationMaxMs: 4000,
    fireTickDamage: 6,
    fireRadius: 95,
    description: 'Thrown bottle. Explodes into a lingering fire patch.',
    tundraUnlock: true,
  },
  shockwave: {
    id: 'shockwave',
    name: 'Shockwave',
    type: 'big',
    color: 0x6688ff,
    damage: 28,
    cooldownMs: 650,
    radius: 100,
    instant: true,
    zombiePerk: true,
    description: 'Instant ring around you. Instantly kills zombies.',
  },
};

export const WeaponList = Object.values(Weapons);

export function getAvailableWeapons() {
  return WeaponList.filter((w) => isWeaponInPool(w));
}

export function getTundraUnlockOptions() {
  return TUNDRA_UNLOCK_WEAPON_IDS.map((id) => getWeapon(id)).filter(
    (w) => w && !isWeaponUnlocked(w.id),
  );
}

export function getWeapon(id) {
  return Weapons[id] ? { ...Weapons[id] } : null;
}

export function pickWeaponCards(count = 3) {
  const available = getAvailableWeapons();
  const types = ['ranged', 'melee', 'big'];
  const picked = [];

  for (const type of types) {
    const pool = available.filter((w) => w.type === type && !picked.some((p) => p.id === w.id));
    if (pool.length === 0) continue;
    const weapon = pool[Math.floor(Math.random() * pool.length)];
    picked.push(weapon);
  }

  while (picked.length < count) {
    const remaining = available.filter((w) => !picked.some((p) => p.id === w.id));
    if (remaining.length === 0) break;
    picked.push(remaining[Math.floor(Math.random() * remaining.length)]);
  }

  return picked.slice(0, count);
}
