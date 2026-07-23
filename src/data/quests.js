/**
 * Quest board definitions and helpers.
 * Progress is stored on the active save slot (meta.questBoard).
 */

export const QUEST_DIFFICULTIES = {
  easy: { id: 'easy', label: 'Easy', color: '#88cc66' },
  medium: { id: 'medium', label: 'Medium', color: '#ffcc44' },
  hard: { id: 'hard', label: 'Hard', color: '#ff7755' },
};

export const QUEST_REPLACEMENTS_MAX = 6;
export const QUEST_RESTOCK_MS = 20 * 60 * 1000;

/** Quest templates: type drives progress tracking. */
const TEMPLATES = [
  {
    type: 'kill_enemies',
    title: 'Slayer',
    desc: (n) => `Defeat ${n} enemies`,
    targets: { easy: 120, medium: 280, hard: 700 },
  },
  {
    type: 'survive_waves',
    title: 'Survivor',
    desc: (n) => `Clear ${n} waves`,
    targets: { easy: 10, medium: 15, hard: 30 },
  },
  {
    type: 'collect_coins',
    title: 'Treasure Hunt',
    desc: (n) => `Bank ${n} gold from runs`,
    targets: { easy: 600, medium: 2000, hard: 6000 },
  },
  {
    type: 'kill_bosses',
    title: 'Boss Hunter',
    desc: (n) => `Defeat ${n} boss${n > 1 ? 'es' : ''}`,
    targets: { easy: 1, medium: 2, hard: 4 },
  },
  {
    type: 'clear_level',
    title: 'Conqueror',
    desc: (n) => (n <= 1 ? 'Clear any level' : `Clear any level ${n} times`),
    targets: { easy: 1, medium: 2, hard: 3 },
  },
  {
    type: 'deal_damage',
    title: 'Bloodbath',
    desc: (n) => `Deal ${n} damage`,
    targets: { easy: 6000, medium: 15000, hard: 45000 },
  },
  {
    type: 'collect_xp',
    title: 'Scholar',
    desc: (n) => `Collect ${n} XP`,
    targets: { easy: 100, medium: 180, hard: 350 },
  },
  {
    type: 'reach_wave',
    title: 'Deep Dive',
    desc: (n) => `Reach wave ${n} in a run`,
    targets: { easy: 12, medium: 14, hard: 21 },
  },
  {
    type: 'clear_tundra',
    title: 'Frostbreaker',
    desc: (n) => (n <= 1 ? 'Clear Frozen Tundra' : `Clear Frozen Tundra ${n} times`),
    targets: { easy: 1, medium: 1, hard: 2 },
  },
  {
    type: 'clear_volcanic',
    title: 'Ash Walker',
    desc: (n) => (n <= 1 ? 'Clear Volcanic Ridge' : `Clear Volcanic Ridge ${n} times`),
    targets: { easy: 1, medium: 1, hard: 2 },
  },
  {
    type: 'clear_swamp',
    title: 'Murk Purge',
    desc: (n) => (n <= 1 ? 'Clear Murk Swamp' : `Clear Murk Swamp ${n} times`),
    targets: { easy: 1, medium: 1, hard: 2 },
  },
  {
    type: 'kill_wizards',
    title: 'Magebreaker',
    desc: (n) => `Defeat ${n} wizards`,
    targets: { easy: 20, medium: 40, hard: 100 },
  },
];

function isLevelClearType(type) {
  return type === 'clear_level' || String(type || '').startsWith('clear_');
}

function rewardFor(difficulty, type = '') {
  const roll = Math.random();
  const levelClear = isLevelClearType(type);

  // Easy: gold only (minimum 2000).
  if (difficulty === 'easy') {
    if (levelClear) {
      if (roll < 0.5) return { rewardType: 'gold', rewardAmount: 3500, label: '3500 Gold' };
      return { rewardType: 'gold', rewardAmount: 4500, label: '4500 Gold' };
    }
    if (roll < 0.5) return { rewardType: 'gold', rewardAmount: 2000, label: '2000 Gold' };
    if (roll < 0.8) return { rewardType: 'gold', rewardAmount: 2500, label: '2500 Gold' };
    return { rewardType: 'gold', rewardAmount: 3000, label: '3000 Gold' };
  }

  // Medium
  if (difficulty === 'medium') {
    if (levelClear) {
      if (roll < 0.35) return { rewardType: 'gold', rewardAmount: 7000, label: '7000 Gold' };
      if (roll < 0.6) return { rewardType: 'diamonds', rewardAmount: 30, label: '30 Diamonds' };
      if (roll < 0.85) return { rewardType: 'diamonds', rewardAmount: 40, label: '40 Diamonds' };
      return { rewardType: 'forge_roll', rewardAmount: 1, label: '1 Free Enchant Roll' };
    }
    if (roll < 0.35) return { rewardType: 'gold', rewardAmount: 3000, label: '3000 Gold' };
    if (roll < 0.55) return { rewardType: 'gold', rewardAmount: 4000, label: '4000 Gold' };
    if (roll < 0.75) return { rewardType: 'diamonds', rewardAmount: 12, label: '12 Diamonds' };
    if (roll < 0.9) return { rewardType: 'diamonds', rewardAmount: 18, label: '18 Diamonds' };
    return { rewardType: 'forge_roll', rewardAmount: 1, label: '1 Free Enchant Roll' };
  }

  // Hard level clears (e.g. Murk Swamp ×2) — premium payouts for the time sink.
  if (levelClear) {
    if (roll < 0.25) return { rewardType: 'gold', rewardAmount: 15000, label: '15000 Gold' };
    if (roll < 0.45) return { rewardType: 'diamonds', rewardAmount: 80, label: '80 Diamonds' };
    if (roll < 0.65) return { rewardType: 'diamonds', rewardAmount: 100, label: '100 Diamonds' };
    if (roll < 0.8) return { rewardType: 'forge_roll', rewardAmount: 2, label: '2 Free Enchant Rolls' };
    if (roll < 0.92) return { rewardType: 'lucky_forge_roll', rewardAmount: 1, label: '1 Free Lucky Roll' };
    return { rewardType: 'lucky_forge_roll', rewardAmount: 2, label: '2 Free Lucky Rolls' };
  }

  // Hard (normal quests)
  if (roll < 0.25) return { rewardType: 'gold', rewardAmount: 6000, label: '6000 Gold' };
  if (roll < 0.4) return { rewardType: 'gold', rewardAmount: 8000, label: '8000 Gold' };
  if (roll < 0.6) return { rewardType: 'diamonds', rewardAmount: 25, label: '25 Diamonds' };
  if (roll < 0.75) return { rewardType: 'diamonds', rewardAmount: 35, label: '35 Diamonds' };
  if (roll < 0.9) return { rewardType: 'forge_roll', rewardAmount: 1, label: '1 Free Enchant Roll' };
  return { rewardType: 'lucky_forge_roll', rewardAmount: 1, label: '1 Free Lucky Roll' };
}

