import { EnemyModifier } from '../data/enemyTemplates';
import { StatusType } from '../data/skillDefinitions';
import { clamp } from '../utils/MathUtils';

export type EnemyStatus = {
  type: StatusType;
  ticksLeft: number;
  value: number;
};

export type RuntimeEnemy = {
  uid: string;
  name: string;
  archetypeId: string;
  hp: number;
  maxHP: number;
  atk: number;
  def: number;
  spd: number; // attacks per second
  abilities: string[]; // skill ids
  modifiers: EnemyModifier[];
  spriteColor: number;
  size: 'small' | 'medium' | 'large';
  soulsValue: number;
  xpValue: number;
  // Runtime state
  statusEffects: EnemyStatus[];
  attackCooldown: number;
  abilityCooldowns: Map<string, number>;
  isBoss: boolean;
};

export function createRuntimeEnemy(partial: Omit<RuntimeEnemy, 'statusEffects' | 'attackCooldown' | 'abilityCooldowns'>): RuntimeEnemy {
  return {
    ...partial,
    statusEffects: [],
    attackCooldown: Math.random() * 1000, // stagger initial attacks
    abilityCooldowns: new Map(),
  };
}

export function enemyTakeDamage(enemy: RuntimeEnemy, amount: number): number {
  const actual = Math.max(1, amount);
  enemy.hp = clamp(enemy.hp - actual, 0, enemy.maxHP);
  return actual;
}

export function enemyApplyStatus(enemy: RuntimeEnemy, type: StatusType, duration: number, value: number): void {
  const existing = enemy.statusEffects.find(e => e.type === type);
  if (existing) {
    existing.ticksLeft = Math.max(existing.ticksLeft, duration);
    existing.value = Math.max(existing.value, value);
  } else {
    enemy.statusEffects.push({ type, ticksLeft: duration, value });
  }
}

export function enemyTickStatuses(enemy: RuntimeEnemy): number {
  let totalDamage = 0;
  enemy.statusEffects = enemy.statusEffects.filter(effect => {
    if (effect.type === 'burn' || effect.type === 'poison') {
      totalDamage += effect.value;
    }
    effect.ticksLeft--;
    return effect.ticksLeft > 0;
  });
  return totalDamage;
}

export function isEnemyStunned(enemy: RuntimeEnemy): boolean {
  return enemy.statusEffects.some(e => e.type === 'stun');
}

export function enemySpeedMultiplier(enemy: RuntimeEnemy): number {
  const haste = enemy.statusEffects.find(e => e.type === 'haste');
  return haste ? 1 + haste.value : 1;
}
