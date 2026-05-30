import Phaser from 'phaser';
import { SCREEN_W, TOP_BAR_H, SCREEN_H, BOTTOM_BAR_H } from '../constants';
import { EventBus } from '../systems/EventBus';
import { hpColor } from '../utils/MathUtils';

export class UIScene extends Phaser.Scene {
  private hpBar!: Phaser.GameObjects.Rectangle;
  private hpBg!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private manaBar!: Phaser.GameObjects.Rectangle;
  private floorText!: Phaser.GameObjects.Text;
  private soulsText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private messageTween?: Phaser.Tweens.Tween;

  private maxHP = 100;
  private currentHP = 100;
  private maxMana = 50;
  private currentMana = 50;

  constructor() { super({ key: 'UIScene', active: false }); }

  create(): void {
    // Top bar background
    this.add.rectangle(SCREEN_W / 2, TOP_BAR_H / 2, SCREEN_W, TOP_BAR_H, 0x0d0d1a, 0.95).setDepth(50);
    this.add.rectangle(SCREEN_W / 2, TOP_BAR_H, SCREEN_W, 2, 0x222244).setDepth(50);

    // Bottom bar background
    this.add.rectangle(SCREEN_W / 2, SCREEN_H - BOTTOM_BAR_H / 2, SCREEN_W, BOTTOM_BAR_H, 0x0d0d1a, 0.95).setDepth(50);
    this.add.rectangle(SCREEN_W / 2, SCREEN_H - BOTTOM_BAR_H, SCREEN_W, 2, 0x222244).setDepth(50);

    // Floor label
    this.floorText = this.add.text(12, 14, 'Floor 1', {
      fontSize: '16px', color: '#aaaadd', fontFamily: 'monospace',
    }).setDepth(51);

    // Souls
    this.soulsText = this.add.text(SCREEN_W - 12, 14, '⬡ 0', {
      fontSize: '16px', color: '#88ccff', fontFamily: 'monospace',
    }).setOrigin(1, 0).setDepth(51);

    // HP bar
    const barW = 220;
    const barX = SCREEN_W / 2 - barW / 2;
    this.add.text(barX, 14, 'HP', { fontSize: '12px', color: '#888888', fontFamily: 'monospace' }).setDepth(51);
    this.hpBg = this.add.rectangle(SCREEN_W / 2, 36, barW, 14, 0x220000).setDepth(51);
    this.hpBar = this.add.rectangle(barX, 36, barW, 14, 0x44cc44)
      .setOrigin(0, 0.5).setDepth(52);
    this.hpText = this.add.text(SCREEN_W / 2, 36, '100/100', {
      fontSize: '11px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(53);

    // Mana bar
    this.add.text(barX, 52, 'MP', { fontSize: '12px', color: '#888888', fontFamily: 'monospace' }).setDepth(51);
    this.add.rectangle(SCREEN_W / 2, 64, barW, 8, 0x001133).setDepth(51);
    this.manaBar = this.add.rectangle(barX, 64, barW, 8, 0x4488ff)
      .setOrigin(0, 0.5).setDepth(52);
    void this.hpBg;

    // Message overlay
    this.messageText = this.add.text(SCREEN_W / 2, SCREEN_H / 2 - 40, '', {
      fontSize: '22px', color: '#ffff88', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(200).setAlpha(0);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    EventBus.on('player:statChanged', (data) => {
      if (!data) return;
      if (data.stat === 'hp') {
        this.currentHP = data.newValue;
        this.updateHPBar();
      }
    }, this);

    EventBus.on('floor:complete', (data) => {
      if (data) this.floorText.setText(`Floor ${data.floorNumber}`);
    }, this);

    EventBus.on('meta:soulsChanged', (data) => {
      if (data) this.soulsText.setText(`⬡ ${data.total}`);
    }, this);

    EventBus.on('ui:showMessage', (data) => {
      if (!data) return;
      this.showMessage(data.text, data.duration);
    }, this);
  }

  updateStats(hp: number, maxHP: number, mana: number, maxMana: number, floor: number, souls: number): void {
    this.currentHP = hp;
    this.maxHP = maxHP;
    this.currentMana = mana;
    this.maxMana = maxMana;
    this.floorText.setText(`Floor ${floor}`);
    this.soulsText.setText(`⬡ ${souls}`);
    this.updateHPBar();
    this.updateManaBar();
  }

  private updateHPBar(): void {
    const pct = this.maxHP > 0 ? this.currentHP / this.maxHP : 0;
    const barW = 220;
    this.hpBar.width = barW * pct;
    this.hpBar.fillColor = hpColor(pct);
    this.hpText.setText(`${Math.ceil(this.currentHP)}/${this.maxHP}`);
  }

  private updateManaBar(): void {
    const pct = this.maxMana > 0 ? this.currentMana / this.maxMana : 0;
    this.manaBar.width = 220 * pct;
  }

  updateMana(mana: number, maxMana: number): void {
    this.currentMana = mana;
    this.maxMana = maxMana;
    this.updateManaBar();
  }

  showMessage(text: string, duration = 2000): void {
    this.messageTween?.stop();
    this.messageText.setText(text).setAlpha(1);
    this.messageTween = this.tweens.add({
      targets: this.messageText,
      alpha: 0,
      delay: duration - 500,
      duration: 500,
    });
  }

  shutdown(): void {
    EventBus.off('player:statChanged', undefined, this);
    EventBus.off('floor:complete', undefined, this);
    EventBus.off('meta:soulsChanged', undefined, this);
    EventBus.off('ui:showMessage', undefined, this);
  }
}
