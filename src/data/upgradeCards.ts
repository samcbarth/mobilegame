export type Rarity = 'common' | 'uncommon' | 'rare';

export type UpgradeCard = {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  unique?: boolean; // only one copy allowed
  apply: (stats: MutableStats) => void;
};

export type MutableStats = {
  maxHP: number;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  critChance: number;
  critMult: number;
  maxMana: number;
  manaRegen: number;
  lifeStealPct: number;
  skillSlots: number;
  equippedSkills: string[];
};

export const UPGRADE_CARDS: UpgradeCard[] = [
  // ── Common ──
  { id: 'hp15', name: '+20 Max HP', description: 'Increase max HP by 20 and heal 20.',
    rarity: 'common',
    apply: (s) => { s.maxHP += 20; s.hp = Math.min(s.hp + 20, s.maxHP); } },
  { id: 'hp10heal', name: 'Vitality', description: 'Gain +15 max HP and fully restore HP.',
    rarity: 'common',
    apply: (s) => { s.maxHP += 15; s.hp = s.maxHP; } },
  { id: 'atk3', name: '+3 Attack', description: 'Permanently increase attack by 3.',
    rarity: 'common',
    apply: (s) => { s.atk += 3; } },
  { id: 'atk5', name: '+5 Attack', description: 'Permanently increase attack by 5.',
    rarity: 'common',
    apply: (s) => { s.atk += 5; } },
  { id: 'def3', name: '+3 Defense', description: 'Permanently increase defense by 3.',
    rarity: 'common',
    apply: (s) => { s.def += 3; } },
  { id: 'def5', name: '+5 Defense', description: 'Permanently increase defense by 5.',
    rarity: 'common',
    apply: (s) => { s.def += 5; } },
  { id: 'mana20', name: '+20 Max Mana', description: 'Increase max mana by 20.',
    rarity: 'common',
    apply: (s) => { s.maxMana += 20; } },
  { id: 'manaRegen1', name: 'Meditation', description: 'Mana regenerates 1 faster per second.',
    rarity: 'common',
    apply: (s) => { s.manaRegen += 1; } },
  { id: 'crit5pct', name: 'Sharp Eye', description: '+5% critical hit chance.',
    rarity: 'common',
    apply: (s) => { s.critChance = Math.min(s.critChance + 0.05, 0.80); } },
  { id: 'healFull', name: 'Second Wind', description: 'Fully restore HP right now.',
    rarity: 'common',
    apply: (s) => { s.hp = s.maxHP; } },
  { id: 'spdUp', name: 'Haste', description: 'Attack 10% faster permanently.',
    rarity: 'common',
    apply: (s) => { s.spd = Math.round(s.spd * 1.1 * 100) / 100; } },

  // ── Uncommon ──
  { id: 'vampiricStrike', name: 'Vampiric Strike', description: 'Auto-attacks steal 15% of damage dealt as HP.',
    rarity: 'uncommon', unique: true,
    apply: (s) => { s.lifeStealPct += 0.15; } },
  { id: 'atk10def5', name: 'Battle Hardened', description: '+10 ATK and +5 DEF.',
    rarity: 'uncommon',
    apply: (s) => { s.atk += 10; s.def += 5; } },
  { id: 'critMult', name: 'Lethal Precision', description: 'Critical hits deal 0.5× more damage.',
    rarity: 'uncommon',
    apply: (s) => { s.critMult += 0.5; } },
  { id: 'hp30atk5', name: 'Warrior\'s Resolve', description: '+30 HP and +5 ATK.',
    rarity: 'uncommon',
    apply: (s) => { s.maxHP += 30; s.hp = Math.min(s.hp + 30, s.maxHP); s.atk += 5; } },
  { id: 'doubleRegen', name: 'Wellspring', description: 'Double your mana regeneration.',
    rarity: 'uncommon', unique: true,
    apply: (s) => { s.manaRegen *= 2; } },
  { id: 'addSlash', name: 'Learn: Slash', description: 'Add Slash to your skill bar.',
    rarity: 'uncommon', unique: true,
    apply: (s) => { if (!s.equippedSkills.includes('slash') && s.equippedSkills.length < s.skillSlots) s.equippedSkills.push('slash'); } },
  { id: 'addFireball', name: 'Learn: Fireball', description: 'Add Fireball to your skill bar.',
    rarity: 'uncommon', unique: true,
    apply: (s) => { if (!s.equippedSkills.includes('fireball') && s.equippedSkills.length < s.skillSlots) s.equippedSkills.push('fireball'); } },
  { id: 'addHeal', name: 'Learn: Heal', description: 'Add Heal to your skill bar.',
    rarity: 'uncommon', unique: true,
    apply: (s) => { if (!s.equippedSkills.includes('heal') && s.equippedSkills.length < s.skillSlots) s.equippedSkills.push('heal'); } },
  { id: 'addPoison', name: 'Learn: Poison Dart', description: 'Add Poison Dart to your skill bar.',
    rarity: 'uncommon', unique: true,
    apply: (s) => { if (!s.equippedSkills.includes('poisonDart') && s.equippedSkills.length < s.skillSlots) s.equippedSkills.push('poisonDart'); } },
  { id: 'spdDef', name: 'Flowing Defense', description: '+20% attack speed and +8 DEF.',
    rarity: 'uncommon',
    apply: (s) => { s.spd = Math.round(s.spd * 1.2 * 100) / 100; s.def += 8; } },

  // ── Rare ──
  { id: 'extraSlot', name: 'Skill Mastery', description: 'Unlock an additional skill slot.',
    rarity: 'rare', unique: true,
    apply: (s) => { s.skillSlots = Math.min(s.skillSlots + 1, 4); } },
  { id: 'doubleATK', name: 'Berserker\'s Pact', description: 'Double ATK but halve DEF.',
    rarity: 'rare', unique: true,
    apply: (s) => { s.atk *= 2; s.def = Math.max(0, Math.floor(s.def / 2)); } },
  { id: 'addThunder', name: 'Learn: Thunderbolt', description: 'Add powerful Thunderbolt to your skill bar.',
    rarity: 'rare', unique: true,
    apply: (s) => { if (!s.equippedSkills.includes('thunderbolt') && s.equippedSkills.length < s.skillSlots) s.equippedSkills.push('thunderbolt'); } },
  { id: 'addBattleCry', name: 'Learn: Battle Cry', description: 'Add Battle Cry to your skill bar.',
    rarity: 'rare', unique: true,
    apply: (s) => { if (!s.equippedSkills.includes('battleCry') && s.equippedSkills.length < s.skillSlots) s.equippedSkills.push('battleCry'); } },
  { id: 'critOverload', name: 'Assassin\'s Mark', description: '+25% crit chance and crits deal +1.0× damage.',
    rarity: 'rare', unique: true,
    apply: (s) => { s.critChance = Math.min(s.critChance + 0.25, 0.80); s.critMult += 1.0; } },
  { id: 'colossus', name: 'Colossus', description: '+80 max HP and +15 DEF.',
    rarity: 'rare',
    apply: (s) => { s.maxHP += 80; s.hp = Math.min(s.hp + 80, s.maxHP); s.def += 15; } },
  { id: 'battleMage', name: 'Battle Mage', description: '+15 ATK, +30 Max Mana, double mana regen.',
    rarity: 'rare', unique: true,
    apply: (s) => { s.atk += 15; s.maxMana += 30; s.manaRegen *= 2; } },
];

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 60,
  uncommon: 30,
  rare: 10,
};
