import { loadMeta, saveMeta, SHOP_ROTATION_MS } from './meta.js';

/** Shop-only unlockable powerups. Once bought, they can appear in level-up cards. */
export const ShopItems = {
  // --- existing ---
  fortune: {
    id: 'fortune',
    name: 'Fortune',
    category: 'projectile',
    color: 0xffd700,
    price: 700,
    description:
      'Ranged: draw 3 cards per shot. Stackable — more stacks = luckier pairs/triples. +90ms attack CD.',
    eligible: (state) => state.weapon?.type === 'ranged',
    apply: (state) => {
      state.fortuneStacks = (state.fortuneStacks || 0) + 1;
      state.fortune = true;
      addCooldownTax(state, 0, 90);
    },
  },
  vampireBite: {
    id: 'vampireBite',
    name: 'Vampire Bite',
    category: 'passive',
    color: 0xaa2244,
    price: 450,
    description: 'Heal for 10% of damage dealt. +2.5s shield CD, +100ms attack CD.',
    eligible: () => true,
    apply: (state) => {
      state.lifesteal = (state.lifesteal || 0) + 0.1;
      addCooldownTax(state, 2500, 100);
    },
  },
  ghostStep: {
    id: 'ghostStep',
    name: 'Ghost Step',
    category: 'attack',
    color: 0xccddff,
    price: 500,
    description: 'Q: Dash + brief invuln. Long Q CD. +1.5s shield CD, +70ms attack CD.',
    attackType: 'ghostStep',
    cooldownMs: 9000,
    eligible: () => true,
    apply: (state) => {
      state.attackPowerup = 'ghostStep';
      addCooldownTax(state, 1500, 70);
    },
  },
  ricochet: {
    id: 'ricochet',
    name: 'Ricochet',
    category: 'projectile',
    color: 0x88aaff,
    price: 550,
    description: 'Ranged shots bounce once. +60ms attack CD.',
    eligible: (state) => state.weapon?.type === 'ranged',
    apply: (state) => {
      state.ricochet = (state.ricochet || 0) + 1;
      addCooldownTax(state, 0, 60);
    },
  },
  magnetPull: {
    id: 'magnetPull',
    name: 'Magnet Pull',
    category: 'passive',
    color: 0xffaa00,
    price: 350,
    description: 'Much larger pickup range for XP and coins.',
    eligible: () => true,
    apply: (state) => {
      state.magnetBonus = (state.magnetBonus || 0) + 120;
    },
  },
  secondWind: {
    id: 'secondWind',
    name: 'Second Wind',
    category: 'passive',
    color: 0xffffff,
    price: 600,
    description: 'Once per run, survive a killing blow at 1 HP. +1s shield CD.',
    eligible: () => true,
    apply: (state) => {
      state.secondWind = true;
      state.secondWindUsed = false;
      addCooldownTax(state, 1000, 0);
    },
  },

  // --- shield type ---
  iceExplosion: {
    id: 'iceExplosion',
    name: 'Ice Explosion',
    category: 'shield',
    color: 0x88eeff,
    price: 520,
    description: 'Shield ice blast. +2s shield cooldown, +40ms attack cooldown.',
    eligible: () => true,
    apply: (state) => {
      addShieldEffect(state, 'iceExplosion');
      addCooldownTax(state, 2000, 40);
    },
  },
  fireNova: {
    id: 'fireNova',
    name: 'Fire Nova',
    category: 'shield',
    color: 0xff6622,
    price: 500,
    description: 'Shield fire ring. +2s shield cooldown, +40ms attack cooldown.',
    eligible: () => true,
    apply: (state) => {
      addShieldEffect(state, 'fireNova');
      addCooldownTax(state, 2000, 40);
    },
  },
  thornAura: {
    id: 'thornAura',
    name: 'Thorn Aura',
    category: 'shield',
    color: 0x66aa44,
    price: 420,
    description: 'Thorns while shielded. +1s shield cooldown.',
    eligible: () => true,
    apply: (state) => {
      addShieldEffect(state, 'thornAura');
      state.shieldThorns = (state.shieldThorns || 0) + 12;
      addCooldownTax(state, 1000, 0);
    },
  },
  healPulse: {
    id: 'healPulse',
    name: 'Heal Pulse',
    category: 'shield',
    color: 0x66ff99,
    price: 480,
    description: 'Shield heals 15 HP. Heavy tax: +5s shield CD, +120ms attack CD.',
    eligible: () => true,
    apply: (state) => {
      addShieldEffect(state, 'healPulse');
      state.shieldHeal = (state.shieldHeal || 0) + 15;
      addCooldownTax(state, 5000, 120);
    },
  },
  knockbackBurst: {
    id: 'knockbackBurst',
    name: 'Knockback Burst',
    category: 'shield',
    color: 0xaaccff,
    price: 400,
    description: 'Shield knockback. +1.5s shield cooldown.',
    eligible: () => true,
    apply: (state) => {
      addShieldEffect(state, 'knockbackBurst');
      addCooldownTax(state, 1500, 0);
    },
  },
  stormShield: {
    id: 'stormShield',
    name: 'Storm Shield',
    category: 'shield',
    color: 0x8866ff,
    price: 580,
    description: 'Shield lightning. +2.5s shield CD, +60ms attack CD.',
    eligible: () => true,
    apply: (state) => {
      addShieldEffect(state, 'stormShield');
      addCooldownTax(state, 2500, 60);
    },
  },
  frostArmor: {
    id: 'frostArmor',
    name: 'Frost Armor',
    category: 'shield',
    color: 0xcceeff,
    price: 460,
    description: 'Longer shield + chill. +1.5s shield cooldown.',
    eligible: () => true,
    apply: (state) => {
      addShieldEffect(state, 'frostArmor');
      state.shieldDurationBonus = (state.shieldDurationBonus || 0) + 500;
      addCooldownTax(state, 1500, 0);
    },
  },
  coinShield: {
    id: 'coinShield',
    name: 'Coin Shield',
    category: 'shield',
    color: 0xffd24a,
    price: 380,
    description: 'Shield grants 15 coins. +3s shield CD, +50ms attack CD.',
    eligible: () => true,
    apply: (state) => {
      addShieldEffect(state, 'coinShield');
      state.shieldCoins = (state.shieldCoins || 0) + 15;
      addCooldownTax(state, 3000, 50);
    },
  },

  // --- more shop cards ---
  doubleTap: {
    id: 'doubleTap',
    name: 'Double Tap',
    category: 'projectile',
    color: 0xffcc88,
    price: 480,
    description: 'Ranged: extra delayed shot. +110ms attack CD.',
    eligible: (state) => state.weapon?.type === 'ranged',
    apply: (state) => {
      state.doubleTap = true;
      addCooldownTax(state, 0, 110);
    },
  },
  overcharge: {
    id: 'overcharge',
    name: 'Overcharge',
    category: 'projectile',
    color: 0xff88ff,
    price: 620,
    description: 'Ranged: +35% projectile damage. +80ms attack CD.',
    eligible: (state) => state.weapon?.type === 'ranged',
    apply: (state) => {
      state.rangedDamageBonus = (state.rangedDamageBonus || 0) + 0.35;
      addCooldownTax(state, 0, 80);
    },
  },
  cleaveMastery: {
    id: 'cleaveMastery',
    name: 'Cleave Mastery',
    category: 'attack',
    color: 0xddaa55,
    price: 440,
    description: 'Melee: wider slash + range. +50ms attack CD.',
    eligible: (state) => state.weapon?.type === 'melee',
    apply: (state) => {
      state.meleeArcBonus = (state.meleeArcBonus || 0) + 25;
      state.meleeRangeBonus = (state.meleeRangeBonus || 0) + 15;
      addCooldownTax(state, 0, 50);
    },
  },
  heavySwing: {
    id: 'heavySwing',
    name: 'Heavy Swing',
    category: 'attack',
    color: 0xcc7744,
    price: 490,
    description: 'Melee: +40% damage. +100ms attack CD.',
    eligible: (state) => state.weapon?.type === 'melee',
    apply: (state) => {
      state.meleeDamageBonus = (state.meleeDamageBonus || 0) + 0.4;
      addCooldownTax(state, 0, 100);
    },
  },
  bigBoom: {
    id: 'bigBoom',
    name: 'Big Boom',
    category: 'explosive',
    color: 0xff4400,
    price: 540,
    description: 'Big: +30% damage, larger blasts. +70ms attack CD.',
    eligible: (state) => state.weapon?.type === 'big',
    apply: (state) => {
      state.bigDamageBonus = (state.bigDamageBonus || 0) + 0.3;
      state.blastRadiusBonus = (state.blastRadiusBonus || 0) + 0.2;
      addCooldownTax(state, 0, 70);
    },
  },
  stickyBombs: {
    id: 'stickyBombs',
    name: 'Sticky Bombs',
    category: 'explosive',
    color: 0x66aa33,
    price: 510,
    description: 'Big: longer fuse, much harder hits. +90ms attack CD.',
    eligible: (state) => state.weapon?.type === 'big',
    apply: (state) => {
      state.bigDamageBonus = (state.bigDamageBonus || 0) + 0.5;
      state.fuseBonusMs = (state.fuseBonusMs || 0) + 200;
      addCooldownTax(state, 0, 90);
    },
  },
  bloodlust: {
    id: 'bloodlust',
    name: 'Bloodlust',
    category: 'passive',
    color: 0xcc2255,
    price: 460,
    description: '+8% move speed after each kill briefly.',
    eligible: () => true,
    apply: (state) => {
      state.bloodlust = true;
    },
  },
  goldFever: {
    id: 'goldFever',
    name: 'Gold Fever',
    category: 'passive',
    color: 0xffcc33,
    price: 400,
    description: 'Enemies drop 50% more coins. +40ms attack CD.',
    eligible: () => true,
    apply: (state) => {
      state.coinMultiplier = (state.coinMultiplier || 1) * 1.5;
      addCooldownTax(state, 0, 40);
    },
  },
  xpSurge: {
    id: 'xpSurge',
    name: 'XP Surge',
    category: 'passive',
    color: 0x44ffaa,
    price: 430,
    description: 'Gain +1 bonus XP from every kill.',
    eligible: () => true,
    apply: (state) => {
      state.bonusXp = (state.bonusXp || 0) + 1;
    },
  },
  ironSkin: {
    id: 'ironSkin',
    name: 'Iron Skin',
    category: 'passive',
    color: 0x8899aa,
    price: 470,
    description: 'Take 20% less damage. +1.5s shield CD, +40ms attack CD.',
    eligible: () => true,
    apply: (state) => {
      state.damageTakenMultiplier *= 0.8;
      addCooldownTax(state, 1500, 40);
    },
  },
  adrenaline: {
    id: 'adrenaline',
    name: 'Adrenaline',
    category: 'passive',
    color: 0xff6688,
    price: 410,
    description: '+15% attack speed (lower cooldowns).',
    eligible: () => true,
    apply: (state) => {
      state.attackSpeedBonus = (state.attackSpeedBonus || 0) + 0.15;
    },
  },
  toxicCloud: {
    id: 'toxicCloud',
    name: 'Toxic Cloud',
    category: 'effect',
    color: 0x88ff44,
    price: 450,
    description:
      'Hits spawn a toxic gas cloud that damages foes inside. Stackable — clouds grow bigger. +50ms attack CD.',
    eligible: () => true,
    apply: (state) => {
      state.toxicCloud = (state.toxicCloud || 0) + 1;
      addCooldownTax(state, 0, 50);
    },
  },
  deepFreeze: {
    id: 'deepFreeze',
    name: 'Deep Freeze',
    category: 'effect',
    color: 0x66ccff,
    price: 460,
    description: 'Hits chill enemies longer. +50ms attack CD.',
    eligible: () => true,
    apply: (state) => {
      state.slowOnHit = true;
      state.slowBonusMs = (state.slowBonusMs || 0) + 1000;
      addCooldownTax(state, 0, 50);
    },
  },
  criticalEye: {
    id: 'criticalEye',
    name: 'Critical Eye',
    category: 'passive',
    color: 0xffee55,
    price: 560,
    description: '15% chance to deal double damage. +70ms attack CD.',
    eligible: () => true,
    apply: (state) => {
      state.critChance = (state.critChance || 0) + 0.15;
      addCooldownTax(state, 0, 70);
    },
  },
  scavenger: {
    id: 'scavenger',
    name: 'Scavenger',
    category: 'passive',
    color: 0xbb9966,
    price: 370,
    description: 'Heal 3 HP on coin pickup. +3s shield CD, +60ms attack CD.',
    eligible: () => true,
    apply: (state) => {
      state.healOnCoin = (state.healOnCoin || 0) + 3;
      addCooldownTax(state, 3000, 60);
    },
  },
  berserk: {
    id: 'berserk',
    name: 'Berserk',
    category: 'curse',
    color: 0xff2200,
    price: 390,
    description: '+50% damage, take +25% damage. +60ms attack CD.',
    eligible: () => true,
    apply: (state) => {
      state.damageMultiplier *= 1.5;
      state.damageTakenMultiplier *= 1.25;
      addCooldownTax(state, 0, 60);
    },
  },
  glassAim: {
    id: 'glassAim',
    name: 'Glass Aim',
    category: 'curse',
    color: 0xffaacc,
    price: 410,
    description: '+60% ranged damage, -25 max HP. +80ms attack CD.',
    eligible: (state) => state.weapon?.type === 'ranged',
    apply: (state) => {
      state.rangedDamageBonus = (state.rangedDamageBonus || 0) + 0.6;
      state.maxHpBonus -= 25;
      addCooldownTax(state, 0, 80);
    },
  },
  juggernaut: {
    id: 'juggernaut',
    name: 'Juggernaut',
    category: 'curse',
    color: 0x668866,
    price: 440,
    description: '+40 max HP, -20% move speed. +1s shield CD.',
    eligible: () => true,
    apply: (state) => {
      state.maxHpBonus += 40;
      state.speedMultiplier *= 0.8;
      addCooldownTax(state, 1000, 0);
    },
  },
  shadowStrike: {
    id: 'shadowStrike',
    name: 'Shadow Strike',
    category: 'attack',
    color: 0x553388,
    price: 570,
    description: 'Q: Teleport slash. Long Q CD. +2s shield CD, +100ms attack CD.',
    attackType: 'shadowStrike',
    cooldownMs: 10000,
    eligible: (state) => state.weapon?.type === 'melee',
    apply: (state) => {
      state.attackPowerup = 'shadowStrike';
      addCooldownTax(state, 2000, 100);
    },
  },
  barrage: {
    id: 'barrage',
    name: 'Barrage',
    category: 'attack',
    color: 0xffaa66,
    price: 590,
    description: 'Q: Rapid 5-shot burst. Long Q CD. +2s shield CD, +90ms attack CD.',
    attackType: 'barrage',
    cooldownMs: 9500,
    eligible: (state) => state.weapon?.type === 'ranged',
    apply: (state) => {
      state.attackPowerup = 'barrage';
      addCooldownTax(state, 2000, 90);
    },
  },
  clusterBomb: {
    id: 'clusterBomb',
    name: 'Cluster Bomb',
    category: 'attack',
    color: 0xff7744,
    price: 610,
    description: 'Q: 3 mini blasts. Long Q CD. +2s shield CD, +90ms attack CD.',
    attackType: 'clusterBomb',
    cooldownMs: 11000,
    eligible: (state) => state.weapon?.type === 'big',
    apply: (state) => {
      state.attackPowerup = 'clusterBomb';
      addCooldownTax(state, 2000, 90);
    },
  },

  // --- helpful cooldown / speed cards ---
  quickDraw: {
    id: 'quickDraw',
    name: 'Quick Draw',
    category: 'passive',
    color: 0x88ffaa,
    price: 380,
    description: '+20% attack speed (shorter shot cooldown).',
    eligible: () => true,
    apply: (state) => {
      state.attackSpeedBonus = (state.attackSpeedBonus || 0) + 0.2;
    },
  },
  hairTrigger: {
    id: 'hairTrigger',
    name: 'Hair Trigger',
    category: 'passive',
    color: 0xaaff66,
    price: 520,
    description: '+30% attack speed. Fire much faster.',
    eligible: () => true,
    apply: (state) => {
      state.attackSpeedBonus = (state.attackSpeedBonus || 0) + 0.3;
    },
  },
  lightTrigger: {
    id: 'lightTrigger',
    name: 'Light Trigger',
    category: 'passive',
    color: 0xccff88,
    price: 420,
    description: 'Flat -80ms on every attack cooldown.',
    eligible: () => true,
    apply: (state) => {
      state.attackCooldownBonusMs = (state.attackCooldownBonusMs || 0) - 80;
    },
  },
  rapidReload: {
    id: 'rapidReload',
    name: 'Rapid Reload',
    category: 'projectile',
    color: 0x66ddaa,
    price: 460,
    description: 'Ranged: +25% attack speed.',
    eligible: (state) => state.weapon?.type === 'ranged',
    apply: (state) => {
      state.attackSpeedBonus = (state.attackSpeedBonus || 0) + 0.25;
    },
  },
  bladeDance: {
    id: 'bladeDance',
    name: 'Blade Dance',
    category: 'attack',
    color: 0x99ee77,
    price: 460,
    description: 'Melee: +25% attack speed.',
    eligible: (state) => state.weapon?.type === 'melee',
    apply: (state) => {
      state.attackSpeedBonus = (state.attackSpeedBonus || 0) + 0.25;
    },
  },
  slickFuse: {
    id: 'slickFuse',
    name: 'Slick Fuse',
    category: 'explosive',
    color: 0x88cc55,
    price: 440,
    description: 'Big: +20% attack speed (throw bombs faster).',
    eligible: (state) => state.weapon?.type === 'big',
    apply: (state) => {
      state.attackSpeedBonus = (state.attackSpeedBonus || 0) + 0.2;
    },
  },
  nimbleGuard: {
    id: 'nimbleGuard',
    name: 'Nimble Guard',
    category: 'shield',
    color: 0xaaddff,
    price: 400,
    description: 'Shield recovers 1.5s faster.',
    eligible: () => true,
    apply: (state) => {
      state.shieldCooldownBonusMs = (state.shieldCooldownBonusMs || 0) - 1500;
    },
  },
  coolHead: {
    id: 'coolHead',
    name: 'Cool Head',
    category: 'passive',
    color: 0x88ccee,
    price: 480,
    description: 'Q abilities recover 2.5s faster.',
    eligible: () => true,
    apply: (state) => {
      state.attackPowerupCooldownReduceMs = (state.attackPowerupCooldownReduceMs || 0) + 2500;
    },
  },
  focusBreath: {
    id: 'focusBreath',
    name: 'Focus Breath',
    category: 'passive',
    color: 0xbbffdd,
    price: 490,
    description: '+12% attack speed and shield recovers 0.8s faster.',
    eligible: () => true,
    apply: (state) => {
      state.attackSpeedBonus = (state.attackSpeedBonus || 0) + 0.12;
      state.shieldCooldownBonusMs = (state.shieldCooldownBonusMs || 0) - 800;
    },
  },
  machineTempo: {
    id: 'machineTempo',
    name: 'Machine Tempo',
    category: 'passive',
    color: 0x66ffcc,
    price: 580,
    description: '+18% attack speed and -50ms flat attack CD.',
    eligible: () => true,
    apply: (state) => {
      state.attackSpeedBonus = (state.attackSpeedBonus || 0) + 0.18;
      state.attackCooldownBonusMs = (state.attackCooldownBonusMs || 0) - 50;
    },
  },
  steadyHands: {
    id: 'steadyHands',
    name: 'Steady Hands',
    category: 'passive',
    color: 0x99eebb,
    price: 410,
    description: '+15% attack speed. Simple and reliable.',
    eligible: () => true,
    apply: (state) => {
      state.attackSpeedBonus = (state.attackSpeedBonus || 0) + 0.15;
    },
  },
  reflexOil: {
    id: 'reflexOil',
    name: 'Reflex Oil',
    category: 'passive',
    color: 0x77ddaa,
    price: 450,
    description: '-100ms flat attack CD and shield recovers 0.5s faster.',
    eligible: () => true,
    apply: (state) => {
      state.attackCooldownBonusMs = (state.attackCooldownBonusMs || 0) - 100;
      state.shieldCooldownBonusMs = (state.shieldCooldownBonusMs || 0) - 500;
    },
  },

  // --- premium 1000+ cards ---
  airstrike: {
    id: 'airstrike',
    name: 'Airstrike',
    category: 'explosive',
    color: 0xff5522,
    price: 4500,
    eligible: (state) => state.weapon?.type === 'big',
    apply: (state) => {
      state.airstrike = true;
      state.bigDamageBonus = (state.bigDamageBonus || 0) + 0.25;
      addCooldownTax(state, 0, 120);
    },
  },
  warGod: {
    id: 'warGod',
    name: 'War God',
    category: 'passive',
    color: 0xff3344,
    price: 1400,
    description: '+60% all damage, +30% attack speed, +20 max HP. Take +15% damage.',
    eligible: () => true,
    apply: (state) => {
      state.damageMultiplier *= 1.6;
      state.attackSpeedBonus = (state.attackSpeedBonus || 0) + 0.3;
      state.maxHpBonus += 20;
      state.damageTakenMultiplier *= 1.15;
    },
  },
  immortalCore: {
    id: 'immortalCore',
    name: 'Immortal Core',
    category: 'passive',
    color: 0xffeecc,
    price: 4000,
    description: 'Revive at 40% HP (2s invuln). +80% max HP. -12% move speed.',
    eligible: () => true,
    apply: (state) => {
      state.secondWind = true;
      state.secondWindUsed = false;
      state.immortalCore = true;
      state.maxHpMultiplier = (state.maxHpMultiplier || 1) * 1.8;
      state.speedMultiplier *= 0.88;
    },
  },
  nukeCore: {
    id: 'nukeCore',
    name: 'Nuke Core',
    category: 'explosive',
    color: 0xff2200,
    price: 5000,
    eligible: (state) => state.weapon?.type === 'big',
    apply: (state) => {
      state.bigDamageBonus = (state.bigDamageBonus || 0) + 0.75;
      state.blastRadiusBonus = (state.blastRadiusBonus || 0) + 0.7;
      state.fuseBonusMs = (state.fuseBonusMs || 0) + 250;
    },
  },
  eagleEye: {
    id: 'eagleEye',
    name: 'Eagle Eye',
    category: 'projectile',
    color: 0x88ffee,
    price: 1200,
    description: 'Ranged: +65% dmg, pierce +3, 25% crit, ricochet. -20 max HP, +70ms attack CD.',
    eligible: (state) => state.weapon?.type === 'ranged',
    apply: (state) => {
      state.rangedDamageBonus = (state.rangedDamageBonus || 0) + 0.65;
      state.piercing = (state.piercing || 0) + 3;
      state.critChance = (state.critChance || 0) + 0.25;
      state.ricochet = (state.ricochet || 0) + 1;
      state.maxHpBonus -= 20;
      addCooldownTax(state, 0, 70);
    },
  },
  reaperEdge: {
    id: 'reaperEdge',
    name: 'Reaper Edge',
    category: 'attack',
    color: 0xaa22ff,
    price: 1300,
    description: 'Melee: +70% dmg, big cleave, +30% attack speed, +6 heal/kill. Take +12% damage.',
    eligible: (state) => state.weapon?.type === 'melee',
    apply: (state) => {
      state.meleeDamageBonus = (state.meleeDamageBonus || 0) + 0.7;
      state.meleeArcBonus = (state.meleeArcBonus || 0) + 45;
      state.meleeRangeBonus = (state.meleeRangeBonus || 0) + 30;
      state.attackSpeedBonus = (state.attackSpeedBonus || 0) + 0.3;
      state.healOnKill = (state.healOnKill || 0) + 6;
      state.damageTakenMultiplier *= 1.12;
    },
  },

  // --- unique specialty cards ---
  soulHarvest: {
    id: 'soulHarvest',
    name: 'Soul Harvest',
    category: 'effect',
    color: 0xcc88ff,
    price: 520,
    description: 'Kills leave a soul that detonates after a short delay.',
    eligible: () => true,
    apply: (state) => {
      state.soulHarvest = true;
    },
  },
  hexMark: {
    id: 'hexMark',
    name: 'Hex Mark',
    category: 'effect',
    color: 0xff66aa,
    price: 480,
    description: 'Hits mark foes. Marked enemies take +60% damage from your next hit.',
    eligible: () => true,
    apply: (state) => {
      state.hexMark = true;
    },
  },
  gravityHook: {
    id: 'gravityHook',
    name: 'Gravity Hook',
    category: 'attack',
    color: 0x8866cc,
    price: 500,
    description: 'Melee: hitting a foe yanks nearby enemies toward them.',
    eligible: (state) => state.weapon?.type === 'melee',
    apply: (state) => {
      state.gravityHook = true;
    },
  },
  staticField: {
    id: 'staticField',
    name: 'Static Field',
    category: 'passive',
    color: 0x88ddff,
    price: 460,
    description: 'Stand still to charge. Your next attack unleashes a shock burst.',
    eligible: () => true,
    apply: (state) => {
      state.staticField = true;
      state.staticCharge = 0;
    },
  },
  bloodPact: {
    id: 'bloodPact',
    name: 'Blood Pact',
    category: 'curse',
    color: 0xaa1144,
    price: 440,
    description: 'Each attack costs 4 HP but deals +45% damage.',
    eligible: () => true,
    apply: (state) => {
      state.bloodPact = true;
    },
  },
  mirrorWard: {
    id: 'mirrorWard',
    name: 'Mirror Ward',
    category: 'shield',
    color: 0xaaddff,
    price: 540,
    description: 'Shielding grants a ward that blocks the next hit taken.',
    eligible: () => true,
    apply: (state) => {
      state.mirrorWard = true;
      addShieldEffect(state, 'mirrorWard');
    },
  },
  coinNova: {
    id: 'coinNova',
    name: 'Coin Nova',
    category: 'passive',
    color: 0xffd24a,
    price: 420,
    description: 'Picking up a coin blasts nearby foes for light damage.',
    eligible: () => true,
    apply: (state) => {
      state.coinNova = true;
    },
  },
  frostAura: {
    id: 'frostAura',
    name: 'Frost Aura',
    category: 'effect',
    color: 0x99ddff,
    price: 490,
    description: 'While moving slowly, chill enemies around you.',
    eligible: () => true,
    apply: (state) => {
      state.frostAura = true;
      state.slowOnHit = true;
    },
  },
  killBounce: {
    id: 'killBounce',
    name: 'Kill Bounce',
    category: 'projectile',
    color: 0xffaa66,
    price: 560,
    description: 'Ranged: killing a foe with a shot makes it bounce to another with full force.',
    eligible: (state) => state.weapon?.type === 'ranged',
    apply: (state) => {
      state.killBounce = true;
      state.ricochet = (state.ricochet || 0) + 1;
    },
  },

  // premium uniques
  chronoCrown: {
    id: 'chronoCrown',
    name: 'Chrono Crown',
    category: 'passive',
    color: 0x66ffe0,
    price: 1180,
    description: 'Every 8s, freeze nearby enemies for 1.2s. +1.5s shield CD.',
    eligible: () => true,
    apply: (state) => {
      state.chronoCrown = true;
      addCooldownTax(state, 1500, 0);
    },
  },
  phoenixPlume: {
    id: 'phoenixPlume',
    name: 'Phoenix Plume',
    category: 'effect',
    color: 0xff6622,
    price: 1320,
    description: 'Kills leave a burning plume that scorches foes. Take +10% damage.',
    eligible: () => true,
    apply: (state) => {
      state.phoenixPlume = true;
      state.damageTakenMultiplier *= 1.1;
    },
  },
  voidWalker: {
    id: 'voidWalker',
    name: 'Void Walker',
    category: 'shield',
    color: 0x5533aa,
    price: 1480,
    description: 'Shield blinks you toward the cursor, damaging foes along the path. +80ms attack CD.',
    eligible: () => true,
    apply: (state) => {
      state.voidWalker = true;
      addShieldEffect(state, 'voidWalker');
      addCooldownTax(state, 0, 80);
    },
  },

  // --- wave 2 uniques ---
  emberTrail: {
    id: 'emberTrail',
    name: 'Ember Trail',
    category: 'effect',
    color: 0xff7744,
    price: 470,
    description: 'While moving, leave a trail of embers that scorch foes.',
    eligible: () => true,
    apply: (state) => {
      state.emberTrail = true;
    },
  },
  executioner: {
    id: 'executioner',
    name: 'Executioner',
    category: 'passive',
    color: 0xaa2222,
    price: 510,
    description: 'Deal +50% damage to enemies below 30% HP.',
    eligible: () => true,
    apply: (state) => {
      state.executioner = true;
    },
  },
  bulwark: {
    id: 'bulwark',
    name: 'Bulwark',
    category: 'passive',
    color: 0x8899aa,
    price: 490,
    description: '+25 max HP, take 8% less damage, -10% move speed.',
    eligible: () => true,
    apply: (state) => {
      state.maxHpBonus += 25;
      state.damageTakenMultiplier *= 0.92;
      state.speedMultiplier *= 0.9;
    },
  },
  hunterMark: {
    id: 'hunterMark',
    name: 'Hunter Mark',
    category: 'effect',
    color: 0xffaa33,
    price: 450,
    description: 'Your first hit on each foe deals +30% damage.',
    eligible: () => true,
    apply: (state) => {
      state.hunterMark = true;
    },
  },
  adrenaline: {
    id: 'adrenaline',
    name: 'Adrenaline',
    category: 'passive',
    color: 0xff6688,
    price: 460,
    description: 'While below 40% HP, gain +30% attack speed.',
    eligible: () => true,
    apply: (state) => {
      state.adrenaline = true;
    },
  },
  scavenger: {
    id: 'scavenger',
    name: 'Scavenger',
    category: 'passive',
    color: 0x88cc66,
    price: 430,
    description: '+1 XP per orb. Picking up XP heals 2 HP.',
    eligible: () => true,
    apply: (state) => {
      state.scavenger = true;
      state.bonusXp = (state.bonusXp || 0) + 1;
    },
  },
  shatter: {
    id: 'shatter',
    name: 'Shatter',
    category: 'attack',
    color: 0xaaccff,
    price: 500,
    description: 'Melee: killing a foe triggers a small shatter blast.',
    eligible: (state) => state.weapon?.type === 'melee',
    apply: (state) => {
      state.shatter = true;
    },
  },
  piercingGale: {
    id: 'piercingGale',
    name: 'Piercing Gale',
    category: 'projectile',
    color: 0xaaeeff,
    price: 480,
    description: 'Ranged: +1 pierce. Shots shove enemies backward.',
    eligible: (state) => state.weapon?.type === 'ranged',
    apply: (state) => {
      state.piercingGale = true;
      state.piercing = (state.piercing || 0) + 1;
    },
  },
  fuseHaste: {
    id: 'fuseHaste',
    name: 'Fuse Haste',
    category: 'explosive',
    color: 0xff9944,
    price: 470,
    description: 'Big: bombs fuse 200ms faster and blasts are 15% larger.',
    eligible: (state) => state.weapon?.type === 'big',
    apply: (state) => {
      state.fuseBonusMs = (state.fuseBonusMs || 0) - 200;
      state.blastRadiusBonus = (state.blastRadiusBonus || 0) + 0.15;
    },
  },
  thornMail: {
    id: 'thornMail',
    name: 'Thorn Mail',
    category: 'passive',
    color: 0x66aa44,
    price: 520,
    description: 'Enemies that touch you take 10 damage back.',
    eligible: () => true,
    apply: (state) => {
      state.thornMail = 10;
    },
  },
  focusLens: {
    id: 'focusLens',
    name: 'Focus Lens',
    category: 'passive',
    color: 0xddcc88,
    price: 440,
    description: 'Standing still grants +20% damage.',
    eligible: () => true,
    apply: (state) => {
      state.focusLens = true;
    },
  },
  battleHymn: {
    id: 'battleHymn',
    name: 'Battle Hymn',
    category: 'passive',
    color: 0xffcc66,
    price: 490,
    description: 'Kills grant +25% attack speed for 1.5s.',
    eligible: () => true,
    apply: (state) => {
      state.battleHymn = true;
    },
  },
  vampiricShield: {
    id: 'vampiricShield',
    name: 'Vampiric Shield',
    category: 'shield',
    color: 0xcc4466,
    price: 530,
    description: 'Shielding heals 10 HP. +2s shield CD.',
    eligible: () => true,
    apply: (state) => {
      addShieldEffect(state, 'vampiricShield');
      state.shieldHeal = (state.shieldHeal || 0) + 10;
      addCooldownTax(state, 2000, 0);
    },
  },
  ironLung: {
    id: 'ironLung',
    name: 'Iron Lung',
    category: 'shield',
    color: 0x7788aa,
    price: 450,
    description: 'Shield lasts +0.5s. +50ms attack CD.',
    eligible: () => true,
    apply: (state) => {
      state.shieldDurationBonus = (state.shieldDurationBonus || 0) + 500;
      addCooldownTax(state, 0, 50);
    },
  },
  luckyStar: {
    id: 'luckyStar',
    name: 'Lucky Star',
    category: 'passive',
    color: 0xffe066,
    price: 420,
    description: '15% chance for coin drops to be doubled.',
    eligible: () => true,
    apply: (state) => {
      state.luckyStar = true;
    },
  },

  // premium wave 2
  aegisProtocol: {
    id: 'aegisProtocol',
    name: 'Aegis Protocol',
    category: 'shield',
    color: 0x88aaff,
    price: 1150,
    description: 'After shield ends, block the next hit. +1s shield CD.',
    eligible: () => true,
    apply: (state) => {
      state.aegisProtocol = true;
      addCooldownTax(state, 1000, 0);
    },
  },
  rampageCore: {
    id: 'rampageCore',
    name: 'Rampage Core',
    category: 'passive',
    color: 0xff4422,
    price: 1280,
    description: 'Kills stack +4% damage (max 10). Taking a hit clears stacks.',
    eligible: () => true,
    apply: (state) => {
      state.rampageCore = true;
      state.rampageStacks = 0;
    },
  },
  orbitalStrike: {
    id: 'orbitalStrike',
    name: 'Orbital Strike',
    category: 'explosive',
    color: 0xffaa22,
    price: 1450,
    description: 'Every 12s, call a blast on the nearest foe. Take +8% damage.',
    eligible: () => true,
    apply: (state) => {
      state.orbitalStrike = true;
      state.damageTakenMultiplier *= 1.08;
    },
  },

  // --- magma-themed cards (Volcanic Ridge) ---
  magmaCore: {
    id: 'magmaCore',
    name: 'Magma Core',
    category: 'effect',
    color: 0xff4422,
    price: 520,
    description: 'Hits ignite foes with burning magma. +40ms attack CD.',
    eligible: () => true,
    apply: (state) => {
      state.magmaCore = true;
      addCooldownTax(state, 0, 40);
    },
  },
  scorchedGround: {
    id: 'scorchedGround',
    name: 'Scorched Ground',
    category: 'effect',
    color: 0xcc3311,
    price: 580,
    description: 'Kills leave a pool of lava that scorches enemies.',
    eligible: () => true,
    apply: (state) => {
      state.scorchedGround = true;
    },
  },
  obsidianSkin: {
    id: 'obsidianSkin',
    name: 'Obsidian Skin',
    category: 'passive',
    color: 0x3a2218,
    price: 640,
    description: '+35 max HP, take 10% less damage, burn enemies that touch you. -8% move speed.',
    eligible: () => true,
    apply: (state) => {
      state.obsidianSkin = true;
      state.maxHpBonus += 35;
      state.damageTakenMultiplier *= 0.9;
      state.speedMultiplier *= 0.92;
    },
  },
  magmaPulse: {
    id: 'magmaPulse',
    name: 'Magma Pulse',
    category: 'explosive',
    color: 0xff6622,
    price: 720,
    description: 'Every 7s, erupt a magma pulse around you. Take +6% damage.',
    eligible: () => true,
    apply: (state) => {
      state.magmaPulse = true;
      state.damageTakenMultiplier *= 1.06;
    },
  },
  cinderRing: {
    id: 'cinderRing',
    name: 'Cinder Ring',
    category: 'effect',
    color: 0xffaa44,
    price: 690,
    description: 'Kills unleash an expanding ring of cinders. +50ms attack CD.',
    eligible: () => true,
    apply: (state) => {
      state.cinderRing = true;
      addCooldownTax(state, 0, 50);
    },
  },

  // --- budget unique cards (under 400 coins) ---
  pocketSand: {
    id: 'pocketSand',
    name: 'Pocket Sand',
    category: 'passive',
    color: 0xd4b483,
    price: 220,
    description: 'Hits have a 30% chance to stun an enemy briefly. Tiny attack tax.',
    eligible: () => true,
    apply: (state) => {
      state.pocketSand = true;
      addCooldownTax(state, 0, 30);
    },
  },
  splinter: {
    id: 'splinter',
    name: 'Splinter',
    category: 'projectile',
    color: 0xc8e0ff,
    price: 270,
    description: 'Kills fling a seeking shard at a nearby foe. +40ms attack CD.',
    eligible: () => true,
    apply: (state) => {
      state.splinter = true;
      addCooldownTax(state, 0, 40);
    },
  },
  bubbleWrap: {
    id: 'bubbleWrap',
    name: 'Bubble Wrap',
    category: 'passive',
    color: 0xa8e6ff,
    price: 250,
    description: 'Once per wave, the first hit that would hurt you pops harmlessly.',
    eligible: () => true,
    apply: (state) => {
      state.bubbleWrap = true;
      state.bubbleWrapReady = true;
      addCooldownTax(state, 500, 0);
    },
  },
  lootPinata: {
    id: 'lootPinata',
    name: 'Loot Piñata',
    category: 'passive',
    color: 0xffcc66,
    price: 290,
    description: 'Kills have a 25% chance to burst bonus coins. +1.5s shield CD.',
    eligible: () => true,
    apply: (state) => {
      state.lootPinata = true;
      addCooldownTax(state, 1500, 20);
    },
  },
  shieldBash: {
    id: 'shieldBash',
    name: 'Shield Bash',
    category: 'shield',
    color: 0x88aadd,
    price: 310,
    description: 'Raising shield knocks back and chips nearby enemies. +1s shield CD.',
    eligible: () => true,
    apply: (state) => {
      state.shieldBash = true;
      addCooldownTax(state, 1000, 20);
    },
  },
  xpSpark: {
    id: 'xpSpark',
    name: 'XP Spark',
    category: 'passive',
    color: 0x66ffaa,
    price: 240,
    description: 'Picking up XP zaps the nearest enemy. Mild shield tax.',
    eligible: () => true,
    apply: (state) => {
      state.xpSpark = true;
      addCooldownTax(state, 800, 0);
    },
  },
  overclock: {
    id: 'overclock',
    name: 'Overclock',
    category: 'passive',
    color: 0xff66aa,
    price: 330,
    description: 'Every 6th hit deals double damage. +50ms attack CD.',
    eligible: () => true,
    apply: (state) => {
      state.overclock = true;
      state.overclockHits = 0;
      addCooldownTax(state, 0, 50);
    },
  },
  crowPeck: {
    id: 'crowPeck',
    name: 'Crow Peck',
    category: 'passive',
    color: 0x334455,
    price: 350,
    description: 'Black crow aura: pecks nearest foe for 3 dmg every 1.2s. +40ms attack CD.',
    eligible: () => true,
    apply: (state) => {
      state.crowPeck = true;
      addCooldownTax(state, 0, 40);
    },
  },

  // --- boss drop (never sold in shop) ---
  tank: {
    id: 'tank',
    name: 'Tank',
    category: 'passive',
    color: 0xc8d0e0,
    price: 0,
    bossDrop: true,
    description:
      '+125 max HP, take 15% less damage, deal 35% less damage. 5% drop from Goblin King.',
    eligible: () => true,
    apply: (state) => {
      if (state.tankCard) return;
      state.tankCard = true;
      state.maxHpBonus += 125;
      state.damageTakenMultiplier *= 0.85;
      state.damageMultiplier *= 0.65;
    },
  },

  // --- diamond insane cards (bought with diamonds only) ---
  phantomEcho: {
    id: 'phantomEcho',
    name: 'Phantom Echo',
    category: 'projectile',
    color: 0x66f0ff,
    price: 0,
    diamondPrice: 125,
    currency: 'diamonds',
    description:
      'Ranged: each shot births seeking cyan phantoms. Stackable — more stacks = more phantoms. +80ms attack CD.',
    eligible: (state) => state.weapon?.type === 'ranged',
    apply: (state) => {
      state.phantomEcho = (state.phantomEcho || 0) + 1;
      addCooldownTax(state, 0, 80);
    },
  },
  bloodMoonArc: {
    id: 'bloodMoonArc',
    name: 'Blood Moon Arc',
    category: 'attack',
    color: 0xff2255,
    price: 0,
    diamondPrice: 130,
    currency: 'diamonds',
    description:
      'Melee: each slash leaves a spinning crimson moon that shreds nearby enemies. Take +8% damage.',
    eligible: (state) => state.weapon?.type === 'melee',
    apply: (state) => {
      state.bloodMoonArc = true;
      state.damageTakenMultiplier *= 1.08;
    },
  },
  singularity: {
    id: 'singularity',
    name: 'Singularity',
    category: 'explosive',
    color: 0xbb44ff,
    price: 0,
    diamondPrice: 140,
    currency: 'diamonds',
    description:
      'Big: blasts open a void that pulls enemies in, then detonates. +100ms attack CD.',
    eligible: (state) => state.weapon?.type === 'big',
    apply: (state) => {
      state.singularity = true;
      addCooldownTax(state, 0, 100);
    },
  },
};

