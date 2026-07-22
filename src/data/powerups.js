import { ShopItems } from './shop.js';
import { loadMeta } from './meta.js';

/** @type {Record<string, object>} */
export const Powerups = {
  multishot: {
    id: 'multishot',
    name: 'Multishot',
    category: 'projectile',
    color: 0x44aaff,
    description: '+2 extra projectiles per shot. −20% ranged damage.',
    eligible: (state) => state.weapon?.type === 'ranged',
    apply: (state) => {
      state.bonusProjectiles += 2;
      state.rangedDamageBonus = (state.rangedDamageBonus || 0) - 0.2;
    },
  },
  piercing: {
    id: 'piercing',
    name: 'Piercing Shots',
    category: 'projectile',
    color: 0x88ccff,
    description: 'Projectiles pierce +1 enemy.',
    eligible: (state) => state.weapon?.type === 'ranged',
    apply: (state) => {
      state.piercing += 1;
    },
  },
  blastRadius: {
    id: 'blastRadius',
    name: 'Blast Radius+',
    category: 'explosive',
    color: 0xff8844,
    description: 'Every hit triggers an explosion on the enemy.',
    eligible: () => true,
    apply: (state) => {
      state.blastRadiusBonus += 0.25;
    },
  },
  chainReaction: {
    id: 'chainReaction',
    name: 'Chain Reaction',
    category: 'explosive',
    color: 0xff6622,
    description: 'Explosion kills chain to nearby foes.',
    eligible: () => true,
    apply: (state) => {
      state.chainReaction = true;
    },
  },
  maxHp: {
    id: 'maxHp',
    name: 'Max HP+',
    category: 'passive',
    color: 0x44ff88,
    description: '+15 maximum health.',
    eligible: () => true,
    apply: (state) => {
      state.maxHpBonus += 15;
    },
  },
  healOnKill: {
    id: 'healOnKill',
    name: 'Heal on Kill',
    category: 'passive',
    color: 0x22cc66,
    description: 'Restore 3 HP per kill (max 15 from this card).',
    eligible: (state) => (state.healOnKillStacks || 0) < 5,
    apply: (state) => {
      state.healOnKillStacks = (state.healOnKillStacks || 0) + 1;
      state.healOnKill = Math.min(15, (state.healOnKill || 0) + 3);
    },
  },
  moveSpeed: {
    id: 'moveSpeed',
    name: 'Move Speed+',
    category: 'passive',
    color: 0xaaff44,
    description: '+10% movement speed.',
    eligible: () => true,
    apply: (state) => {
      state.speedBonus += 0.1;
    },
  },
  poison: {
    id: 'poison',
    name: 'Poison',
    category: 'effect',
    color: 0x88ff22,
    description: 'Hits apply poison over time.',
    eligible: () => true,
    apply: (state) => {
      state.poison = true;
    },
  },
  slowOnHit: {
    id: 'slowOnHit',
    name: 'Slow on Hit',
    category: 'effect',
    color: 0x44ddff,
    description: 'Hits slow enemies briefly.',
    eligible: () => true,
    apply: (state) => {
      state.slowOnHit = true;
    },
  },
  dashSlash: {
    id: 'dashSlash',
    name: 'Dash Slash',
    category: 'attack',
    color: 0xffcc44,
    description: 'Q: Dash forward and slash (melee).',
    attackType: 'dashSlash',
    cooldownMs: 4000,
    eligible: (state) => state.weapon?.type === 'melee',
    apply: (state) => {
      state.attackPowerup = 'dashSlash';
    },
  },
  sniperShot: {
    id: 'sniperShot',
    name: 'Sniper Shot',
    category: 'attack',
    color: 0xffaa88,
    description: 'Q: High-damage piercing shot.',
    attackType: 'sniperShot',
    cooldownMs: 5000,
    eligible: (state) => state.weapon?.type === 'ranged',
    apply: (state) => {
      state.attackPowerup = 'sniperShot';
    },
  },
  megaBlast: {
    id: 'megaBlast',
    name: 'Mega Blast',
    category: 'attack',
    color: 0xff4488,
    description: 'Q: Huge explosion at cursor.',
    attackType: 'megaBlast',
    cooldownMs: 6000,
    eligible: (state) => state.weapon?.type === 'big',
    apply: (state) => {
      state.attackPowerup = 'megaBlast';
    },
  },
  glassCannon: {
    id: 'glassCannon',
    name: 'Glass Cannon',
    category: 'curse',
    color: 0xff2244,
    description: '+40% damage, -20 max HP.',
    eligible: () => true,
    apply: (state) => {
      state.damageMultiplier *= 1.4;
      state.maxHpBonus -= 20;
    },
  },
  turtle: {
    id: 'turtle',
    name: 'Turtle',
    category: 'curse',
    color: 0x668866,
    description: '+25 max HP, -15% speed.',
    eligible: () => true,
    apply: (state) => {
      state.maxHpBonus += 25;
      state.speedMultiplier *= 0.85;
    },
  },
  reckless: {
    id: 'reckless',
    name: 'Reckless',
    category: 'curse',
    color: 0xcc4422,
    description: '+30% damage dealt, +30% damage taken.',
    eligible: () => true,
    apply: (state) => {
      state.damageMultiplier *= 1.3;
      state.damageTakenMultiplier *= 1.3;
    },
  },
};

export const PowerupList = Object.values(Powerups);

function shuffleArray(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Base powerups + shop unlocks the player has bought. */
export function getAvailablePowerups() {
  const unlocked = loadMeta().unlocked || [];
  const shopUnlocked = unlocked
    .map((id) => ShopItems[id])
    .filter(Boolean);
  return [...PowerupList, ...shopUnlocked];
}

function weightedPick(items, count, levelId = 'plains') {
  const pool = items.map((item) => ({
    item,
    // Equal odds for starter and shop cards; swamp still favors Heal on Kill a bit.
    weight: item.id === 'healOnKill' && levelId === 'swamp' ? 7 : 1,
  }));
  const picked = [];

  while (picked.length < count && pool.length > 0) {
    const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * total;
    let index = 0;
    for (; index < pool.length; index += 1) {
      roll -= pool[index].weight;
      if (roll <= 0) break;
    }
    index = Math.min(index, pool.length - 1);
    picked.push(pool[index].item);
    pool.splice(index, 1);
  }

  return picked;
}

export function pickPowerupCards(state, count = 3, levelId = 'plains') {
  const available = getAvailablePowerups().filter((p) => p.eligible(state));
  if (available.length === 0) return [];

  const result = [];

  // In Murk Swamp, often guarantee Heal on Kill in the offer.
  if (levelId === 'swamp') {
    const heal = available.find((p) => p.id === 'healOnKill');
    if (heal && Math.random() < 0.55) {
      result.push(heal);
    }
  }

  const remainingPool = available.filter((p) => !result.some((r) => r.id === p.id));
  const fillers = weightedPick(remainingPool, count - result.length, levelId);
  result.push(...fillers);

  return shuffleArray(result).slice(0, count);
}

export function getPowerup(id) {
  if (Powerups[id]) return { ...Powerups[id] };
  if (ShopItems[id]) return { ...ShopItems[id] };
  return null;
}
