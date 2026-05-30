export type EffectResult = {
  damage?: number;
  healing?: number;
  status?: { type: StatusType; duration: number; value: number };
  selfStatus?: { type: StatusType; duration: number; value: number };
};

export type StatusType = 'burn' | 'poison' | 'stun' | 'regen' | 'shield' | 'haste';

export type SkillDef = {
  id: string;
  name: string;
  description: string;
  manaCost: number;
  cooldown: number; // ms
  iconColor: number;
  targetSelf: boolean;
  effect: (atkStat: number, defStat: number, floor: number) => EffectResult;
};

export const SKILLS: Record<string, SkillDef> = {
  // Player skills
  slash: {
    id: 'slash', name: 'Slash', description: 'A powerful strike dealing 200% ATK.',
    manaCost: 15, cooldown: 4000, iconColor: 0xff8844, targetSelf: false,
    effect: (atk) => ({ damage: Math.round(atk * 2.0) }),
  },
  fireball: {
    id: 'fireball', name: 'Fireball', description: 'Deals 250% ATK fire damage and burns.',
    manaCost: 25, cooldown: 5000, iconColor: 0xff4400, targetSelf: false,
    effect: (atk) => ({
      damage: Math.round(atk * 2.5),
      status: { type: 'burn', duration: 3, value: Math.round(atk * 0.3) },
    }),
  },
  heal: {
    id: 'heal', name: 'Heal', description: 'Restore 40% of max HP.',
    manaCost: 30, cooldown: 8000, iconColor: 0x44ff88, targetSelf: true,
    effect: (_atk, def) => ({ healing: Math.round(def * 4) }),
  },
  shield: {
    id: 'shield', name: 'Iron Wall', description: 'Gain a damage-absorbing shield for 5 turns.',
    manaCost: 20, cooldown: 10000, iconColor: 0x8888ff, targetSelf: true,
    effect: (_atk, def) => ({ selfStatus: { type: 'shield', duration: 5, value: def * 3 } }),
  },
  poisonDart: {
    id: 'poisonDart', name: 'Poison Dart', description: 'Poisons target for 5 turns.',
    manaCost: 15, cooldown: 5000, iconColor: 0x44cc44, targetSelf: false,
    effect: (atk) => ({
      damage: Math.round(atk * 0.5),
      status: { type: 'poison', duration: 5, value: Math.round(atk * 0.4) },
    }),
  },
  quickStrike: {
    id: 'quickStrike', name: 'Quick Strike', description: 'Fast strike with no cooldown penalty.',
    manaCost: 8, cooldown: 2000, iconColor: 0xffff44, targetSelf: false,
    effect: (atk) => ({ damage: Math.round(atk * 1.2) }),
  },
  thunderbolt: {
    id: 'thunderbolt', name: 'Thunderbolt', description: 'Massive 350% ATK and stuns for 2 turns.',
    manaCost: 40, cooldown: 9000, iconColor: 0xbbbbff, targetSelf: false,
    effect: (atk) => ({
      damage: Math.round(atk * 3.5),
      status: { type: 'stun', duration: 2, value: 0 },
    }),
  },
  battleCry: {
    id: 'battleCry', name: 'Battle Cry', description: 'Haste yourself for 4 turns.',
    manaCost: 25, cooldown: 12000, iconColor: 0xff8800, targetSelf: true,
    effect: () => ({ selfStatus: { type: 'haste', duration: 4, value: 0.5 } }),
  },

  // Enemy abilities (used by AI)
  boneClaw: {
    id: 'boneClaw', name: 'Bone Claw', description: '',
    manaCost: 0, cooldown: 6000, iconColor: 0xffffff, targetSelf: false,
    effect: (atk) => ({ damage: Math.round(atk * 1.5) }),
  },
  acidSpit: {
    id: 'acidSpit', name: 'Acid Spit', description: '',
    manaCost: 0, cooldown: 5000, iconColor: 0x88ff00, targetSelf: false,
    effect: (atk) => ({
      damage: Math.round(atk * 0.8),
      status: { type: 'poison', duration: 3, value: Math.round(atk * 0.3) },
    }),
  },
  stomp: {
    id: 'stomp', name: 'Stomp', description: '',
    manaCost: 0, cooldown: 7000, iconColor: 0xffffff, targetSelf: false,
    effect: (atk) => ({ damage: Math.round(atk * 2.0) }),
  },
  rot: {
    id: 'rot', name: 'Rot', description: '',
    manaCost: 0, cooldown: 6000, iconColor: 0x556644, targetSelf: false,
    effect: (atk) => ({
      damage: Math.round(atk * 0.5),
      status: { type: 'poison', duration: 4, value: Math.round(atk * 0.35) },
    }),
  },
  poison: {
    id: 'poison', name: 'Poison', description: '',
    manaCost: 0, cooldown: 5000, iconColor: 0x44cc44, targetSelf: false,
    effect: (atk) => ({ status: { type: 'poison', duration: 4, value: Math.round(atk * 0.5) } }),
  },
  sporeCloud: {
    id: 'sporeCloud', name: 'Spore Cloud', description: '',
    manaCost: 0, cooldown: 6000, iconColor: 0xaa6633, targetSelf: false,
    effect: (atk) => ({
      damage: Math.round(atk * 0.6),
      status: { type: 'poison', duration: 5, value: Math.round(atk * 0.25) },
    }),
  },
  rootWrap: {
    id: 'rootWrap', name: 'Root Wrap', description: '',
    manaCost: 0, cooldown: 8000, iconColor: 0x336622, targetSelf: false,
    effect: (atk) => ({
      damage: Math.round(atk * 1.0),
      status: { type: 'stun', duration: 2, value: 0 },
    }),
  },
  fireBurst: {
    id: 'fireBurst', name: 'Fire Burst', description: '',
    manaCost: 0, cooldown: 5000, iconColor: 0xff6600, targetSelf: false,
    effect: (atk) => ({
      damage: Math.round(atk * 2.0),
      status: { type: 'burn', duration: 3, value: Math.round(atk * 0.3) },
    }),
  },
  lifeSteal: {
    id: 'lifeSteal', name: 'Life Steal', description: '',
    manaCost: 0, cooldown: 6000, iconColor: 0x9966cc, targetSelf: false,
    effect: (atk) => ({ damage: Math.round(atk * 1.8) }), // heals on hit in CombatSystem
  },
  pincer: {
    id: 'pincer', name: 'Pincer', description: '',
    manaCost: 0, cooldown: 5000, iconColor: 0x886644, targetSelf: false,
    effect: (atk) => ({ damage: Math.round(atk * 1.6) }),
  },
  venom: {
    id: 'venom', name: 'Venom', description: '',
    manaCost: 0, cooldown: 4500, iconColor: 0xcc9944, targetSelf: false,
    effect: (atk) => ({
      damage: Math.round(atk * 0.8),
      status: { type: 'poison', duration: 6, value: Math.round(atk * 0.4) },
    }),
  },
  moltenhurl: {
    id: 'moltenhurl', name: 'Molten Hurl', description: '',
    manaCost: 0, cooldown: 6500, iconColor: 0xff4400, targetSelf: false,
    effect: (atk) => ({
      damage: Math.round(atk * 2.2),
      status: { type: 'burn', duration: 4, value: Math.round(atk * 0.4) },
    }),
  },
  split: {
    id: 'split', name: 'Split', description: '',
    manaCost: 0, cooldown: 99999, iconColor: 0x66ff44, targetSelf: false,
    effect: () => ({}), // handled specially in CombatSystem
  },
};

// Skills the player can equip (available in upgrade cards / class selection)
export const PLAYER_SKILL_IDS = ['slash', 'fireball', 'heal', 'shield', 'poisonDart', 'quickStrike', 'thunderbolt', 'battleCry'];
