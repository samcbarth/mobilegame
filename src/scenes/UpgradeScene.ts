import Phaser from 'phaser';
import { SCREEN_W, SCREEN_H } from '../constants';
import { Player } from '../entities/Player';
import { UpgradeSystem } from '../systems/UpgradeSystem';
import { UpgradeCard } from '../data/upgradeCards';
import { makeSeed } from '../utils/RNG';

interface UpgradeData {
  player: Player;
  floor: number;
  seed: number;
  isTreasure: boolean;
}

export class UpgradeScene extends Phaser.Scene {
  private player!: Player;
  private floor = 1;
  private cards: UpgradeCard[] = [];
  private isTreasure = false;

  constructor() { super({ key: 'UpgradeScene' }); }

  init(data: UpgradeData): void {
    this.player = data.player;
    this.floor = data.floor;
    this.isTreasure = data.isTreasure ?? false;
    this.cards = UpgradeSystem.drawCards(this.player.ownedCardIds, this.floor, data.seed ?? makeSeed(), 3);
  }

  create(): void {
    // Dim overlay
    this.add.rectangle(SCREEN_W / 2, SCREEN_H / 2, SCREEN_W, SCREEN_H, 0x000000, 0.88);

    // Title
    const title = this.isTreasure ? '★ TREASURE FOUND ★' : '⬆ CHOOSE UPGRADE';
    this.add.text(SCREEN_W / 2, 70, title, {
      fontSize: '24px', color: this.isTreasure ? '#ffcc00' : '#88ccff',
      fontFamily: 'monospace', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(SCREEN_W / 2, 108, `Floor ${this.floor} complete!`, {
      fontSize: '14px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5);

    if (this.cards.length === 0) {
      this.add.text(SCREEN_W / 2, SCREEN_H / 2, 'No more upgrades available!', {
        fontSize: '16px', color: '#888888', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.time.delayedCall(1500, () => this.finish());
      return;
    }

    this.renderCards();
  }

  private renderCards(): void {
    const cardW = 170;
    const cardH = 260;
    const gap = 12;
    const totalW = this.cards.length * cardW + (this.cards.length - 1) * gap;
    const startX = SCREEN_W / 2 - totalW / 2 + cardW / 2;
    const cardY = SCREEN_H / 2 + 30;

    this.cards.forEach((card, i) => {
      const x = startX + i * (cardW + gap);
      this.createCardButton(card, x, cardY, cardW, cardH);
    });

    this.add.text(SCREEN_W / 2, SCREEN_H - 60, 'Tap a card to select it', {
      fontSize: '13px', color: '#555555', fontFamily: 'monospace',
    }).setOrigin(0.5);
  }

  private createCardButton(card: UpgradeCard, x: number, y: number, w: number, h: number): void {
    const rarityColor = UpgradeSystem.rarityColor(card.rarity);

    // Card background
    const bg = this.add.rectangle(x, y, w, h, 0x111122)
      .setStrokeStyle(3, rarityColor)
      .setInteractive({ useHandCursor: true });

    // Rarity badge
    const rarityLabel = card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1);
    this.add.text(x, y - h / 2 + 16, rarityLabel, {
      fontSize: '11px', color: `#${rarityColor.toString(16).padStart(6, '0')}`,
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Card name
    this.add.text(x, y - h / 2 + 42, card.name, {
      fontSize: '14px', color: '#ffffff', fontFamily: 'monospace',
      wordWrap: { width: w - 16 }, align: 'center',
    }).setOrigin(0.5);

    // Divider
    this.add.rectangle(x, y - h / 2 + 64, w - 20, 1, rarityColor, 0.5);

    // Description
    this.add.text(x, y - h / 2 + 90, card.description, {
      fontSize: '11px', color: '#aaaaaa', fontFamily: 'monospace',
      wordWrap: { width: w - 20 }, align: 'center',
    }).setOrigin(0.5, 0);

    // Hover glow
    bg.on('pointerover', () => bg.setFillStyle(0x1a1a44));
    bg.on('pointerout', () => bg.setFillStyle(0x111122));
    bg.on('pointerdown', () => {
      bg.setFillStyle(0x223355);
      this.selectCard(card);
    });
  }

  private selectCard(card: UpgradeCard): void {
    this.player.applyCard(card);

    // Flash effect
    const flash = this.add.rectangle(SCREEN_W / 2, SCREEN_H / 2, SCREEN_W, SCREEN_H,
      UpgradeSystem.rarityColor(card.rarity), 0.3).setDepth(100);
    this.tweens.add({
      targets: flash, alpha: 0, duration: 400,
      onComplete: () => { flash.destroy(); this.finish(); },
    });
  }

  private finish(): void {
    this.scene.stop('UpgradeScene');
    this.events.emit('upgradeDone');
  }
}
