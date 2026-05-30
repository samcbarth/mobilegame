export type EnemyArchetype = {
  id: string;
  name: string;
  baseHP: number;
  baseATK: number;
  baseDEF: number;
  baseSPD: number; // attacks per second
  abilities: string[];
  spriteColor: number; // used as tint for placeholder graphics
  size: 'small' | 'medium' | 'large';
  soulsValue: number;
  xpValue: number;
};

export const ENEMY_TEMPLATES: Record<string, EnemyArchetype> = {
  skeleton: {
    id: 'skeleton', name: 'Skeleton',
    baseHP: 20, baseATK: 5, baseDEF: 2, baseSPD: 0.8,
    abilities: ['boneClaw'], spriteColor: 0xddddcc, size: 'medium',
    soulsValue: 3, xpValue: 10,
  },
  slime: {
    id: 'slime', name: 'Slime',
    baseHP: 30, baseATK: 3, baseDEF: 0, baseSPD: 0.5,
    abilities: ['acidSpit'], spriteColor: 0x66ff44, size: 'small',
    soulsValue: 2, xpValue: 8,
  },
  golem: {
    id: 'golem', name: 'Golem',
    baseHP: 60, baseATK: 8, baseDEF: 10, baseSPD: 0.4,
    abilities: ['stomp'], spriteColor: 0x998877, size: 'large',
    soulsValue: 6, xpValue: 20,
  },
  bat: {
    id: 'bat', name: 'Bat',
    baseHP: 12, baseATK: 4, baseDEF: 0, baseSPD: 1.5,
    abilities: [], spriteColor: 0x553366, size: 'small',
    soulsValue: 2, xpValue: 7,
  },
  zombie: {
    id: 'zombie', name: 'Zombie',
    baseHP: 40, baseATK: 6, baseDEF: 3, baseSPD: 0.4,
    abilities: ['rot'], spriteColor: 0x556644, size: 'medium',
    soulsValue: 4, xpValue: 12,
  },
  spider: {
    id: 'spider', name: 'Spider',
    baseHP: 15, baseATK: 7, baseDEF: 1, baseSPD: 1.2,
    abilities: ['poison'], spriteColor: 0x443322, size: 'small',
    soulsValue: 3, xpValue: 10,
  },
  mushroom: {
    id: 'mushroom', name: 'Mushroom',
    baseHP: 35, baseATK: 4, baseDEF: 4, baseSPD: 0.5,
    abilities: ['sporeCloud'], spriteColor: 0xaa6633, size: 'medium',
    soulsValue: 4, xpValue: 13,
  },
  treant: {
    id: 'treant', name: 'Treant',
    baseHP: 80, baseATK: 10, baseDEF: 8, baseSPD: 0.3,
    abilities: ['rootWrap'], spriteColor: 0x336622, size: 'large',
    soulsValue: 8, xpValue: 25,
  },
  elemental: {
    id: 'elemental', name: 'Elemental',
    baseHP: 25, baseATK: 9, baseDEF: 0, baseSPD: 0.9,
    abilities: ['fireBurst'], spriteColor: 0xff6600, size: 'medium',
    soulsValue: 5, xpValue: 15,
  },
  wraith: {
    id: 'wraith', name: 'Wraith',
    baseHP: 18, baseATK: 11, baseDEF: 0, baseSPD: 1.1,
    abilities: ['lifeSteal'], spriteColor: 0x9966cc, size: 'medium',
    soulsValue: 5, xpValue: 18,
  },
  ironCrab: {
    id: 'ironCrab', name: 'Iron Crab',
    baseHP: 70, baseATK: 6, baseDEF: 15, baseSPD: 0.3,
    abilities: ['pincer'], spriteColor: 0x886644, size: 'large',
    soulsValue: 7, xpValue: 22,
  },
  scorpion: {
    id: 'scorpion', name: 'Scorpion',
    baseHP: 22, baseATK: 8, baseDEF: 2, baseSPD: 1.0,
    abilities: ['venom'], spriteColor: 0xcc9944, size: 'small',
    soulsValue: 4, xpValue: 14,
  },
  fireImp: {
    id: 'fireImp', name: 'Fire Imp',
    baseHP: 16, baseATK: 12, baseDEF: 0, baseSPD: 1.3,
    abilities: ['fireBurst'], spriteColor: 0xff3300, size: 'small',
    soulsValue: 5, xpValue: 16,
  },
  lavaGolem: {
    id: 'lavaGolem', name: 'Lava Golem',
    baseHP: 90, baseATK: 14, baseDEF: 8, baseSPD: 0.35,
    abilities: ['moltenhurl', 'stomp'], spriteColor: 0xff4400, size: 'large',
    soulsValue: 10, xpValue: 30,
  },
  phantom: {
    id: 'phantom', name: 'Phantom',
    baseHP: 20, baseATK: 13, baseDEF: 0, baseSPD: 1.4,
    abilities: ['lifeSteal', 'poison'], spriteColor: 0x88aaff, size: 'medium',
    soulsValue: 6, xpValue: 20,
  },
};

export const ENEMY_MODIFIERS = ['armored', 'swift', 'vampiric', 'enraged', 'shielded', 'splitting'] as const;
export type EnemyModifier = typeof ENEMY_MODIFIERS[number];

export const MODIFIER_ADJECTIVES: Record<EnemyModifier, string> = {
  armored: 'Armored',
  swift: 'Swift',
  vampiric: 'Vampiric',
  enraged: 'Enraged',
  shielded: 'Shielded',
  splitting: 'Splitting',
};