/** Upgrade underpaid hard level-clear quests already on the board. */
export function boostHardClearReward(quest) {
  if (!quest || quest.empty || quest.difficulty !== 'hard' || !isLevelClearType(quest.type)) {
    return quest;
  }
  const weakDiamond =
    quest.rewardType === 'diamonds' && (quest.rewardAmount || 0) < 80;
  const weakGold = quest.rewardType === 'gold' && (quest.rewardAmount || 0) < 15000;
  const weakForge =
    quest.rewardType === 'forge_roll' && (quest.rewardAmount || 0) < 2;
  const weakLucky =
    quest.rewardType === 'lucky_forge_roll' && (quest.rewardAmount || 0) < 1;
  if (!weakDiamond && !weakGold && !weakForge && !weakLucky) return quest;

  // Fixed strong payout for existing underpaid clears (don't re-roll randomly each load).
  return {
    ...quest,
    rewardType: 'diamonds',
    rewardAmount: 100,
    label: '100 Diamonds',
  };
}

function pickTemplate(usedTypes, difficulty, excludeType = null) {
  const blocked = new Set(usedTypes);
  if (excludeType) blocked.add(excludeType);

  const pool = TEMPLATES.filter((t) => {
    if (blocked.has(t.type)) return false;
    if (t.type === 'clear_level' && difficulty === 'easy') return false;
    if (t.type.startsWith('clear_') && t.type !== 'clear_level' && difficulty === 'easy') {
      return Math.random() < 0.4;
    }
    if (t.type === 'kill_bosses' && difficulty === 'easy') return Math.random() < 0.4;
    if (t.type === 'reach_wave' && difficulty === 'easy') return Math.random() < 0.5;
    return true;
  });

  const list = pool.length ? pool : TEMPLATES.filter((t) => !blocked.has(t.type));
  const fallback = list.length ? list : TEMPLATES.filter((t) => t.type !== excludeType);
  const finalPool = fallback.length ? fallback : TEMPLATES;
  return finalPool[Math.floor(Math.random() * finalPool.length)];
}

export function createEmptyQuestSlot(difficulty, id = null) {
  return {
    id: id || `empty_${difficulty}_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
    type: 'empty',
    title: 'Sold Out',
    description: 'Board restocks in a bit.',
    difficulty,
    target: 1,
    progress: 0,
    claimed: true,
    empty: true,
    rewardType: 'diamonds',
    rewardAmount: 0,
    label: '—',
  };
}

export function createQuest(difficulty, usedTypes = new Set(), excludeType = null) {
  const template = pickTemplate(usedTypes, difficulty, excludeType);
  usedTypes.add(template.type);
  const target = template.targets[difficulty] || 1;
  const reward = rewardFor(difficulty, template.type);
  return {
    id: `${difficulty}_${template.type}_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
    type: template.type,
    title: template.title,
    description: template.desc(target),
    difficulty,
    target,
    progress: 0,
    claimed: false,
    empty: false,
    ...reward,
  };
}

/** Build a fresh board: easy / medium / hard. */
export function generateQuestBoard() {
  const used = new Set();
  return [
    createQuest('easy', used),
    createQuest('medium', used),
    createQuest('hard', used),
  ];
}

export function normalizeQuestBoard(raw) {
  if (!Array.isArray(raw) || raw.length !== 3) return generateQuestBoard();
  return raw.map((q, i) => {
    const difficulty = q?.difficulty || ['easy', 'medium', 'hard'][i];
    if (q?.empty || q?.type === 'empty') {
      return createEmptyQuestSlot(difficulty, String(q?.id || `empty_${difficulty}_${i}`));
    }
    return boostHardClearReward({
      id: String(q?.id || `${difficulty}_${i}`),
      type: String(q?.type || 'kill_enemies'),
      title: String(q?.title || 'Quest'),
      description: String(q?.description || ''),
      difficulty,
      target: Math.max(1, Number(q?.target) || 1),
      progress: Math.max(0, Number(q?.progress) || 0),
      claimed: !!q?.claimed,
      empty: false,
      rewardType: q?.rewardType || 'diamonds',
      rewardAmount: Math.max(1, Number(q?.rewardAmount) || 1),
      label: String(q?.label || 'Reward'),
    });
  });
}

export function questIsComplete(quest) {
  return !!quest && !quest.claimed && !quest.empty && quest.progress >= quest.target;
}

export function formatRestockCountdown(restockAt, now = Date.now()) {
  const ms = Math.max(0, (restockAt || 0) - now);
  if (ms <= 0) return null;
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
