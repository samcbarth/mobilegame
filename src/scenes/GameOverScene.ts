import Phaser from 'phaser';
import { SCREEN_W, SCREEN_H } from '../constants';
import { SaveSystem } from '../systems/SaveSystem';
import { EventBus } from '../systems/EventBus';

interface GameOverData {
  floor: number;
  souls: number;
}

export class GameOverScene extends Phaser.Scene {
  constructor() { super({ key: 'GameOverScene' }); }

  create(data: GameOverData): void {
    const floor = data?.floor ?? 1;
    const souls = data?.souls ?? 0;
    const saveData = SaveSystem.load();

    // Background
    this.add.rectangle(SCREEN_W / 2, SCREEN_H / 2, SCREEN_W, SCREEN_H, 0x04040a);

    // Red vignette effect
    const vignette = this.add.rectangle(SCREEN_W / 2, SCREEN_H / 2, SCREEN_W, SCREEN_H, 0x440000, 0);
    this.tweens.add({ targets: vignette, alpha: 0.3, duration: 1200, ease: 'Power2' });

    // Game Over title
    const title = this.add.text(SCREEN_W / 2, 160, 'YOU DIED', {
      fontSize: '56px', color: '#cc2222', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({ targets: title, alpha: 1, y: 180, duration: 800, ease: 'Power2' });

    // Stats
    const statsY = 300;
    const statLines = [
      { label: 'Floor Reached', value: `${floor}`, color: '#ffffff' },
      { label: 'Souls Earned', value: `⬡ ${souls}`, color: '#88ccff' },
      { label: 'Best Floor', value: `${saveData.bestFloor}`, color: '#ffcc00' },
      { label: 'Total Runs', value: `${saveData.totalRuns}`, color: '#aaaaaa' },
    ];

    statLines.forEach(({ label, value, color }, i) => {
      const y = statsY + i * 48;
      const row = this.add.container(SCREEN_W / 2, y).setAlpha(0);
      row.add(this.add.text(-SCREEN_W / 4, 0, label, {
        fontSize: '16px', color: '#888888', fontFamily: 'monospace',
      }).setOrigin(0, 0.5));
      row.add(this.add.text(SCREEN_W / 4, 0, value, {
        fontSize: '18px', color, fontFamily: 'monospace',
      }).setOrigin(1, 0.5));
      this.tweens.add({ targets: row, alpha: 1, delay: 400 + i * 150, duration: 400 });
    });

    // Souls collected message
    this.add.text(SCREEN_W / 2, 530, `+${souls} souls added to your collection`, {
      fontSize: '13px', color: '#556677', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Buttons
    this.time.delayedCall(800, () => {
      this.makeButton(SCREEN_W / 2, 640, 'Play Again', 0x226644, () => {
        this.scene.start('MainMenuScene');
      });

      this.makeButton(SCREEN_W / 2, 710, 'Upgrade Tree', 0x224466, () => {
        this.scene.start('MainMenuScene');
        // The main menu will handle showing the shop
      });
    });

    // Notify soul total changed
    EventBus.emit('meta:soulsChanged', { total: saveData.totalSouls });
  }

  private makeButton(x: number, y: number, label: string, color: number, cb: () => void): void {
    const bg = this.add.rectangle(x, y, 240, 56, color)
      .setStrokeStyle(2, 0xffffff, 0.4)
      .setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, y, label, {
      fontSize: '20px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    bg.on('pointerdown', () => { bg.setAlpha(0.7); });
    bg.on('pointerup', () => { bg.setAlpha(1); cb(); });
    bg.on('pointerout', () => { bg.setAlpha(1); });
    void txt;
  }
}
