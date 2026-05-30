import { MutableStats } from '../data/upgradeCards';
import { StatusType } from '../data/skillDefinitions';
import { EventBus } from '../systems/EventBus';
import { clamp } from '../utils/MathUtils';

export type StatusEffect = {
  type: StatusType;
  ticksLeft: number;
  value: number;
};

export type PlayerClass = 'warrior' | 'mage' | 'rogue';

const CLASS_DEFAULTS: Record<PlayerClass, Partial<MutableStats>> = {
  warrior: { maxHP: 120, hp: 120, atk: 12, def: 8, spd: 0.9, maxMana: 40, equippedSkills: ['slash'] },
  mage:    { maxHP: 80,  hp: 80,  atk: 8,  def: 4, spd: 0.8, maxMana: 80, equippedSkills: ['fireball'] },
  rogue:   { maxHP: 90,  hp: 90,  atk: 14, def: 5, spd: 1.2, maxMana: 50, critChance: 0.15, equippedSkills: ['quickStrike'] },
};

export class Player {
  stats: MutableStats;
  mana: number;
  xp: number;
  level: number;
  xpToNext: number;
  statusEffects: StatusEffect[];
  ownedCardIds: Set<string>;
  attackCooldown: number; // ms remaining
  skillCooldowns: Map<string, number>;
  class: PlayerClass;

  // Derived at combat start from meta bonuses
  metaHPBonus: number;
  metaATKBonus: number;

  constructor(playerClass: PlayerClass = 'warrior', metaHPBonus = 0, metaATKBonus = 0) {
    this.class = playerClass;
    this.metaHPBonus = metaHPBonus;
    this.metaATKBonus = metaATKBonus;

    const defaults = CLASS_DEFAULTS[playerClass];
    this.stats = {
      maxHP: (defaults.maxHP ?? 100) + metaHPBonus,
      hp: (defaults.maxHP ?? 100) + metaHPBonus,
      atk: (defaults.atk ?? 10) + metaATKBonus,
      def: defaults.def ?? 5,
      spd: defaults.spd ?? 1.0,
      critChance: defaults.critChance ?? 0.05,
      critMult: defaults.critMult ?? 1.5,
      maxMana: defaults.maxMana ?? 50,
      manaRegen: defaults.manaRegen ?? 2,
      lifeStealPct: defaults.lifeStealPct ?? 0,
      skillSlots: defaults.skillSlots ?? 2,
      equippedSkills: [...(defaults.equippedSkills ?? [])],
    };
    this.mana = this.stats.maxMana;
    this.xp = 0;
    this.level = 1;
    this.xpToNext = 100;
    this.statusEffects = [];
    this.ownedCardIds = new Set();
    this.attackCooldown = 0;
    this.skillCooldowns = new Map();
  }

  get isAlive(): boolean {
    return this.stats.hp > 0;
  }

  takeDamage(amount: number): number {
    // Shield absorbs first
    const shieldEffect = this.statusEffects.find(e => e.type === 'shield');
    let remaining = amount;
    if (shieldEffect) {
      const absorbed = Math.min(shieldEffect.value, remaining);
      shieldEffect.value -= absorbed;
      remaining -= absorbed;
      if (shieldEffect.value <= 0) {
        this.statusEffects = this.statusEffects.filter(e => e !== shieldEffect);
      }
    }
    const actual = Math.max(0, remaining);
    this.stats.hp = clamp(this.stats.hp - actual, 0, this.stats.maxHP);
    EventBus.emit('player:statChanged', { stat: 'hp', newValue: this.stats.hp });
    return actual;
  }

  heal(amount: number): void {
    this.stats.hp = clamp(this.stats.hp + amount, 0, this.stats.maxHP);
    EventBus.emit('player:statChanged', { stat: 'hp', newValue: this.stats.hp });
  }

  gainMana(amount: number): void {
    this.mana = clamp(this.mana + amount, 0, this.stats.maxMana);
  }

  spendMana(amount: number): boolean {
    if (this.mana < amount) return false;
    this.mana -= amount;
    return true;
  }

  gainXP(amount: number): void {
    this.xp += amount;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.xpToNext = Math.floor(this.xpToNext * 1.4);
      // Level-up bonus
      this.stats.maxHP += 10;
      this.stats.hp = Math.min(this.stats.hp + 10, this.stats.maxHP);
      this.stats.atk += 2;
    }
  }

  applyCard(card: { id: string; apply: (s: MutableStats) => void }): void {
    card.apply(this.stats);
    this.ownedCardIds.add(card.id);
    // Clamp HP
    this.stats.hp = clamp(this.stats.hp, 0, this.stats.maxHP);
    this.mana = clamp(this.mana, 0, this.stats.maxMana);
  }

  applyStatus(type: StatusType, duration: number, value: number): void {
    const existing = this.statusEffects.find(e => e.type === type);
    if (existing) {
      existing.ticksLeft = Math.max(existing.ticksLeft, duration);
      existing.value = Math.max(existing.value, value);
    } else {
      this.statusEffects.push({ type, ticksLeft: duration, value });
    }
  }

  // Called each status tick (every second in CombatSystem)
  tickStatuses(): number {
    let totalDamage = 0;
    this.statusEffects = this.statusEffects.filter(effect => {
      if (effect.type === 'burn' || effect.type === 'poison') {
        totalDamage += effect.value;
      }
      if (effect.type === 'regen') {
        this.heal(effect.value);
      }
      effect.ticksLeft--;
      return effect.ticksLeft > 0;
    });
    return totalDamage;
  }

  get isStunned(): boolean {
    return this.statusEffects.some(e => e.type === 'stun');
  }

  get speedMultiplier(): number {
    const haste = this.statusEffects.find(e => e.type === 'haste');
    return haste ? 1 + haste.value : 1;
  }

  skillCooldownLeft(skillId: string): number {
    return this.skillCooldowns.get(skillId) ?? 0;
  }

  startSkillCooldown(skillId: string, duration: number): void {
    this.skillCooldowns.set(skillId, duration);
  }

  updateCooldowns(delta: number): void {
    for (const [id, cd] of this.skillCooldowns) {
      const next = cd - delta;
      if (next <= 0) this.skillCooldowns.delete(id);
      else this.skillCooldowns.set(id, next);
    }
    // Mana regen
    this.gainMana(this.stats.manaRegen * delta / 1000);
  }

  serialize(): object {
    return {
      class: this.class,
      level: this.level,
      xp: this.xp,
      xpToNext: this.xpToNext,
      stats: { ...this.stats },
      mana: this.mana,
      ownedCardIds: [...this.ownedCardIds],
    };
  }
}
