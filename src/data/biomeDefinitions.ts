export type BiomeDef = {
  id: string;
  name: string;
  floorStart: number; // within the 5-floor cycle
  bgColor: number;
  wallColor: number;
  floorColor: number;
  enemyIds: string[];
  statMultiplier: number; // applied on top of floor scaling when biome repeats
  adjectives: string[]; // for procedural enemy name generation
};

export const BIOMES: BiomeDef[] = [
  {
    id: 'crypt',
    name: 'Crypt',
    floorStart: 0,
    bgColor: 0x0a0a12,
    wallColor: 0x333355,
    floorColor: 0x1a1a2a,
    enemyIds: ['skeleton', 'zombie', 'bat', 'wraith', 'golem'],
    statMultiplier: 1.0,
    adjectives: ['Cursed', 'Ancient', 'Hollow', 'Rotting', 'Forsaken', 'Undying'],
  },
  {
    id: 'fungalForest',
    name: 'Fungal Forest',
    floorStart: 1,
    bgColor: 0x061208,
    wallColor: 0x224422,
    floorColor: 0x0d1a0d,
    enemyIds: ['slime', 'spider', 'mushroom', 'treant', 'bat'],
    statMultiplier: 1.0,
    adjectives: ['Sporous', 'Festering', 'Bloated', 'Mycotic', 'Venomous', 'Entangling'],
  },
  {
    id: 'volcanicDepths',
    name: 'Volcanic Depths',
    floorStart: 2,
    bgColor: 0x120600,
    wallColor: 0x552200,
    floorColor: 0x1a0d00,
    enemyIds: ['fireImp', 'elemental', 'lavaGolem', 'ironCrab', 'scorpion'],
    statMultiplier: 1.0,
    adjectives: ['Scorched', 'Infernal', 'Molten', 'Blazing', 'Ashen', 'Smoldering'],
  },
];

export function getBiome(floor: number): BiomeDef {
  // Cycle through biomes every 5 floors; each full cycle gets a stat multiplier boost
  const biomeIndex = Math.floor((floor - 1) / 5) % BIOMES.length;
  const cycle = Math.floor((floor - 1) / (5 * BIOMES.length));
  const biome = BIOMES[biomeIndex];
  return { ...biome, statMultiplier: 1 + cycle * 0.25 };
}
