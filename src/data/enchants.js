/**
 * Weapon enchanting (Forge) — rarity tables, enchant defs, roll helpers.
 * Effects are weapon-bound mechanics cards cannot grant (not flat stat twins).
 */

export const FORGE_GOLD_COST = 5000;
export const FORGE_DIAMOND_COST = 80;

/** @typedef {'common'|'uncommon'|'rare'|'epic'|'legendary'|'spellbound'} RarityId */

/** @type {Record<RarityId, object>} */
export const Rarities = {
  common: {
    id: 'common',
    name: 'Common',
    color: '#8fd94a',
    hex: 0x8fd94a,
    icon: 'icon_diamond_lime',
    weight: 50,
    luckyWeight: 0,
    rateLabel: '50%',
  },
  uncommon: {
    id: 'uncommon',
    name: 'Uncommon',
    color: '#4ec8f0',
    hex: 0x4ec8f0,
    icon: 'icon_diamond_cyan',
    weight: 25,
    luckyWeight: 18,
    rateLabel: '25%',
  },
  rare: {
    id: 'rare',
    name: 'Rare',
    color: '#ff6ec7',
    hex: 0xff6ec7,
    icon: 'icon_diamond_magenta',
    weight: 13,
    luckyWeight: 35,
    rateLabel: '13%',
  },
  epic: {
    id: 'epic',
    name: 'Epic',
    color: '#4a6ad4',
    hex: 0x4a6ad4,
    icon: 'icon_diamond_navy',
    weight: 6,
    luckyWeight: 25,
    rateLabel: '6%',
  },
  legendary: {
    id: 'legendary',
    name: 'Legendary',
    color: '#ff4444',
    hex: 0xff4444,
    icon: 'icon_diamond_red',
    weight: 4,
    luckyWeight: 18,
    rateLabel: '4%',
  },
  spellbound: {
    id: 'spellbound',
    name: 'Spellbound',
    color: '#c8c8d8',
    hex: 0x1a1a22,
    icon: 'icon_diamond_black',
    weight: 2,
    luckyWeight: 4,
    rateLabel: '2%',
  },
};

export const RarityList = Object.values(Rarities);

/**
 * Each enchant mutates a weapon copy via `modify(weapon)`.
 * Combat reads `weapon.enchant*` fields — keep these unique vs shop cards.
 */
