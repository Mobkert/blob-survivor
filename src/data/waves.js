import { Enemies, isBossWave } from './enemies.js';

const WIZARD_TYPES = ['wizard', 'darkWizard', 'healWizard', 'lightningWizard'];
const MAGMA_TYPES = ['magmaCube', 'magmaBrute', 'magmaSpitter'];
const ICE_CUBE_TYPES = ['iceCubeSmall', 'iceCubeBig', 'iceCubeMedium'];
const FROG_TYPES = ['frogTongue', 'frogDash', 'frogAcid'];
const SWAMP_MID_TYPES = ['swampSnake', 'mosquito', 'swampSpider'];

function randBetween(min, max) {
  return min + Math.random() * (max - min);
}

function fillWizards(count) {
  const composition = [];
  for (let i = 0; i < count; i++) {
    composition.push(WIZARD_TYPES[Math.floor(Math.random() * WIZARD_TYPES.length)]);
  }
  return composition;
}

function fillFrogs(count) {
  const composition = [];
  for (let i = 0; i < count; i++) {
    let type;
    if (i % 5 === 0) type = 'frogDash';
    else if (i % 3 === 0) type = 'frogAcid';
    else type = 'frogTongue';
    composition.push(type);
  }
  return composition;
}

function fillSwampMid(count) {
  const composition = [];
  for (let i = 0; i < count; i++) {
    composition.push(SWAMP_MID_TYPES[i % SWAMP_MID_TYPES.length]);
  }
  // Shuffle lightly so waves aren't rigidly ordered
  for (let i = composition.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [composition[i], composition[j]] = [composition[j], composition[i]];
  }
  return composition;
}

function getVolcanicComposition(wave) {
  if (isBossWave(wave)) {
    return ['kingMagmaCube'];
  }

  // Waves 1–10: wizards only.
  if (wave <= 10) {
    const count = Math.min(20, 5 + Math.floor(wave * 1.15));
    return fillWizards(count);
  }

  // Wave 11+: wizards + mini magma cubes (melee burn + ranged).
  const era = wave - 10;
  const wizardCount = Math.min(14, 5 + Math.floor(era * 0.9));
  const magmaCount = Math.min(12, 3 + Math.floor(era * 1.2));
  const composition = fillWizards(wizardCount);

  // Keep a mix: mostly melee cubes, with spitters mixed in.
  for (let i = 0; i < magmaCount; i++) {
    let type;
    if (i % 3 === 2) type = 'magmaSpitter';
    else if (i % 3 === 1) type = 'magmaBrute';
    else type = 'magmaCube';
    composition.push(type);
  }

  return composition.length > 0 ? composition : ['magmaCube', 'magmaCube', 'magmaSpitter'];
}

function fillIceCubes(count) {
  const composition = [];
  for (let i = 0; i < count; i++) {
    // Mix: small / medium / big cycling with a bias toward small+medium.
    let type;
    if (i % 5 === 0) type = 'iceCubeBig';
    else if (i % 3 === 0) type = 'iceCubeMedium';
    else type = 'iceCubeSmall';
    composition.push(type);
  }
  return composition;
}

function getTundraComposition(wave) {
  if (isBossWave(wave)) {
    return ['yeti'];
  }

  // Waves 1–10: ice cubes only.
  if (wave <= 10) {
    const count = Math.min(20, 5 + Math.floor(wave * 1.15));
    return fillIceCubes(count);
  }

  // Wave 11+: ice wizards — no more ice cubes.
  const era = wave - 10;
  const wizardCount = Math.min(18, 5 + Math.floor(era * 1.15));
  const composition = [];
  for (let i = 0; i < wizardCount; i++) composition.push('iceWizard');
  return composition.length > 0 ? composition : ['iceWizard'];
}

function getSwampComposition(wave) {
  if (isBossWave(wave)) {
    return ['kingFrog'];
  }

  // Waves 1–10: frogs only.
  if (wave <= 10) {
    const count = Math.min(20, 5 + Math.floor(wave * 1.15));
    return fillFrogs(count);
  }

  // Wave 11+: snakes, mosquitoes, spiders — no more frogs.
  const era = wave - 10;
  const count = Math.min(18, 5 + Math.floor(era * 1.15));
  return fillSwampMid(count);
}

function getPlainsComposition(wave) {
  if (isBossWave(wave)) {
    return ['goblinKing'];
  }

  // Wave 10+ resets spawn rate and switches to the wizard theme.
  if (wave >= 10) {
    const era = wave - 9; // wave 10 => 1
    const count = Math.min(24, 7 + Math.floor((era - 1) * 1.5));
    return fillWizards(count);
  }

  const baseCount = Math.floor(3 + wave * 1.2);
  const scaled = Math.floor(baseCount * Math.pow(1.12, wave - 1));

  const composition = [];

  if (wave >= 1) {
    const zombies = Math.max(2, Math.floor(scaled * 0.6));
    for (let i = 0; i < zombies; i++) composition.push('zombie');
  }

  if (wave >= 2) {
    const runners = Math.max(1, Math.floor(scaled * 0.25));
    for (let i = 0; i < runners; i++) composition.push('runner');
  }

  if (wave >= 3) {
    const brutes = Math.max(1, Math.floor(scaled * 0.15));
    for (let i = 0; i < brutes; i++) composition.push('brute');
  }

  return composition.length > 0 ? composition : ['zombie', 'zombie'];
}

export function getWaveComposition(wave, levelId = 'plains') {
  if (levelId === 'volcanic') {
    return getVolcanicComposition(wave);
  }
  if (levelId === 'tundra') {
    return getTundraComposition(wave);
  }
  if (levelId === 'swamp') {
    return getSwampComposition(wave);
  }
  return getPlainsComposition(wave);
}

export function getSpawnPositions(count, arenaSize, margin = 120) {
  const positions = [];
  const half = arenaSize / 2;

  for (let i = 0; i < count; i++) {
    const edge = i % 4;
    let x;
    let y;

    switch (edge) {
      case 0:
        x = randBetween(-half + margin, half - margin);
        y = -half + margin;
        break;
      case 1:
        x = half - margin;
        y = randBetween(-half + margin, half - margin);
        break;
      case 2:
        x = randBetween(-half + margin, half - margin);
        y = half - margin;
        break;
      default:
        x = -half + margin;
        y = randBetween(-half + margin, half - margin);
        break;
    }

    positions.push({ x, y });
  }

  return positions;
}

export { Enemies, WIZARD_TYPES, MAGMA_TYPES, ICE_CUBE_TYPES, FROG_TYPES, SWAMP_MID_TYPES };
