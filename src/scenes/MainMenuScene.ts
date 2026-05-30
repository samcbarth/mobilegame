import Phaser from 'phaser';
import { SCREEN_W, SCREEN_H } from '../constants';
import { SaveSystem } from '../systems/SaveSystem';
import { META_TREE, MetaProgressionSystem } from '../systems/MetaProgressionSystem';
import { EventBus } from '../systems/EventBus';
import { makeSeed } from '../utils/RNG';
import { PlayerClass } from '../entities/Player';

export class MainMenuScene extends Phaser.Scene {
  private saveData = SaveSystem.load();
  private selectedClass: PlayerClass = 'warrior';
  private showingShop = false;
  private shopContainer?: Phaser.GameObjects.Container;

  constructor() { super({ key: 'MainMenuScene' }); }

  create(): void {
    this.saveData = SaveSystem.load();

    // Background gradient
    const bg = this.add.rectangle(SCREEN_W / 2, SCREEN_H / 2, SCREEN_W, SCREEN_H, 0x06060f);
    void bg;

    // Subtle grid
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1a1a3a, 0.4);
    for (let x = 0; x < SCREEN_W; x += 30) grid.lineBetween(x, 0, x, SCREEN_H);
    for (let y = 0; y < SCREEN_H; y += 30) grid.lineBetween(0, y, SCREEN_W, y);

    // Title
    this.add.text(SCREEN_W / 2, 140, 'INFINITE', {
      fontSize: '48px', color: '#88ccff', fontFamily: 'monospace',
      stroke: '#003366', strokeThickness: 4,
    }).setOrigin(0.5);
    this.add.text(SCREEN_W / 2, 196, 'DUNGEON', {
      fontSize: '48px', color: '#ffcc44', fontFamily: 'monospace',
      stroke: '#664400', strokeThickness: 4,
    }).setOrigin(0.5);