export const Enchants = {
  // —— Common ——
  coinFlick: {
    id: 'coinFlick',
    rarity: 'common',
    name: 'Coin Flick',
    description: 'Hits have an 18% chance to flick out a coin.',
    modify(w) {
      w.enchantCoinFlick = 0.18;
    },
  },
  firstBlood: {
    id: 'firstBlood',
    rarity: 'common',
    name: 'First Blood',
    description: 'Deal +20% damage to enemies still at full HP.',
    modify(w) {
      w.enchantFirstBlood = true;
    },
  },
  softEcho: {
    id: 'softEcho',
    rarity: 'common',
    name: 'Soft Echo',
    description: '22% chance a ghost echo re-hits for 22% damage.',
    modify(w) {
      w.enchantSoftEcho = 0.22;
    },
  },
  stickyTip: {
    id: 'stickyTip',
    rarity: 'common',
    name: 'Sticky Tip',
    description: 'Hits briefly root enemies in place.',
    modify(w) {
      w.enchantRoot = true;
    },
  },
  momentumCut: {
    id: 'momentumCut',
    rarity: 'common',
    name: 'Momentum Cut',
    description: 'Deal more damage the faster you are moving (up to +15%).',
    modify(w) {
      w.enchantMomentum = true;
    },
  },

  // —— Uncommon ——
  greedKill: {
    id: 'greedKill',
    rarity: 'uncommon',
    name: 'Greed Kill',
    description: 'Kills with this weapon drop +3 bonus coins.',
    modify(w) {
      w.enchantGreedKill = 3;
    },
  },
  splitShard: {
    id: 'splitShard',
    rarity: 'uncommon',
    name: 'Split Shard',
    description: 'Kills fling a shard that seeks the next nearest foe.',
    modify(w) {
      w.enchantSplitShard = true;
    },
  },
  staggerBlow: {
    id: 'staggerBlow',
    rarity: 'uncommon',
    name: 'Stagger Blow',
    description: '30% chance to stun an enemy for a short beat.',
    modify(w) {
      w.enchantStagger = 0.3;
    },
  },
  lingeringMote: {
    id: 'lingeringMote',
    rarity: 'uncommon',
    name: 'Lingering Mote',
    description: 'Hits leave a damaging mote that burns for 1.2s.',
    modify(w) {
      w.enchantLingeringMote = true;
    },
  },
  afterimage: {
    id: 'afterimage',
    rarity: 'uncommon',
    name: 'Afterimage',
    description: 'Each attack leaves a short damaging afterimage behind you.',
    modify(w) {
      w.enchantAfterimage = true;
    },
  },

  // —— Rare ——
  fuseCharge: {
    id: 'fuseCharge',
    rarity: 'rare',
    name: 'Fuse Charge',
    description: 'Every 5th hit with this weapon detonates for 2.2× damage.',
    modify(w) {
      w.enchantFuseCharge = true;
    },
  },
  blinkCut: {
    id: 'blinkCut',
    rarity: 'rare',
    name: 'Blink Cut',
    description: 'Attacks blink you a short distance toward your aim.',
    modify(w) {
      w.enchantBlinkCut = true;
    },
  },
  shieldSiphon: {
    id: 'shieldSiphon',
    rarity: 'rare',
    name: 'Shield Siphon',
    description: 'Kills refund a chunk of shield cooldown.',
    modify(w) {
      w.enchantShieldSiphon = 450;
    },
  },
  brandMark: {
    id: 'brandMark',
    rarity: 'rare',
    name: 'Brand Mark',
    description: 'Hits brand foes; branded enemies cook with extra burn DoT.',
    modify(w) {
      w.enchantBrand = true;
    },
  },
  magnetBite: {
    id: 'magnetBite',
    rarity: 'rare',
    name: 'Magnet Bite',
    description: 'Hits yank nearby XP orbs toward you.',
    modify(w) {
      w.enchantMagnetBite = true;
    },
  },

  // —— Epic ——
  gravHook: {
    id: 'gravHook',
    rarity: 'epic',
    name: 'Grav Hook',
    description: 'Hits reel enemies toward you.',
    modify(w) {
      w.enchantGravHook = true;
    },
  },
  timeEcho: {
    id: 'timeEcho',
    rarity: 'epic',
    name: 'Time Echo',
    description: '0.45s later a time-ghost repeats the hit for 70% damage.',
    modify(w) {
      w.enchantTimeEcho = true;
    },
  },
  bloodInk: {
    id: 'bloodInk',
    rarity: 'epic',
    name: 'Blood Ink',
    description: 'This weapon hits harder the lower your HP (up to +55%).',
    modify(w) {
      w.enchantBloodInk = true;
    },
  },
  mirrorBite: {
    id: 'mirrorBite',
    rarity: 'epic',
    name: 'Mirror Bite',
    description: 'Every attack also strikes the opposite direction.',
    modify(w) {
      w.enchantMirrorBite = true;
    },
  },
  hexBloom: {
    id: 'hexBloom',
    rarity: 'epic',
    name: 'Hex Bloom',
    description: 'Kills bloom into a delayed hex nova after a short fuse.',
    modify(w) {
      w.enchantHexBloom = true;
    },
  },

  // —— Legendary ——
  deathFuse: {
    id: 'deathFuse',
    rarity: 'legendary',
    name: 'Death Fuse',
    description: 'Survivors of your hit explode 1s later for most of that damage.',
    modify(w) {
      w.enchantDeathFuse = true;
    },
  },
  orbitBlades: {
    id: 'orbitBlades',
    rarity: 'legendary',
    name: 'Orbit Blades',
    description: 'Three blades orbit you and carve anything they touch.',
    modify(w) {
      w.enchantOrbitBlades = true;
    },
  },
  riftKill: {
    id: 'riftKill',
    rarity: 'legendary',
    name: 'Rift Kill',
    description: 'Kills tear a rift: brief invuln and a blink toward your aim.',
    modify(w) {
      w.enchantRiftKill = true;
    },
  },
  swarmSparks: {
    id: 'swarmSparks',
    rarity: 'legendary',
    name: 'Swarm Sparks',
    description: 'Each attack releases 2 seeking sparks that chase foes.',
    modify(w) {
      w.enchantSwarmSparks = true;
    },
  },
  ascendant: {
    id: 'ascendant',
    rarity: 'legendary',
    name: 'Ascendant',
    description: 'This weapon grows: +6% damage each wave you clear this run.',
    modify(w) {
      w.enchantAscendant = true;
    },
  },

  // —— Spellbound ——
  singularityCore: {
    id: 'singularityCore',
    rarity: 'spellbound',
    name: 'Singularity Core',
    description: 'Kills birth a miniature black hole that pulls and shreds.',
    modify(w) {
      w.enchantSingularityCore = true;
    },
  },
  livingSteel: {
    id: 'livingSteel',
    rarity: 'spellbound',
    name: 'Living Steel',
    description: 'The weapon strikes on its own every second at the nearest foe.',
    modify(w) {
      w.enchantLivingSteel = true;
    },
  },
  fateRewrite: {
    id: 'fateRewrite',
    rarity: 'spellbound',
    name: 'Fate Rewrite',
    description: 'Every 8th hit rewrites fate: 3× damage and chains to 2 more foes.',
    modify(w) {
      w.enchantFateRewrite = true;
    },
  },
  entropyEdge: {
    id: 'entropyEdge',
    rarity: 'spellbound',
    name: 'Entropy Edge',
    description: 'Each hit rolls chaos: stun, pull, coin rain, heal, or echo blast.',
    modify(w) {
      w.enchantEntropy = true;
    },
  },
  worldSever: {
    id: 'worldSever',
    rarity: 'spellbound',
    name: 'World Sever',
    description: 'Every 6th attack severs a line through the battlefield.',
    modify(w) {
      w.enchantWorldSever = true;
    },
  },
};

