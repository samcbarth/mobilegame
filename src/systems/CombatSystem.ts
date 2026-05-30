import { Player } from '../entities/Player';
import {
  RuntimeEnemy, enemyTakeDamage, enemyApplyStatus, enemyTickStatuses,
  isEnemyStunned, enemySpeedMultiplier,
} from '../entities/Enemy';
import { SKILLS } from '../data/skillDefinitions';
import { BASE_ATTACK_INTERVAL, STATUS_TICK_INTERVAL } from '../constants';
import { EventBus } from './EventBus';
import { clamp } from '../utils/MathUtils';

export type DamageEvent = {
  amount: number;
  isCrit: boolean;
  isSkill: boolean;
  targetId: string; // 'player' or enemy uid
  healAmount?: number;
};

export type CombatCallbacks = {
  onDamage: (evt: DamageEvent) => void;
  onEnemyDied: (enemy: RuntimeEnemy, spawnSplit?: RuntimeEnemy) => void;
  onPlayerDied: () => void;
  onStatusApplied: (targetId: string, type: string) => void;
};

export class CombatSystem {
  private player: Player;
  private enemies: RuntimeEnemy[];
  private callbacks: CombatCallbacks;
  private statusTimer = 0;
  private active = true;
  private targetIndex = 0;

  constructor(player: Player, enemies: RuntimeEnemy[], callbacks: CombatCallbacks) {
    this.player = player;
    this.enemies = enemies;
    this.callbacks = callbacks;
    // Stagger enemy initial attacks
    for (const e of enemies) {
      e.attackCooldown = Math.random() * (BASE_ATTACK_INTERVAL / e.spd);
    }
  }

  get currentTarget(): RuntimeEnemy | null {
    const alive = this.aliveEnemies;
    if (alive.length === 0) return null;
    return alive[this.targetIndex % alive.length] ?? alive[0];
  }

  get aliveEnemies(): RuntimeEnemy[] {
    return this.enemies.filter(e => e.hp > 0);
  }

  setTarget(uid: string): void {
    const idx = this.aliveEnemies.findIndex(e => e.uid === uid);
    if (idx >= 0) this.targetIndex = idx;
  }

  usePlayerSkill(skillId: string): boolean {
    if (!this.active) return false;
    const skill = SKILLS[skillId];
    if (!skill) return false;
    if (this.player.skillCooldownLeft(skillId) > 0) return false;
    if (!this.player.spendMana(skill.manaCost)) return false;

    const target = skill.targetSelf ? null : this.currentTarget;
    const result = skill.effect(this.player.stats.atk, this.player.stats.def, 1);

    if (result.damage !== undefined && target) {
      const dmg = this.resolveEnemyDamage(target, result.damage, true);
      const healAmount = this.player.stats.lifeStealPct > 0
        ? Math.round(dmg * this.player.stats.lifeStealPct) : undefined;
      if (healAmount) this.player.heal(healAmount);

      this.callbacks.onDamage({ amount: dmg, isCrit: false, isSkill: true, targetId: target.uid, healAmount });

      if (result.status && target.hp > 0) {
        enemyApplyStatus(target, result.status.type, result.status.duration, result.status.value);
        this.callbacks.onStatusApplied(target.uid, result.status.type);
      }

      this.checkEnemyDeath(target);
    }

    if (result.healing !== undefined) {
      const healAmt = Math.round(this.player.stats.maxHP * 0.4);
      this.player.heal(healAmt);
      this.callbacks.onDamage({ amount: 0, isCrit: false, isSkill: true, targetId: 'player', healAmount: healAmt });
    }

    if (result.selfStatus) {
      this.player.applyStatus(result.selfStatus.type, result.selfStatus.duration, result.selfStatus.value);
      this.callbacks.onStatusApplied('player', result.selfStatus.type);
    }

    this.player.startSkillCooldown(skillId, skill.cooldown);
    EventBus.emit('skill:used', { skillId });
    return true;
  }

  update(delta: number): void {
    if (!this.active) return;

    this.player.updateCooldowns(delta);

    // Player auto-attack
    if (!this.player.isStunned && this.aliveEnemies.length > 0) {
      this.player.attackCooldown -= delta;
      if (this.player.attackCooldown <= 0) {
        const interval = BASE_ATTACK_INTERVAL / this.player.stats.spd / this.player.speedMultiplier;
        this.player.attackCooldown = interval;
        this.playerAutoAttack();
      }
    }

    // Enemy auto-attacks
    for (const enemy of this.aliveEnemies) {
      if (!isEnemyStunned(enemy)) {
        enemy.attackCooldown -= delta;
        if (enemy.attackCooldown <= 0) {
          const interval = BASE_ATTACK_INTERVAL / enemy.spd / enemySpeedMultiplier(enemy);
          enemy.attackCooldown = interval;
          this.enemyAutoAttack(enemy);
        }
      }
    }

    // Status effect ticks (every second)
    this.statusTimer += delta;
    if (this.statusTimer >= STATUS_TICK_INTERVAL) {
      this.statusTimer -= STATUS_TICK_INTERVAL;
      this.tickAllStatuses();
    }

    // Enemy ability usage
    for (const enemy of this.aliveEnemies) {
      for (const abilityId of enemy.abilities) {
        if (abilityId === 'split') continue; // triggered on death
        const skill = SKILLS[abilityId];
        if (!skill) continue;
        const cd = enemy.abilityCooldowns.get(abilityId) ?? skill.cooldown;
        const nextCd = cd - delta;
        if (nextCd <= 0) {
          enemy.abilityCooldowns.set(abilityId, skill.cooldown);
          this.enemyUseAbility(enemy, abilityId);
        } else {
          enemy.abilityCooldowns.set(abilityId, nextCd);
        }
      }
    }
  }

