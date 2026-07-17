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
    shopOfferIds: [],
    shopOfferUntil: 0,
  };
}

function cloneMeta(meta) {
  return {
    coins: Math.max(0, Number(meta?.coins) || 0),
    diamonds: Math.max(0, Number(meta?.diamonds) || 0),
    unlocked: Array.isArray(meta?.unlocked) ? [...meta.unlocked] : [],
    shopOfferIds: Array.isArray(meta?.shopOfferIds) ? [...meta.shopOfferIds] : [],
    shopOfferUntil: Number(meta?.shopOfferUntil) || 0,
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

export { SHOP_ROTATION_MS };
