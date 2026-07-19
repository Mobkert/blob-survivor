/** Campaign levels — Plains always open; Volcanic Ridge unlocks after Plains clear (per save). */

export const Levels = {
  plains: {
    id: 'plains',
    name: 'Plains',
    description: 'Open grasslands. Survive 21 waves of blobs.',
    maxWaves: 21,
    alwaysAvailable: true,
    icon: 'level_icon_plains',
    accent: 0x66aa44,
    clearGold: 1200,
    clearDiamonds: 0,
    tilePrefix: 'tile_',
    bgColor: 0x1a2a14,
  },
  volcanic: {
    id: 'volcanic',
    name: 'Volcanic Ridge',
    description: 'Ash plains and lava vents. Wizards, magma cubes, and the King Magma Cube.',
    maxWaves: 21,
    unlockAfter: 'plains',
    icon: 'level_icon_volcanic',
    accent: 0xcc4422,
    clearGold: 2450,
    clearDiamonds: 15,
    tilePrefix: 'vtile_',
    bgColor: 0x1a0808,
  },
  tundra: {
    id: 'tundra',
    name: 'Frozen Tundra',
    description: 'Frozen wastes ringed by ice spikes. Clear it to unlock special weapons.',
    maxWaves: 21,
    unlockAfter: 'volcanic',
    icon: 'level_icon_tundra',
    accent: 0x66bbdd,
    clearGold: 3200,
    clearDiamonds: 20,
    tilePrefix: 'ttile_',
    bgColor: 0x0a1828,
  },
  swamp: {
    id: 'swamp',
    name: 'Murk Swamp',
    description: 'Murky ponds and toxic fauna. Frogs, snakes, and the King Frog.',
    maxWaves: 21,
    unlockAfter: 'tundra',
    icon: 'level_icon_swamp',
    accent: 0x66aa55,
    clearGold: 4000,
    clearDiamonds: 25,
    tilePrefix: 'stile_',
    bgColor: 0x0c1810,
  },
  neon: {
    id: 'neon',
    name: 'Neon District',
    description: 'Electric streets after dark. Coming soon.',
    maxWaves: 21,
    comingSoon: true,
    icon: 'level_icon_locked',
    accent: 0x666666,
    clearGold: 0,
    clearDiamonds: 0,
    tilePrefix: 'tile_',
    bgColor: 0x101018,
  },
  crystal: {
    id: 'crystal',
    name: 'Crystal Caves',
    description: 'Glowing caverns deep below. Coming soon.',
    maxWaves: 21,
    comingSoon: true,
    icon: 'level_icon_locked',
    accent: 0x666666,
    clearGold: 0,
    clearDiamonds: 0,
    tilePrefix: 'tile_',
    bgColor: 0x141028,
  },
  sky: {
    id: 'sky',
    name: 'Sky Isles',
    description: 'Floating islands above the clouds. Coming soon.',
    maxWaves: 21,
    comingSoon: true,
    icon: 'level_icon_locked',
    accent: 0x666666,
    clearGold: 0,
    clearDiamonds: 0,
    tilePrefix: 'tile_',
    bgColor: 0x203040,
  },
  nightfall: {
    id: 'nightfall',
    name: 'Nightfall Hollow',
    description: 'Eternal dusk and hungry shadows. Coming soon.',
    maxWaves: 21,
    comingSoon: true,
    icon: 'level_icon_locked',
    accent: 0x666666,
    clearGold: 0,
    clearDiamonds: 0,
    tilePrefix: 'tile_',
    bgColor: 0x0c0c14,
  },
};

export const LevelList = Object.values(Levels);

export function getLevel(id) {
  return Levels[id] ? { ...Levels[id] } : { ...Levels.plains };
}

/** Whether this save can start the level. */
export function isLevelUnlocked(level, completedLevels = []) {
  if (!level) return false;
  if (level.comingSoon) return false;
  if (level.alwaysAvailable) return true;
  if (level.unlockAfter) {
    return completedLevels.includes(level.unlockAfter);
  }
  return false;
}

export function getLevelLockLabel(level, completedLevels = []) {
  if (!level) return 'Locked';
  if (level.comingSoon) return 'COMING SOON';
  if (isLevelUnlocked(level, completedLevels)) return 'AVAILABLE';
  if (level.unlockAfter === 'plains') return 'CLEAR PLAINS';
  if (level.unlockAfter === 'volcanic') return 'CLEAR VOLCANIC RIDGE';
  if (level.unlockAfter === 'tundra') return 'CLEAR FROZEN TUNDRA';
  return 'LOCKED';
}
