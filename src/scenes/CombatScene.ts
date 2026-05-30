import Phaser from 'phaser';
import { SCREEN_W, SCREEN_H, TOP_BAR_H, BOTTOM_BAR_H } from '../constants';
import { Room } from '../entities/Room';
import { RuntimeEnemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { CombatSystem } from '../systems/CombatSystem';
import { SKILLS } from '../data/skillDefinitions';
import { UIScene } from './UIScene';
import { spawnDamageNumber } from '../ui/DamageNumber';
import { SaveSystem } from '../systems/SaveSystem';
import { EventBus } from '../systems/EventBus';

const CONTENT_Y = TOP_BAR_H;
const CONTENT_H = SCREEN_H - TOP_BAR_H - BOTTOM_BAR_H;
const SKILL_BTN_SIZE = 86;
const SKILL_BTN_GAP = 8;

interface CombatData {
  room: Room;
  player: Player;
  floor: number;
  soulsThisRun: number;
}

export class CombatScene extends Phaser.Scene {
  private combat!: CombatSystem;
  private player!: Player;
  private enemies: RuntimeEnemy[] = [];
  private room!: Room;
  private floor = 1;
  private soulsThisRun = 0;

  private enemySprites = new Map<string, Phaser.GameObjects.Rectangle>();
  private enemyHPBars = new Map<string, Phaser.GameObjects.Rectangle>();
  private enemyHPBacks = new Map<string, Phaser.GameObjects.Rectangle>();
  private enemyLabels = new Map<string, Phaser.GameObjects.Text>();
  private skillButtons: Phaser.GameObjects.Container[] = [];
  private skillCDOverlays: Array<{ overlay: Phaser.GameObjects.Rectangle; skillId: string }> = [];
  private targetIndicator!: Phaser.GameObjects.Triangle;
  private battleLog!: Phaser.GameObjects.Text;
  private soulsEarned = 0;
  private xpEarned = 0;
  private statusIcons = new Map<string, Phaser.GameObjects.Text>();

  constructor() { super({ key: 'CombatScene' }); }

  init(data: CombatData): void {
    this.room = data.room;
    this.player = data.player;
    this.enemies = [...data.room.enemies];
    this.floor = data.floor;
    this.soulsThisRun = data.soulsThisRun;
    this.soulsEarned = 0;
    this.xpEarned = 0;
  }

  create(): void {
    // Semi-transparent combat overlay
    const bg = this.add.rectangle(SCREEN_W / 2, SCREEN_H / 2, SCREEN_W, SCREEN_H, 0x080810, 0.97);
    void bg;

    // Title
    const isElite = this.room.type === 'elite';
    this.add.text(SCREEN_W / 2, CONTENT_Y + 10, isElite ? '☠ ELITE BATTLE ☠' : '⚔ COMBAT', {
      fontSize: isElite ? '20px' : '16px',
      color: isElite ? '#ff44ff' : '#cc8844',
      fontFamily: 'monospace', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(5);

    // Battle log
    this.battleLog = this.add.text(SCREEN_W / 2, CONTENT_Y + 38, '', {
      fontSize: '12px', color: '#aaaaaa', fontFamily: 'monospace',
      wordWrap: { width: SCREEN_W - 20 }, align: 'center',
    }).setOrigin(0.5, 0).setDepth(5);

    // Enemy area
    this.spawnEnemySprites();

    // Target indicator
    this.targetIndicator = this.add.triangle(0, 0, 0, 0, 16, 8, 0, 16, 0x88ccff).setDepth(20);

    // Skill bar
    this.createSkillBar();

    // Combat system
    this.combat = new CombatSystem(this.player, this.enemies, {
      onDamage: (evt) => this.handleDamage(evt),
      onEnemyDied: (enemy, split) => this.handleEnemyDeath(enemy, split),
      onPlayerDied: () => this.handlePlayerDeath(),
      onStatusApplied: (targetId, type) => this.showStatusEffect(targetId, type),
    });

    // Update UI
    const ui = this.scene.get('UIScene') as UIScene;
    if (ui?.scene.isActive()) {
      ui.updateStats(this.player.stats.hp, this.player.stats.maxHP,
        this.player.mana, this.player.stats.maxMana, this.floor, this.soulsThisRun);
    }
  }

  private spawnEnemySprites(): void {
    const alive = this.enemies;
    const count = alive.length;
    const slotW = Math.min(90, (SCREEN_W - 20) / count);
    const startX = SCREEN_W / 2 - (count - 1) * slotW / 2;
    const enemyAreaCenterY = CONTENT_Y + CONTENT_H * 0.45;

    alive.forEach((enemy, i) => {
      this.createEnemySprite(enemy, startX + i * slotW, enemyAreaCenterY);
    });
  }

  private createEnemySprite(enemy: RuntimeEnemy, x: number, y: number): void {
    const size = enemy.size === 'large' ? 64 : enemy.size === 'medium' ? 48 : 36;

    const sprite = this.add.rectangle(x, y, size, size, enemy.spriteColor)
      .setStrokeStyle(2, 0xffffff, 0.5)
      .setDepth(10)
      .setInteractive({ useHandCursor: true });

    sprite.on('pointerdown', () => {
      this.combat.setTarget(enemy.uid);
      this.updateTargetIndicator();
    });

    this.enemySprites.set(enemy.uid, sprite);

    // HP bar above
    const barW = Math.max(40, size + 10);
    const barBack = this.add.rectangle(x, y - size / 2 - 14, barW, 8, 0x330000).setDepth(11);
    const bar = this.add.rectangle(x - barW / 2, y - size / 2 - 14, barW, 8, 0x44cc44)
      .setOrigin(0, 0.5).setDepth(12);
    this.enemyHPBacks.set(enemy.uid, barBack);
    this.enemyHPBars.set(enemy.uid, bar);

    // Name + HP
    const lbl = this.add.text(x, y - size / 2 - 26, `${enemy.name}\n${enemy.hp}/${enemy.maxHP}`, {
      fontSize: '10px', color: '#cccccc', fontFamily: 'monospace', align: 'center',
    }).setOrigin(0.5, 1).setDepth(12);
    this.enemyLabels.set(enemy.uid, lbl);

    // Boss indicator
    if (enemy.isBoss) {
      this.add.text(x, y + size / 2 + 4, '⭐ BOSS', {
        fontSize: '10px', color: '#ff44ff', fontFamily: 'monospace',
      }).setOrigin(0.5, 0).setDepth(12);
    }

    this.updateTargetIndicator();
  }

  private updateTargetIndicator(): void {
    const target = this.combat.currentTarget;
    if (!target) { this.targetIndicator.setVisible(false); return; }
    const sprite = this.enemySprites.get(target.uid);
    if (!sprite) return;
    const size = target.size === 'large' ? 64 : target.size === 'medium' ? 48 : 36;
    this.targetIndicator
      .setPosition(sprite.x - 8, sprite.y - size / 2 - 36)
      .setVisible(true);
  }

  private createSkillBar(): void {
    const skills = this.player.stats.equippedSkills;
    const totalSlots = this.player.stats.skillSlots;
    const totalW = totalSlots * (SKILL_BTN_SIZE + SKILL_BTN_GAP) - SKILL_BTN_GAP;
    const startX = SCREEN_W / 2 - totalW / 2 + SKILL_BTN_SIZE / 2;
    const btnY = SCREEN_H - BOTTOM_BAR_H + 60;

    this.skillCDOverlays = [];

    for (let i = 0; i < totalSlots; i++) {
      const skillId = skills[i];
      const x = startX + i * (SKILL_BTN_SIZE + SKILL_BTN_GAP);
      const skill = skillId ? SKILLS[skillId] : null;

      const bg = this.add.rectangle(x, btnY, SKILL_BTN_SIZE, SKILL_BTN_SIZE, 0x1a1a33)
        .setStrokeStyle(2, skill ? 0x6666aa : 0x333344).setDepth(55);

      if (skill) {
        // Skill icon (colored circle)
        this.add.circle(x, btnY, SKILL_BTN_SIZE / 2 - 4, skill.iconColor, 0.25).setDepth(56);

        this.add.text(x, btnY - 12, skill.name, {
          fontSize: '9px', color: '#cccccc', fontFamily: 'monospace', align: 'center',
          wordWrap: { width: SKILL_BTN_SIZE - 4 },
        }).setOrigin(0.5).setDepth(57);

        this.add.text(x, btnY + 8, `${skill.manaCost}mp`, {
          fontSize: '9px', color: '#4488ff', fontFamily: 'monospace',
        }).setOrigin(0.5).setDepth(57);

        // Cooldown overlay
        const cdOverlay = this.add.rectangle(x, btnY, SKILL_BTN_SIZE, SKILL_BTN_SIZE, 0x000000, 0)
          .setDepth(58).setStrokeStyle(0);
        this.skillCDOverlays.push({ overlay: cdOverlay, skillId });

        const container = this.add.container(x, btnY).setSize(SKILL_BTN_SIZE, SKILL_BTN_SIZE)
          .setDepth(59).setInteractive({ useHandCursor: true });
        container.on('pointerdown', () => {
          const used = this.combat.usePlayerSkill(skillId);
          if (!used) {
            this.add.text(x, btnY - 30, 'Not ready!', {
              fontSize: '11px', color: '#ff8888', fontFamily: 'monospace',
            }).setOrigin(0.5).setDepth(70)
              .setAlpha(1)
              .setData('tween', this.tweens.add({
                targets: this.scene.get('CombatScene').children.getAll().slice(-1)[0],
                alpha: 0, y: btnY - 50, duration: 800,
                onComplete: (_, [t]) => (t as Phaser.GameObjects.Text).destroy(),
              }));
          }
        });
        this.skillButtons.push(container);
      } else {
        this.add.text(x, btnY, 'Empty', { fontSize: '10px', color: '#444444', fontFamily: 'monospace' })
          .setOrigin(0.5).setDepth(56);
      }
      void bg;
    }

    // Flee button
    const fleeBtn = this.add.text(SCREEN_W - 10, SCREEN_H - BOTTOM_BAR_H + 18, 'FLEE\n⚠', {
      fontSize: '11px', color: '#884444', fontFamily: 'monospace', align: 'center',
    }).setOrigin(1, 0).setDepth(56).setInteractive({ useHandCursor: true });
    fleeBtn.on('pointerdown', () => this.handleFlee());
  }

  update(_time: number, delta: number): void {
    this.combat.update(delta);

    // Update enemy HP bars
    for (const enemy of this.enemies) {
      const bar = this.enemyHPBars.get(enemy.uid);
      const back = this.enemyHPBacks.get(enemy.uid);
      const lbl = this.enemyLabels.get(enemy.uid);
      if (bar && back) {
        const pct = enemy.maxHP > 0 ? enemy.hp / enemy.maxHP : 0;
        bar.width = (back.width) * pct;
        bar.fillColor = pct > 0.5 ? 0x44cc44 : pct > 0.25 ? 0xddcc00 : 0xcc2222;
      }
      if (lbl) lbl.setText(`${enemy.name}\n${Math.max(0, Math.ceil(enemy.hp))}/${enemy.maxHP}`);
    }

    // Update skill cooldown overlays
    for (const { overlay, skillId } of this.skillCDOverlays) {
      const cdLeft = this.player.skillCooldownLeft(skillId);
      const skill = SKILLS[skillId];
      if (cdLeft > 0 && skill) {
        const pct = cdLeft / skill.cooldown;
        overlay.setFillStyle(0x000000, 0.6 * pct);
      } else {
        overlay.setFillStyle(0x000000, 0);
      }
    }

    // Update UI mana
    const ui = this.scene.get('UIScene') as UIScene | null;
    if (ui?.scene.isActive()) {
      ui.updateMana(this.player.mana, this.player.stats.maxMana);
    }

    this.updateTargetIndicator();
  }

  private handleDamage(evt: {
    amount: number; isCrit: boolean; isSkill: boolean;
    targetId: string; healAmount?: number;
  }): void {
    let x: number, y: number;

    if (evt.targetId === 'player') {
      x = SCREEN_W / 2 + Phaser.Math.Between(-40, 40);
      y = SCREEN_H - BOTTOM_BAR_H - 30;
    } else {
      const sprite = this.enemySprites.get(evt.targetId);
      x = sprite ? sprite.x + Phaser.Math.Between(-20, 20) : SCREEN_W / 2;
      y = sprite ? sprite.y - 20 : SCREEN_H / 2;
    }

    if (evt.amount > 0) {
      spawnDamageNumber({ scene: this, x, y, amount: evt.amount, isCrit: evt.isCrit, isHeal: false, isPoison: false });
    }
    if (evt.healAmount && evt.healAmount > 0) {
      spawnDamageNumber({ scene: this, x, y: y - 30, amount: evt.healAmount, isCrit: false, isHeal: true, isPoison: false });
    }

    // Update log
    if (evt.targetId !== 'player' && evt.amount > 0) {
      const enemy = this.enemies.find(e => e.uid === evt.targetId);
      const suffix = evt.isCrit ? ' CRIT!' : evt.isSkill ? ' (skill)' : '';
      this.battleLog.setText(`You hit ${enemy?.name ?? 'enemy'} for ${evt.amount}${suffix}`);
    } else if (evt.targetId === 'player' && evt.amount > 0) {
      this.battleLog.setText(`Enemy hits you for ${evt.amount}!`);
    }

    // Screen shake on heavy hits to player
    if (evt.targetId === 'player' && evt.amount > this.player.stats.maxHP * 0.15) {
      this.cameras.main.shake(120, 0.006);
    }
  }

  private handleEnemyDeath(enemy: RuntimeEnemy, splitEnemy?: RuntimeEnemy): void {
    SaveSystem.discoverEnemy(enemy.archetypeId);

    // Death animation
    const sprite = this.enemySprites.get(enemy.uid);
    if (sprite) {
      this.tweens.add({
        targets: sprite,
        scaleX: 0, scaleY: 0, alpha: 0,
        duration: 300, ease: 'Power2',
        onComplete: () => sprite.destroy(),
      });
      // Particle burst (using rectangles as stand-in)
      for (let p = 0; p < 6; p++) {
        const px = sprite.x + Phaser.Math.Between(-20, 20);
        const py = sprite.y + Phaser.Math.Between(-20, 20);
        const particle = this.add.rectangle(px, py, 6, 6, enemy.spriteColor).setDepth(20);
        this.tweens.add({
          targets: particle,
          x: px + Phaser.Math.Between(-40, 40),
          y: py + Phaser.Math.Between(-40, 40),
          alpha: 0, scaleX: 0, scaleY: 0,
          duration: 400 + p * 60,
          onComplete: () => particle.destroy(),
        });
      }
    }
    this.enemyHPBars.get(enemy.uid)?.destroy();
    this.enemyHPBacks.get(enemy.uid)?.destroy();
    this.enemyLabels.get(enemy.uid)?.destroy();

    this.soulsEarned += enemy.soulsValue;
    this.xpEarned += enemy.xpValue;

    // If a split enemy spawned, create its sprite
    if (splitEnemy) {
      const sprite2 = this.enemySprites.get(enemy.uid);
      const x = sprite2 ? sprite2.x + 30 : SCREEN_W / 2;
      const y = sprite2 ? sprite2.y : SCREEN_H / 2;
      this.createEnemySprite(splitEnemy, x, y);
    }

    // Check victory
    if (this.combat.aliveEnemies.length === 0) {
      this.time.delayedCall(600, () => this.handleVictory());
    } else {
      this.updateTargetIndicator();
    }
  }

  private handleVictory(): void {
    EventBus.emit('ui:showMessage', { text: `Victory! +${this.soulsEarned}⬡ +${this.xpEarned}xp`, duration: 2000 });
    this.time.delayedCall(700, () => {
      this.scene.stop('CombatScene');
      this.events.emit('combatVictory', { souls: this.soulsEarned, xp: this.xpEarned });
    });
  }

  private handlePlayerDeath(): void {
    EventBus.emit('ui:showMessage', { text: 'You died...', duration: 2000 });
    this.time.delayedCall(1200, () => {
      this.scene.stop('CombatScene');
      this.events.emit('combatDefeat');
    });
  }

  private handleFlee(): void {
    // Fleeing deals 20% max HP as penalty
    const penalty = Math.round(this.player.stats.maxHP * 0.2);
    this.player.takeDamage(penalty);
    EventBus.emit('ui:showMessage', { text: `Fled! Lost ${penalty} HP`, duration: 1500 });
    this.time.delayedCall(500, () => {
      this.scene.stop('CombatScene');
      this.events.emit('combatVictory', { souls: 0, xp: 0 });
    });
  }

  private showStatusEffect(targetId: string, type: string): void {
    const sprite = targetId === 'player'
      ? null
      : this.enemySprites.get(targetId);
    const x = sprite ? sprite.x : 30;
    const y = sprite ? sprite.y + 40 : SCREEN_H - BOTTOM_BAR_H - 50;
    const colors: Record<string, string> = {
      burn: '#ff6600', poison: '#88ff44', stun: '#ffffff',
      regen: '#44ffaa', shield: '#8888ff', haste: '#ffff44',
    };
    const txt = this.add.text(x, y, type.toUpperCase(), {
      fontSize: '10px', color: colors[type] ?? '#ffffff', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(25);
    this.tweens.add({ targets: txt, y: y - 30, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });
  }
}
