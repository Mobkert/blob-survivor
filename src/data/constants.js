export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const ARENA_SIZE = 2400;
export const TILE_SIZE = 64;
export const PLAYER_MAX_HP = 100;
export const PLAYER_LIVES = 3;
export const PLAYER_SPEED = 220;
export const XP_MAGNET_RANGE = 80;
export const SHIELD_DURATION_MS = 1000;
export const SHIELD_COOLDOWN_MS = 3000;
export const WAVE_PAUSE_MS = 800;
export const CONTACT_IFRAMES_MS = 500;

export function xpToNextLevel(level) {
  return Math.floor(2 + (level - 1) * 1.2);
}

export function isWeaponPickWave(wave) {
  return wave === 1;
}

/** Offer a new weapon after clearing wave 5, 10, 15, ... */
export function shouldOfferWeaponPickAfterWave(clearedWave) {
  return clearedWave >= 5 && clearedWave % 5 === 0;
}

export function createPlayerState() {
  return {
    weapon: null,
    level: 1,
    xp: 0,
    bonusProjectiles: 0,
    piercing: 0,
    blastRadiusBonus: 0,
    chainReaction: false,
    maxHpBonus: 0,
    healOnKill: 0,
    speedBonus: 0,
    poison: false,
    slowOnHit: false,
    attackPowerup: null,
    damageMultiplier: 1,
    damageTakenMultiplier: 1,
    speedMultiplier: 1,
    fortune: false,
    fortuneStacks: 0,
    fortuneMod: 1,
    fortuneFlat: 0,
    lifesteal: 0,
    ricochet: 0,
    magnetBonus: 0,
    secondWind: false,
    secondWindUsed: false,
    shieldEffects: [],
    shieldThorns: 0,
    shieldHeal: 0,
    shieldCoins: 0,
    shieldDurationBonus: 0,
    shieldCooldownBonusMs: 0,
    attackCooldownBonusMs: 0,
    doubleTap: false,
    rangedDamageBonus: 0,
    meleeDamageBonus: 0,
    meleeArcBonus: 0,
    meleeRangeBonus: 0,
    bigDamageBonus: 0,
    fuseBonusMs: 0,
    bloodlust: false,
    bloodlustUntil: 0,
    coinMultiplier: 1,
    bonusXp: 0,
    attackSpeedBonus: 0,
    attackPowerupCooldownReduceMs: 0,
    poisonBonus: 0,
    toxicCloud: 0,
    slowBonusMs: 0,
    critChance: 0,
    healOnCoin: 0,
    airstrike: false,
    immortalCore: false,
    phantomEcho: 0,
    bloodMoonArc: false,
    singularity: false,
    soulHarvest: false,
    hexMark: false,
    gravityHook: false,
    staticField: false,
    staticCharge: 0,
    bloodPact: false,
    mirrorWard: false,
    mirrorWardCharges: 0,
    coinNova: false,
    frostAura: false,
    killBounce: false,
    chronoCrown: false,
    phoenixPlume: false,
    voidWalker: false,
    emberTrail: false,
    executioner: false,
    hunterMark: false,
    adrenaline: false,
    scavenger: false,
    shatter: false,
    piercingGale: false,
    thornMail: 0,
    focusLens: false,
    focusActive: false,
    battleHymn: false,
    battleHymnUntil: 0,
    luckyStar: false,
    aegisProtocol: false,
    rampageCore: false,
    rampageStacks: 0,
    orbitalStrike: false,
    tankCard: false,
  };
}

export function getMaxHp(state) {
  return PLAYER_MAX_HP + state.maxHpBonus;
}

export function getMoveSpeed(state, time = 0) {
  let speed = PLAYER_SPEED * state.speedMultiplier * (1 + state.speedBonus);
  if (state.bloodlust && time && state.bloodlustUntil && time < state.bloodlustUntil) {
    speed *= 1.08;
  }
  return speed;
}

export function getDamageMultiplier(state) {
  let mult = state.damageMultiplier * (state.fortuneMod || 1);
  if (state.focusLens && state.focusActive) mult *= 1.2;
  if (state.rampageCore && (state.rampageStacks || 0) > 0) {
    mult *= 1 + Math.min(10, state.rampageStacks) * 0.04;
  }
  return mult;
}
