import {
  createQuest,
  createEmptyQuestSlot,
  generateQuestBoard,
  normalizeQuestBoard,
  QUEST_REPLACEMENTS_MAX,
  QUEST_RESTOCK_MS,
} from './quests.js';

const LEGACY_STORAGE_KEY = 'blob_survivor_meta_v1';
const SAVES_STORAGE_KEY = 'blob_survivor_saves_v1';
const SHOP_ROTATION_MS = 5 * 60 * 1000;
export const SAVE_SLOT_COUNT = 5;

export const GOLD_PER_DIAMOND_PACK = 2000;
export const DIAMONDS_PER_PACK = 25;

export function defaultMeta() {
  return {
    coins: 0,
    diamonds: 0,
    unlocked: [],
    unlockedWeapons: [],
    /** @type {Record<string, { enchantId: string, rarityId: string }>} */
    weaponEnchants: {},
    completedLevels: [],
    shopOfferIds: [],
    shopOfferUntil: 0,
    freeForgeRolls: 0,
    freeLuckyForgeRolls: 0,
    questBoard: generateQuestBoard(),
    questReplacementsLeft: QUEST_REPLACEMENTS_MAX,
    // 0 = start the 20-minute clock on first ensureQuestRestock()
    questRestockAt: 0,
  };
}

function cloneWeaponEnchants(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  for (const [weaponId, entry] of Object.entries(raw)) {
    if (!entry || typeof entry !== 'object' || !entry.enchantId) continue;
    out[weaponId] = {
      enchantId: String(entry.enchantId),
      rarityId: String(entry.rarityId || ''),
    };
  }
  return out;
}

function cloneMeta(meta) {
  return {
    coins: Math.max(0, Number(meta?.coins) || 0),
    diamonds: Math.max(0, Number(meta?.diamonds) || 0),
    unlocked: Array.isArray(meta?.unlocked) ? [...meta.unlocked] : [],
    unlockedWeapons: Array.isArray(meta?.unlockedWeapons) ? [...meta.unlockedWeapons] : [],
    weaponEnchants: cloneWeaponEnchants(meta?.weaponEnchants),
    completedLevels: Array.isArray(meta?.completedLevels) ? [...meta.completedLevels] : [],
    shopOfferIds: Array.isArray(meta?.shopOfferIds) ? [...meta.shopOfferIds] : [],
    shopOfferUntil: Number(meta?.shopOfferUntil) || 0,
    freeForgeRolls: Math.max(0, Number(meta?.freeForgeRolls) || 0),
    freeLuckyForgeRolls: Math.max(0, Number(meta?.freeLuckyForgeRolls) || 0),
    questBoard: normalizeQuestBoard(meta?.questBoard),
    questReplacementsLeft:
      meta?.questReplacementsLeft === undefined || meta?.questReplacementsLeft === null
        ? QUEST_REPLACEMENTS_MAX
        : Math.max(0, Math.min(QUEST_REPLACEMENTS_MAX, Number(meta.questReplacementsLeft) || 0)),
    questRestockAt: Math.max(0, Number(meta?.questRestockAt) || 0),
  };
}

function normalizeSlot(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    ...cloneMeta(raw),
    updatedAt: Number(raw.updatedAt) || Date.now(),
  };
}

function emptyBank() {
  return {
    version: 1,
    activeSlot: 0,
    slots: Array.from({ length: SAVE_SLOT_COUNT }, () => null),
  };
}