  private playerAutoAttack(): void {
    const target = this.currentTarget;
    if (!target) return;

    const isCrit = Math.random() < this.player.stats.critChance;
    let dmg = Math.max(1, this.player.stats.atk * (100 / (100 + target.def)));
    if (isCrit) dmg *= this.player.stats.critMult;
    dmg = Math.round(dmg);

    const actual = enemyTakeDamage(target, dmg);
    const healAmount = this.player.stats.lifeStealPct > 0
      ? Math.round(actual * this.player.stats.lifeStealPct) : undefined;
    if (healAmount) this.player.heal(healAmount);

    this.callbacks.onDamage({ amount: actual, isCrit, isSkill: false, targetId: target.uid, healAmount });
    this.checkEnemyDeath(target);
  }

  private enemyAutoAttack(enemy: RuntimeEnemy): void {
    const dmg = Math.max(1, Math.round(enemy.atk * (100 / (100 + this.player.stats.def))));
    const actual = this.player.takeDamage(dmg);
    this.callbacks.onDamage({ amount: actual, isCrit: false, isSkill: false, targetId: 'player' });

    if (!this.player.isAlive) {
      this.active = false;
      this.callbacks.onPlayerDied();
    }
  }

  private enemyUseAbility(enemy: RuntimeEnemy, abilityId: string): void {
    const skill = SKILLS[abilityId];
    if (!skill) return;

    const result = skill.effect(enemy.atk, enemy.def, 1);

    if (result.damage !== undefined) {
      const dmg = Math.max(1, Math.round(result.damage * (100 / (100 + this.player.stats.def))));
      const actual = this.player.takeDamage(dmg);
      const isLifeSteal = abilityId === 'lifeSteal';
      if (isLifeSteal) enemy.hp = clamp(enemy.hp + Math.round(actual * 0.5), 0, enemy.maxHP);

      this.callbacks.onDamage({ amount: actual, isCrit: false, isSkill: true, targetId: 'player' });

      if (!this.player.isAlive) {
        this.active = false;
        this.callbacks.onPlayerDied();
        return;
      }
    }

    if (result.status) {
      this.player.applyStatus(result.status.type, result.status.duration, result.status.value);
      this.callbacks.onStatusApplied('player', result.status.type);
    }
  }

  private resolveEnemyDamage(enemy: RuntimeEnemy, baseDmg: number, _isSkill: boolean): number {
    const dmg = Math.max(1, Math.round(baseDmg * (100 / (100 + enemy.def))));
    enemyTakeDamage(enemy, dmg);
    return dmg;
  }

  private tickAllStatuses(): void {
    // Player status tick
    const playerDmg = this.player.tickStatuses();
    if (playerDmg > 0) {
      const actual = this.player.takeDamage(playerDmg);
      this.callbacks.onDamage({ amount: actual, isCrit: false, isSkill: false, targetId: 'player' });
      if (!this.player.isAlive) {
        this.active = false;
        this.callbacks.onPlayerDied();
        return;
      }
    }

    // Enemy status ticks
    for (const enemy of this.aliveEnemies) {
      const dmg = enemyTickStatuses(enemy);
      if (dmg > 0) {
        enemy.hp = Math.max(0, enemy.hp - dmg);
        this.callbacks.onDamage({ amount: dmg, isCrit: false, isSkill: false, targetId: enemy.uid });
        this.checkEnemyDeath(enemy);
      }
    }
  }

  private checkEnemyDeath(enemy: RuntimeEnemy): void {
    if (enemy.hp > 0) return;
    const hasSplit = enemy.abilities.includes('split') && !enemy.isBoss;
    let splitEnemy: RuntimeEnemy | undefined;
    if (hasSplit && enemy.maxHP > 30) {
      // Spawn a smaller version
      splitEnemy = {
        ...enemy,
        uid: `${enemy.uid}_split`,
        name: `Small ${enemy.name}`,
        maxHP: Math.round(enemy.maxHP * 0.4),
        hp: Math.round(enemy.maxHP * 0.4),
        atk: Math.round(enemy.atk * 0.7),
        size: 'small',
        abilities: enemy.abilities.filter(a => a !== 'split'),
        statusEffects: [],
        attackCooldown: 500,
        abilityCooldowns: new Map(),
        isBoss: false,
      };
      this.enemies.push(splitEnemy);
    }

    this.callbacks.onEnemyDied(enemy, splitEnemy);
    EventBus.emit('enemy:died', { enemyId: enemy.uid });
  }
}