export const EnchantList = Object.values(Enchants);

export function getEnchant(id) {
  return Enchants[id] || null;
}

export function getRarity(id) {
  return Rarities[id] || null;
}

export function enchantsForRarity(rarityId) {
  return EnchantList.filter((e) => e.rarity === rarityId);
}

function pickWeighted(entries, weightKey) {
  const total = entries.reduce((sum, e) => sum + (e[weightKey] || 0), 0);
  if (total <= 0) return entries[0];
  let roll = Math.random() * total;
  for (const entry of entries) {
    roll -= entry[weightKey] || 0;
    if (roll <= 0) return entry;
  }
  return entries[entries.length - 1];
}

/** @param {boolean} lucky */
export function rollRarity(lucky = false) {
  const key = lucky ? 'luckyWeight' : 'weight';
  const pool = RarityList.filter((r) => (r[key] || 0) > 0);
  return pickWeighted(pool, key);
}

export function rollEnchantForRarity(rarityId) {
  const pool = enchantsForRarity(rarityId);
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Full forge roll → { rarity, enchant }. */
export function rollForgeEnchant(lucky = false) {
  const rarity = rollRarity(lucky);
  const enchant = rollEnchantForRarity(rarity.id);
  return { rarity, enchant };
}

/**
 * Apply a saved enchant onto a weapon card copy.
 * @param {object} weapon
 * @param {{ enchantId: string, rarityId: string } | null} saved
 */
export function applyEnchantToWeapon(weapon, saved) {
  if (!weapon) return null;
  const out = { ...weapon };
  if (!saved?.enchantId) {
    out.enchant = null;
    return out;
  }
  const enchant = getEnchant(saved.enchantId);
  const rarity = getRarity(saved.rarityId || enchant?.rarity);
  if (!enchant) {
    out.enchant = null;
    return out;
  }
  out.enchant = {
    id: enchant.id,
    name: enchant.name,
    description: enchant.description,
    rarityId: rarity?.id || enchant.rarity,
    rarityName: rarity?.name || enchant.rarity,
    rarityColor: rarity?.color || '#ffffff',
    rarityHex: rarity?.hex || 0xffffff,
    icon: rarity?.icon || null,
  };
  enchant.modify?.(out);
  return out;
}

/** Lucky-roll rate labels for the side panel. */
export function luckyRateLabel(rarityId) {
  const r = Rarities[rarityId];
  if (!r || !r.luckyWeight) return '0%';
  const total = RarityList.reduce((s, x) => s + (x.luckyWeight || 0), 0);
  return `${Math.round((r.luckyWeight / total) * 100)}%`;
}
