import { Enemies, isBossWave } from './enemies.js';

const WIZARD_TYPES = ['wizard', 'darkWizard', 'healWizard', 'lightningWizard'];

function randBetween(min, max) {
  return min + Math.random() * (max - min);
}

export function getWaveComposition(wave) {
  if (isBossWave(wave)) {
    return ['goblinKing'];
  }

  // Wave 10+ resets spawn rate and switches to the wizard theme.
  if (wave >= 10) {
    const era = wave - 9; // wave 10 => 1
    // Start denser and ramp faster so post-10 waves don't crawl.
    const count = Math.min(24, 7 + Math.floor((era - 1) * 1.5));
    const composition = [];
    for (let i = 0; i < count; i++) {
      composition.push(WIZARD_TYPES[Math.floor(Math.random() * WIZARD_TYPES.length)]);
    }
    return composition;
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

export { Enemies, WIZARD_TYPES };
