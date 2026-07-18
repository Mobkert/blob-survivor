/** @typedef {'ranged' | 'melee' | 'big'} WeaponType */

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

export function getWeapon(id) {
  return Weapons[id] ? { ...Weapons[id] } : null;
}

export function pickWeaponCards(count = 3) {
  const types = ['ranged', 'melee', 'big'];
  const picked = [];
  const usedTypes = new Set();

  for (const type of types) {
    const pool = WeaponList.filter((w) => w.type === type);
    const weapon = pool[Math.floor(Math.random() * pool.length)];
    picked.push(weapon);
    usedTypes.add(type);
  }

  while (picked.length < count) {
    const remaining = WeaponList.filter((w) => !picked.some((p) => p.id === w.id));
    if (remaining.length === 0) break;
    picked.push(remaining[Math.floor(Math.random() * remaining.length)]);
  }

  return picked.slice(0, count);
}
