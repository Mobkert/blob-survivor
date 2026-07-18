/** Campaign levels — only Plains is playable for now. */

export const Levels = {
  plains: {
    id: 'plains',
    name: 'Plains',
    description: 'Open grasslands. Survive 21 waves of blobs.',
    maxWaves: 21,
    available: true,
    icon: 'level_icon_plains',
    accent: 0x66aa44,
  },
  volcanic: {
    id: 'volcanic',
    name: 'Volcanic Ridge',
    description: 'Ash plains and lava vents. Coming soon.',
    maxWaves: 21,
    available: false,
    icon: 'level_icon_locked',
    accent: 0x666666,
  },
  tundra: {
    id: 'tundra',
    name: 'Frozen Tundra',
    description: 'Icy winds and frostbitten foes. Coming soon.',
    maxWaves: 21,
    available: false,
    icon: 'level_icon_locked',
    accent: 0x666666,
  },
  swamp: {
    id: 'swamp',
    name: 'Murk Swamp',
    description: 'Toxic fog and lurking threats. Coming soon.',
    maxWaves: 21,
    available: false,
    icon: 'level_icon_locked',
    accent: 0x666666,
  },
  neon: {
    id: 'neon',
    name: 'Neon District',
    description: 'Electric streets after dark. Coming soon.',
    maxWaves: 21,
    available: false,
    icon: 'level_icon_locked',
    accent: 0x666666,
  },
  crystal: {
    id: 'crystal',
    name: 'Crystal Caves',
    description: 'Glowing caverns deep below. Coming soon.',
    maxWaves: 21,
    available: false,
    icon: 'level_icon_locked',
    accent: 0x666666,
  },
  sky: {
    id: 'sky',
    name: 'Sky Isles',
    description: 'Floating islands above the clouds. Coming soon.',
    maxWaves: 21,
    available: false,
    icon: 'level_icon_locked',
    accent: 0x666666,
  },
  nightfall: {
    id: 'nightfall',
    name: 'Nightfall Hollow',
    description: 'Eternal dusk and hungry shadows. Coming soon.',
    maxWaves: 21,
    available: false,
    icon: 'level_icon_locked',
    accent: 0x666666,
  },
};

export const LevelList = Object.values(Levels);

export function getLevel(id) {
  return Levels[id] ? { ...Levels[id] } : { ...Levels.plains };
}