function migrateLegacyMeta() {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      ...cloneMeta(parsed),
      updatedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

export function loadSaveBank() {
  try {
    const raw = localStorage.getItem(SAVES_STORAGE_KEY);
    if (!raw) {
      const bank = emptyBank();
      const legacy = migrateLegacyMeta();
      if (legacy) {
        bank.slots[0] = legacy;
        bank.activeSlot = 0;
        saveSaveBank(bank);
        try {
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        } catch {
          // ignore
        }
      } else {
        bank.slots[0] = { ...defaultMeta(), updatedAt: Date.now() };
        saveSaveBank(bank);
      }
      return bank;
    }

    const parsed = JSON.parse(raw);
    const bank = emptyBank();
    bank.activeSlot = Math.max(0, Math.min(SAVE_SLOT_COUNT - 1, Number(parsed.activeSlot) || 0));

    const slots = Array.isArray(parsed.slots) ? parsed.slots : [];
    for (let i = 0; i < SAVE_SLOT_COUNT; i += 1) {
      bank.slots[i] = normalizeSlot(slots[i]);
    }

    if (!bank.slots[bank.activeSlot]) {
      bank.slots[bank.activeSlot] = { ...defaultMeta(), updatedAt: Date.now() };
      saveSaveBank(bank);
    }

    return bank;
  } catch {
    const bank = emptyBank();
    bank.slots[0] = { ...defaultMeta(), updatedAt: Date.now() };
    return bank;
  }
}

export function saveSaveBank(bank) {
  localStorage.setItem(SAVES_STORAGE_KEY, JSON.stringify(bank));
}

export function getActiveSlotIndex() {
  return loadSaveBank().activeSlot;
}

export function loadMeta() {
  const bank = loadSaveBank();
  const slot = bank.slots[bank.activeSlot];
  if (!slot) {
    const fresh = { ...defaultMeta(), updatedAt: Date.now() };
    bank.slots[bank.activeSlot] = fresh;
    saveSaveBank(bank);
    return cloneMeta(fresh);
  }
  return cloneMeta(slot);
}

export function saveMeta(meta) {
  const bank = loadSaveBank();
  bank.slots[bank.activeSlot] = {
    ...cloneMeta(meta),
    updatedAt: Date.now(),
  };
  saveSaveBank(bank);
}

/** Snapshot of all slots for the Saves UI. */
export function listSaveSlots() {
  const bank = loadSaveBank();
  return bank.slots.map((slot, index) => {
    if (!slot) {
      return {
        index,
        empty: true,
        active: index === bank.activeSlot,
        coins: 0,
        diamonds: 0,
        cards: 0,
        updatedAt: 0,
      };
    }
    return {
      index,
      empty: false,
      active: index === bank.activeSlot,
      coins: slot.coins || 0,
      diamonds: slot.diamonds || 0,
      cards: Array.isArray(slot.unlocked) ? slot.unlocked.length : 0,
      updatedAt: slot.updatedAt || 0,
    };
  });
}

/** Switch to a slot. Empty slots become a fresh start. */
export function switchToSlot(index) {
  const i = Math.max(0, Math.min(SAVE_SLOT_COUNT - 1, Number(index) || 0));
  const bank = loadSaveBank();
  if (!bank.slots[i]) {
    bank.slots[i] = { ...defaultMeta(), updatedAt: Date.now() };
  }
  bank.activeSlot = i;
  saveSaveBank(bank);
  return cloneMeta(bank.slots[i]);
}

/** Copy the current active progress into another slot (does not switch). */
export function saveActiveToSlot(index) {
  const i = Math.max(0, Math.min(SAVE_SLOT_COUNT - 1, Number(index) || 0));
  const bank = loadSaveBank();
  const current = bank.slots[bank.activeSlot] || { ...defaultMeta(), updatedAt: Date.now() };
  bank.slots[i] = {
    ...cloneMeta(current),
    updatedAt: Date.now(),
  };
  saveSaveBank(bank);
  return listSaveSlots();
}

/** Wipe a slot. If it was active, it becomes a fresh start. */
export function clearSaveSlot(index) {
  const i = Math.max(0, Math.min(SAVE_SLOT_COUNT - 1, Number(index) || 0));
  const bank = loadSaveBank();
  if (i === bank.activeSlot) {
    bank.slots[i] = { ...defaultMeta(), updatedAt: Date.now() };
  } else {
    bank.slots[i] = null;
  }
  saveSaveBank(bank);
  return listSaveSlots();
}

/** Raw meta for one slot (null if empty). */
export function getSlotMeta(index) {
  const i = Math.max(0, Math.min(SAVE_SLOT_COUNT - 1, Number(index) || 0));
  const bank = loadSaveBank();
  return bank.slots[i] ? cloneMeta(bank.slots[i]) : null;
}

/** First empty slot index, or -1. */
export function findEmptySlotIndex() {
  const bank = loadSaveBank();
  for (let i = 0; i < SAVE_SLOT_COUNT; i += 1) {
    if (!bank.slots[i]) return i;
  }
  // Treat "fresh" active-looking empty progress as empty for restore targets.
  for (let i = 0; i < SAVE_SLOT_COUNT; i += 1) {
    const s = bank.slots[i];
    if (
      s &&
      (s.coins || 0) === 0 &&
      (s.diamonds || 0) === 0 &&
      (!s.unlocked || s.unlocked.length === 0) &&
      (!s.unlockedWeapons || s.unlockedWeapons.length === 0) &&
      (!s.weaponEnchants || Object.keys(s.weaponEnchants).length === 0) &&
      (!s.completedLevels || s.completedLevels.length === 0)
    ) {
      return i;
    }
  }
  return -1;
}

/** Write cloud/imported meta into a slot (does not switch active). */
export function writeMetaToSlot(index, meta) {
  const i = Math.max(0, Math.min(SAVE_SLOT_COUNT - 1, Number(index) || 0));
  const bank = loadSaveBank();
  bank.slots[i] = {
    ...cloneMeta(meta),
    updatedAt: Date.now(),
  };
  saveSaveBank(bank);
  return listSaveSlots();
}

export function addCoins(amount) {
  const meta = loadMeta();
  meta.coins += Math.max(0, Math.floor(amount));
  saveMeta(meta);
  return meta.coins;
}

export function spendCoins(amount) {
  const meta = loadMeta();
  if (meta.coins < amount) return false;
  meta.coins -= amount;
  saveMeta(meta);
  return true;
}

export function addDiamonds(amount) {
  const meta = loadMeta();
  meta.diamonds += Math.max(0, Math.floor(amount));
  saveMeta(meta);
  return meta.diamonds;
}

export function spendDiamonds(amount) {
  const meta = loadMeta();
  if (meta.diamonds < amount) return false;
  meta.diamonds -= amount;
  saveMeta(meta);
  return true;
}

/** Exchange 2000 gold for 25 diamonds. Returns false if not enough gold. */
export function exchangeGoldForDiamonds() {
  const meta = loadMeta();
  if (meta.coins < GOLD_PER_DIAMOND_PACK) return false;
  meta.coins -= GOLD_PER_DIAMOND_PACK;
  meta.diamonds += DIAMONDS_PER_PACK;
  saveMeta(meta);
  return true;
}

export function unlockShopItem(id) {
  const meta = loadMeta();
  if (!meta.unlocked.includes(id)) {
    meta.unlocked.push(id);
    saveMeta(meta);
  }
  return meta;
}

export function isUnlocked(id) {
  return loadMeta().unlocked.includes(id);
}

export function markLevelComplete(levelId) {
  if (!levelId) return loadMeta();
  const meta = loadMeta();
  if (!meta.completedLevels.includes(levelId)) {
    meta.completedLevels.push(levelId);
    saveMeta(meta);
  }
  return meta;
}

export function isLevelCompleted(levelId) {
  return loadMeta().completedLevels.includes(levelId);
}

export function unlockWeapon(weaponId) {
  if (!weaponId) return loadMeta();
  const meta = loadMeta();
  if (!meta.unlockedWeapons.includes(weaponId)) {
    meta.unlockedWeapons.push(weaponId);
    saveMeta(meta);
  }
  return meta;
}

export function isWeaponUnlocked(weaponId) {
  return loadMeta().unlockedWeapons.includes(weaponId);
}

export function getUnlockedWeapons() {
  return [...(loadMeta().unlockedWeapons || [])];
}

/** @returns {{ enchantId: string, rarityId: string } | null} */
export function getWeaponEnchant(weaponId) {
  if (!weaponId) return null;
  const entry = loadMeta().weaponEnchants?.[weaponId];
  return entry?.enchantId ? { ...entry } : null;
}

/** Save (or overwrite) the enchant on a weapon permanently. */
export function setWeaponEnchant(weaponId, enchantId, rarityId) {
  if (!weaponId || !enchantId) return loadMeta();
  const meta = loadMeta();
  if (!meta.weaponEnchants) meta.weaponEnchants = {};
  meta.weaponEnchants[weaponId] = {
    enchantId,
    rarityId: rarityId || '',
  };
  saveMeta(meta);
  return meta;
}

export function getQuestBoard() {
  ensureQuestRestock();
  return normalizeQuestBoard(loadMeta().questBoard);
}

export function getQuestStockInfo() {
  const meta = ensureQuestRestock();
  return {
    replacementsLeft: meta.questReplacementsLeft ?? QUEST_REPLACEMENTS_MAX,
    restockAt: meta.questRestockAt || 0,
    maxReplacements: QUEST_REPLACEMENTS_MAX,
  };
}

/** Always keep a 20-minute restock timer. When it elapses, refresh the board
 *  even if no quests were claimed. */
export function ensureQuestRestock() {
  const meta = loadMeta();
  const now = Date.now();
  let changed = false;

  if (meta.questReplacementsLeft === undefined || meta.questReplacementsLeft === null) {
    meta.questReplacementsLeft = QUEST_REPLACEMENTS_MAX;
    changed = true;
  }

  let restockAt = meta.questRestockAt || 0;

  // Start the clock on first visit / after migration.
  if (restockAt <= 0) {
    meta.questRestockAt = now + QUEST_RESTOCK_MS;
    changed = true;
    if (changed) saveMeta(meta);
    return meta;
  }

  // Timer elapsed → full restock and schedule the next cycle.
  if (now >= restockAt) {
    meta.questBoard = generateQuestBoard();
    meta.questReplacementsLeft = QUEST_REPLACEMENTS_MAX;
    meta.questRestockAt = now + QUEST_RESTOCK_MS;
    saveMeta(meta);
    return meta;
  }

  if (changed) saveMeta(meta);
  return meta;
}

/** Advance matching unclaimed quests by `amount`. */
export function progressQuests(type, amount = 1) {
  const add = Math.max(0, Math.floor(amount));
  if (!type || add <= 0) return loadMeta();
  ensureQuestRestock();
  const meta = loadMeta();
  let changed = false;
  meta.questBoard = normalizeQuestBoard(meta.questBoard).map((q) => {
    if (q.claimed || q.empty || q.type !== type) return q;
    const next = Math.min(q.target, q.progress + add);
    if (next !== q.progress) changed = true;
    return { ...q, progress: next };
  });
  if (changed) saveMeta(meta);
  return meta;
}

/** Set progress to at least `value` for matching quests (e.g. reach wave). */
export function progressQuestsAtLeast(type, value) {
  const v = Math.max(0, Math.floor(value));
  if (!type || v <= 0) return loadMeta();
  ensureQuestRestock();
  const meta = loadMeta();
  let changed = false;
  meta.questBoard = normalizeQuestBoard(meta.questBoard).map((q) => {
    if (q.claimed || q.empty || q.type !== type) return q;
    const next = Math.min(q.target, Math.max(q.progress, v));
    if (next !== q.progress) changed = true;
    return { ...q, progress: next };
  });
  if (changed) saveMeta(meta);
  return meta;
}

/** Claim a completed quest reward. Returns reward info or null. */
export function claimQuest(questId) {
  ensureQuestRestock();
  const meta = loadMeta();
  const board = normalizeQuestBoard(meta.questBoard);
  const idx = board.findIndex((q) => q.id === questId);
  if (idx < 0) return null;
  const quest = board[idx];
  if (quest.claimed || quest.empty || quest.progress < quest.target) return null;

  if (quest.rewardType === 'gold' || quest.rewardType === 'coins') {
    meta.coins += quest.rewardAmount;
  } else if (quest.rewardType === 'diamonds') {
    meta.diamonds += quest.rewardAmount;
  } else if (quest.rewardType === 'forge_roll') {
    meta.freeForgeRolls = (meta.freeForgeRolls || 0) + quest.rewardAmount;
  } else if (quest.rewardType === 'lucky_forge_roll') {
    meta.freeLuckyForgeRolls = (meta.freeLuckyForgeRolls || 0) + quest.rewardAmount;
  }

  let replacementsLeft = meta.questReplacementsLeft ?? QUEST_REPLACEMENTS_MAX;
  if (replacementsLeft > 0) {
    replacementsLeft -= 1;
    meta.questReplacementsLeft = replacementsLeft;
    const used = new Set(
      board.filter((_, i) => i !== idx && !board[i].empty).map((q) => q.type),
    );
    // Always a different quest type than the one just claimed.
    board[idx] = createQuest(quest.difficulty, used, quest.type);
  } else {
    board[idx] = createEmptyQuestSlot(quest.difficulty);
  }

  // Keep the existing 20-minute restock clock (auto-refreshes even with no claims).
  if (!meta.questRestockAt) {
    meta.questRestockAt = Date.now() + QUEST_RESTOCK_MS;
  }

  meta.questBoard = board;
  saveMeta(meta);
  return {
    quest,
    rewardType: quest.rewardType,
    rewardAmount: quest.rewardAmount,
    label: quest.label,
    replacementsLeft: meta.questReplacementsLeft,
    restockAt: meta.questRestockAt || 0,
  };
}

export function addFreeForgeRolls(amount, lucky = false) {
  const meta = loadMeta();
  const n = Math.max(0, Math.floor(amount));
  if (lucky) meta.freeLuckyForgeRolls = (meta.freeLuckyForgeRolls || 0) + n;
  else meta.freeForgeRolls = (meta.freeForgeRolls || 0) + n;
  saveMeta(meta);
  return meta;
}

/** Spend one free forge roll. Returns false if none left. */
export function spendFreeForgeRoll(lucky = false) {
  const meta = loadMeta();
  if (lucky) {
    if ((meta.freeLuckyForgeRolls || 0) < 1) return false;
    meta.freeLuckyForgeRolls -= 1;
  } else {
    if ((meta.freeForgeRolls || 0) < 1) return false;
    meta.freeForgeRolls -= 1;
  }
  saveMeta(meta);
  return true;
}

export { SHOP_ROTATION_MS };