    // Stats display
    this.add.text(SCREEN_W / 2, 260, `Best Floor: ${this.saveData.bestFloor}   Runs: ${this.saveData.totalRuns}`, {
      fontSize: '16px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(SCREEN_W / 2, 285, `⬡ Souls: ${this.saveData.totalSouls}`, {
      fontSize: '18px', color: '#88ccff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Class selection
    this.drawClassSelect();

    // Start button
    this.makeButton(SCREEN_W / 2, 580, 260, 64, '▶  START RUN', 0x226644, () => this.startRun());

    // Meta shop button
    this.makeButton(SCREEN_W / 2, 666, 260, 52, '⬡  UPGRADE TREE', 0x224466, () => this.openShop());

    // Version / flavor
    this.add.text(SCREEN_W / 2, SCREEN_H - 20, 'v0.1  —  infinite floors await', {
      fontSize: '12px', color: '#333355', fontFamily: 'monospace',
    }).setOrigin(0.5);
  }

  private drawClassSelect(): void {
    this.add.text(SCREEN_W / 2, 320, 'Choose Class', {
      fontSize: '16px', color: '#aaaaaa', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const classes: Array<{ id: PlayerClass; label: string; desc: string; color: number }> = [
      { id: 'warrior', label: 'WARRIOR', desc: 'HP:120 ATK:12', color: 0x4466aa },
      { id: 'mage', label: 'MAGE', desc: 'HP:80  ATK:8', color: 0x8844cc },
      { id: 'rogue', label: 'ROGUE', desc: 'HP:90  ATK:14', color: 0x446644 },
    ];

    const unlocked = this.saveData.unlockedClasses;

    classes.forEach(({ id, label, desc, color }, i) => {
      const x = 60 + i * 112;
      const y = 380;
      const isUnlocked = unlocked.includes(id);
      const alpha = isUnlocked ? 1 : 0.4;

      const btn = this.add.rectangle(x, y, 100, 80, color, 0.3)
        .setStrokeStyle(2, this.selectedClass === id ? 0xffffff : color)
        .setAlpha(alpha)
        .setInteractive({ useHandCursor: isUnlocked });

      const lbl = this.add.text(x, y - 12, label, {
        fontSize: '14px', color: '#ffffff', fontFamily: 'monospace',
      }).setOrigin(0.5).setAlpha(alpha);

      const sub = this.add.text(x, y + 10, desc, {
        fontSize: '10px', color: '#aaaaaa', fontFamily: 'monospace',
      }).setOrigin(0.5).setAlpha(alpha);

      if (!isUnlocked) {
        this.add.text(x, y + 28, '🔒 LOCKED', {
          fontSize: '10px', color: '#666666', fontFamily: 'monospace',
        }).setOrigin(0.5);
      }

      if (isUnlocked) {
        btn.on('pointerdown', () => {
          this.selectedClass = id;
          this.scene.restart();
        });
      }
      void lbl; void sub;
    });
  }

  private makeButton(x: number, y: number, w: number, h: number, label: string, color: number, cb: () => void): Phaser.GameObjects.Container {
    const bg = this.add.rectangle(0, 0, w, h, color).setStrokeStyle(2, 0xffffff, 0.5);
    const txt = this.add.text(0, 0, label, {
      fontSize: '18px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);
    const container = this.add.container(x, y, [bg, txt]).setSize(w, h).setInteractive({ useHandCursor: true });
    container.on('pointerdown', () => { bg.setFillStyle(color, 0.5); });
    container.on('pointerup', () => { bg.setFillStyle(color); cb(); });
    container.on('pointerout', () => { bg.setFillStyle(color); });
    return container;
  }

  private startRun(): void {
    const seed = makeSeed();
    this.saveData = SaveSystem.load();
    this.scene.start('DungeonScene', {
      floor: 1,
      seed,
      playerClass: this.selectedClass,
      soulsThisRun: 0,
    });
    this.scene.start('UIScene');
  }

  private openShop(): void {
    this.showingShop = !this.showingShop;
    if (this.shopContainer) { this.shopContainer.destroy(); this.shopContainer = undefined; }
    if (!this.showingShop) return;

    const items: Phaser.GameObjects.GameObject[] = [];
    const overlay = this.add.rectangle(SCREEN_W / 2, SCREEN_H / 2, SCREEN_W, SCREEN_H, 0x000000, 0.85)
      .setInteractive();
    items.push(overlay);

    items.push(this.add.text(SCREEN_W / 2, 60, '⬡ UPGRADE TREE', {
      fontSize: '22px', color: '#88ccff', fontFamily: 'monospace',
    }).setOrigin(0.5));
    items.push(this.add.text(SCREEN_W / 2, 92, `Souls: ${this.saveData.totalSouls}`, {
      fontSize: '16px', color: '#88ccff', fontFamily: 'monospace',
    }).setOrigin(0.5));

    const nodesByBranch = new Map<number, typeof META_TREE>();
    for (const node of META_TREE) {
      if (!nodesByBranch.has(node.branch)) nodesByBranch.set(node.branch, []);
      nodesByBranch.get(node.branch)!.push(node);
    }

    let startY = 130;
    for (const [branch, nodes] of nodesByBranch) {
      const branchNames = ['❤ Vitality', '⚔ Power', '🃏 Cards', '🔓 Classes'];
      items.push(this.add.text(20, startY, branchNames[branch] ?? `Branch ${branch}`, {
        fontSize: '13px', color: '#888888', fontFamily: 'monospace',
      }));
      startY += 22;

      for (const node of nodes) {
        const isUnlocked = this.saveData.unlockedNodes.includes(node.id);
        const canBuy = MetaProgressionSystem.canUnlock(node.id, this.saveData.unlockedNodes)
          && this.saveData.totalSouls >= node.cost;

        const rowBg = this.add.rectangle(SCREEN_W / 2, startY + 20, SCREEN_W - 20, 40,
          isUnlocked ? 0x114411 : canBuy ? 0x112233 : 0x111111, 0.9)
          .setStrokeStyle(1, isUnlocked ? 0x44cc44 : canBuy ? 0x4488aa : 0x333333);
        items.push(rowBg);

        items.push(this.add.text(30, startY + 8, node.name, {
          fontSize: '13px', color: isUnlocked ? '#44cc44' : canBuy ? '#aaaaff' : '#555555',
          fontFamily: 'monospace',
        }));
        items.push(this.add.text(30, startY + 22, node.description, {
          fontSize: '10px', color: '#666666', fontFamily: 'monospace',
        }));

        const costTxt = isUnlocked ? '✓' : `⬡${node.cost}`;
        const costLabel = this.add.text(SCREEN_W - 30, startY + 20, costTxt, {
          fontSize: '13px', color: isUnlocked ? '#44cc44' : canBuy ? '#88ccff' : '#444444',
          fontFamily: 'monospace',
        }).setOrigin(1, 0.5);
        items.push(costLabel);

        if (canBuy) {
          rowBg.setInteractive({ useHandCursor: true });
          rowBg.on('pointerdown', () => {
            if (MetaProgressionSystem.tryUnlock(node.id)) {
              this.saveData = SaveSystem.load();
              EventBus.emit('meta:soulsChanged', { total: this.saveData.totalSouls });
              this.showingShop = false;
              this.scene.restart();
            }
          });
        }

        startY += 48;
      }
      startY += 12;
    }

    // Close button
    const closeTxt = this.add.text(SCREEN_W / 2, SCREEN_H - 50, '✕ Close', {
      fontSize: '18px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeTxt.on('pointerdown', () => {
      this.showingShop = false;
      this.shopContainer?.destroy();
      this.shopContainer = undefined;
    });
    items.push(closeTxt);

    this.shopContainer = this.add.container(0, 0, items);
  }
}