function addShieldEffect(state, id) {
  if (!state.shieldEffects) state.shieldEffects = [];
  if (!state.shieldEffects.includes(id)) state.shieldEffects.push(id);
}

function addCooldownTax(state, shieldMs = 0, attackMs = 0) {
  state.shieldCooldownBonusMs = (state.shieldCooldownBonusMs || 0) + shieldMs;
  state.attackCooldownBonusMs = (state.attackCooldownBonusMs || 0) + attackMs;
}

export const ShopItemList = Object.values(ShopItems);
export const SHOP_OFFER_COUNT = 3;

export function getShopItem(id) {
  return ShopItems[id] ? { ...ShopItems[id] } : null;
}

export function isPremiumShopCard(item) {
  return item != null && (Number(item.price) >= 1000 || isDiamondShopCard(item));
}

export function isDiamondShopCard(item) {
  return item != null && (item.currency === 'diamonds' || Number(item.diamondPrice) > 0);
}

export function isBossDropCard(item) {
  return item != null && item.bossDrop === true;
}

export function getDiamondShopCards() {
  return ShopItemList.filter((item) => isDiamondShopCard(item));
}

function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function emptyOfferSlots() {
  return Array.from({ length: SHOP_OFFER_COUNT }, () => null);
}

/** Returns up to 3 shop offers (null = sold empty slot). Restocks only when the timer expires. */
export function getShopOffers() {
  const meta = loadMeta();
  const now = Date.now();
  const available = ShopItemList.filter(
    (item) =>
      !meta.unlocked.includes(item.id) && !isDiamondShopCard(item) && !isBossDropCard(item),
  );

  if (available.length === 0) {
    meta.shopOfferIds = emptyOfferSlots();
    if (!meta.shopOfferUntil || now >= meta.shopOfferUntil) {
      meta.shopOfferUntil = now + SHOP_ROTATION_MS;
      saveMeta(meta);
    }
    return { offers: emptyOfferSlots(), until: meta.shopOfferUntil, meta, catalogEmpty: true };
  }

  const needsRefresh =
    !meta.shopOfferUntil ||
    now >= meta.shopOfferUntil ||
    !Array.isArray(meta.shopOfferIds) ||
    meta.shopOfferIds.length !== SHOP_OFFER_COUNT;

  if (needsRefresh) {
    // Prefer at least one affordable unique (<400) when any remain unlocked.
    const cheap = shuffle(available.filter((item) => Number(item.price) > 0 && Number(item.price) < 400));
    const rest = shuffle(available.filter((item) => !(Number(item.price) > 0 && Number(item.price) < 400)));
    const picked = [];
    if (cheap.length > 0) picked.push(cheap[0]);
    const pool = shuffle([...cheap.slice(picked.length ? 1 : 0), ...rest]);
    while (picked.length < SHOP_OFFER_COUNT && pool.length > 0) {
      picked.push(pool.shift());
    }
    meta.shopOfferIds = emptyOfferSlots().map((_, i) => picked[i]?.id ?? null);
    meta.shopOfferUntil = now + SHOP_ROTATION_MS;
    saveMeta(meta);
  }

  const offers = (meta.shopOfferIds || emptyOfferSlots()).map((id) => {
    if (!id) return null;
    const item = getShopItem(id);
    if (!item || meta.unlocked.includes(item.id)) return null;
    return item;
  });

  while (offers.length < SHOP_OFFER_COUNT) offers.push(null);

  return { offers, until: meta.shopOfferUntil, meta, catalogEmpty: false };
}

export function forceRefreshShopOffers() {
  const meta = loadMeta();
  meta.shopOfferUntil = 0;
  meta.shopOfferIds = [];
  saveMeta(meta);
  return getShopOffers();
}
