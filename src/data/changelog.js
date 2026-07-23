/** Patch notes shown in the Update Log. Newest first. */
export const CHANGELOG = [
  {
    id: 'quest-update',
    name: 'Quest Update',
    date: '2026-07-23',
    highlights: [
      'Quest Board (left side) — harder quests, more types, 6 replacements then 20-min restock',
      'Fullscreen Settings with Audio and Gameplay tabs',
      'Remappable keybinds (move, attack, shield, special) with reset',
      'Update Log scroll next to Settings (this popup)',
      'Ice Wizard nerf — less damage, longer cooldowns',
      'Frost Cubes lunge away after hitting you',
      'Sword, Axe, and Spear share a longer melee reach; Mace swings in front (Mirror Bite works)',
      'Bogged acid pools poison enemies and no longer hurt you',
    ],
  },
];

export function getLatestChangelog() {
  return CHANGELOG[0] || null;
}
