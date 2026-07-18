/** @type {Record<string, object>} */
export const Enemies = {
  zombie: {
    id: 'zombie',
    name: 'Zombie',
    color: 0x4a7a3a,
    hp: 1,
    speed: 70,
    contactDamage: 8,
    xp: 1,
    coinMin: 2,
    coinMax: 6,
    instantKill: true,
    radius: 18,
  },
  runner: {
    id: 'runner',
    name: 'Runner',
    color: 0xc44a4a,
    hp: 20,
    speed: 140,
    contactDamage: 12,
    xp: 2,
    coinMin: 5,
    coinMax: 12,
    instantKill: false,
    radius: 14,
  },
  brute: {
    id: 'brute',
    name: 'Brute',
    color: 0x553366,
    hp: 60,
    speed: 55,
    contactDamage: 18,
    xp: 3,
    coinMin: 12,
    coinMax: 25,
    instantKill: false,
    radius: 26,
  },
  goblinKing: {
    id: 'goblinKing',
    name: 'Goblin King',
    color: 0x2d8a3e,
    hp: 1400,
    speed: 0,
    contactDamage: 28,
    xp: 40,
    coinMin: 100,
    coinMax: 180,
    instantKill: false,
    radius: 56,
    isBoss: true,
    attackDamage: 48,
    farDistance: 520,
  },
  wizard: {
    id: 'wizard',
    name: 'Wizard',
    color: 0x4488ff,
    hp: 55,
    speed: 95,
    contactDamage: 10,
    xp: 4,
    coinMin: 8,
    coinMax: 16,
    instantKill: false,
    radius: 18,
    isWizard: true,
    attackDamage: 22,
    preferRange: 260,
  },
  darkWizard: {
    id: 'darkWizard',
    name: 'Dark Wizard',
    color: 0x5522aa,
    hp: 70,
    speed: 85,
    contactDamage: 12,
    xp: 5,
    coinMin: 10,
    coinMax: 18,
    instantKill: false,
    radius: 18,
    isWizard: true,
    attackDamage: 8,
    preferRange: 300,
  },
  healWizard: {
    id: 'healWizard',
    name: 'Healing Wizard',
    color: 0x44dd88,
    hp: 50,
    speed: 135,
    contactDamage: 8,
    xp: 4,
    coinMin: 8,
    coinMax: 15,
    instantKill: false,
    radius: 18,
    isWizard: true,
    healAmount: 18,
    preferRange: 200,
  },
  lightningWizard: {
    id: 'lightningWizard',
    name: 'Lightning Wizard',
    color: 0xffcc44,
    hp: 65,
    speed: 90,
    contactDamage: 10,
    xp: 5,
    coinMin: 10,
    coinMax: 18,
    instantKill: false,
    radius: 18,
    isWizard: true,
    attackDamage: 16,
    preferRange: 280,
  },
};

export function rollEnemyCoins(enemyData) {
  const min = enemyData.coinMin ?? 2;
  const max = enemyData.coinMax ?? 6;
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** How many 5-wave gold reductions have kicked in (wave 5 → 1, wave 10 → 2, …). */
export function getCoinReductionSteps(wave) {
  return Math.max(0, Math.floor((wave || 1) / 5));
}

/**
 * Rolls coin drop for an enemy, reduced every 5 waves until capped at 3.
 * After enough milestones (wave 25+), every enemy drops exactly 3.
 */
export function rollEnemyCoinsForWave(enemyData, wave = 1) {
  let min = enemyData.coinMin ?? 2;
  let max = enemyData.coinMax ?? 6;
  const steps = getCoinReductionSteps(wave);
  // Each 5-wave step pulls drops 20% of the way toward 3 (fully there at wave 25).
  const shrink = Math.min(1, steps * 0.2);
  min = Math.round(min + (3 - min) * shrink);
  max = Math.round(max + (3 - max) * shrink);
  if (steps >= 5) return 3;
  if (max < min) max = min;
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function getEnemyData(id) {
  return Enemies[id] ? { ...Enemies[id] } : null;
}

export function getScaledEnemyHp(baseHp, wave) {
  return Math.floor(baseHp * (1 + (wave - 1) * 0.08));
}

export function getScaledBossHp(baseHp, wave) {
  // Wave 7 = 1st fight, 14 = 2nd, 21 = 3rd, ...
  const encounter = Math.max(1, Math.floor(wave / 7));
  // First fight uses normal wave-7 scaling (average difficulty).
  const baseline = getScaledEnemyHp(baseHp, 7);
  // Each later Goblin King fight gains +45% HP over the previous baseline step.
  return Math.floor(baseline * (1 + (encounter - 1) * 0.45));
}

export function isBossWave(wave) {
  return wave > 0 && wave % 7 === 0;
}
