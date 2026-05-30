import Phaser from 'phaser';
import { SCREEN_W, SCREEN_H } from '../constants';

export class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }

  preload(): void {
    // Create a loading bar
    const bar = this.add.rectangle(SCREEN_W / 2 - 150, SCREEN_H / 2, 0, 20, 0x44cc88);
    const outline = this.add.rectangle(SCREEN_W / 2, SCREEN_H / 2, 300, 24, 0x000000)
      .setStrokeStyle(2, 0x44cc88);
    this.add.text(SCREEN_W / 2, SCREEN_H / 2 - 40, 'Loading...', {
      fontSize: '20px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.load.on('progress', (v: number) => {
      bar.width = 296 * v;
      bar.x = SCREEN_W / 2 - 150 + bar.width / 2;
    });

    // Generate all textures programmatically — no external art needed
    this.generateTextures();
  }

  private generateTextures(): void {
    // We generate all game graphics via Phaser's Graphics API
    // These are stored as named textures and used by game scenes

    const g = this.make.graphics({ x: 0, y: 0 });

    // --- Room tiles ---
    this.makeSquareTex(g, 'tile_floor', 16, 0x1a1a2a, 0x222233);
    this.makeSquareTex(g, 'tile_wall', 16, 0x333355, 0x44447a);

    // --- Player ---
    g.clear();
    g.fillStyle(0x66aaff);
    g.fillRoundedRect(0, 0, 28, 36, 6);
    // Eyes
    g.fillStyle(0xffffff);
    g.fillCircle(10, 12, 4);
    g.fillCircle(18, 12, 4);
    g.fillStyle(0x000033);
    g.fillCircle(11, 12, 2);
    g.fillCircle(19, 12, 2);
    g.generateTexture('player', 28, 36);

    // --- Enemy sizes ---
    this.makeEnemyTex(g, 'enemy_small', 24, 0xdd6644);
    this.makeEnemyTex(g, 'enemy_medium', 32, 0xcc5544);
    this.makeEnemyTex(g, 'enemy_large', 44, 0xbb4433);

    // --- Room type icons (used on map) ---
    this.makeIconTex(g, 'icon_combat', 20, 0xcc4444, '⚔');
    this.makeIconTex(g, 'icon_treasure', 20, 0xffcc00, '★');
    this.makeIconTex(g, 'icon_rest', 20, 0x44cc88, '♥');
    this.makeIconTex(g, 'icon_entrance', 20, 0x8888ff, '▶');
    this.makeIconTex(g, 'icon_exit', 20, 0xffffff, '✦');
    this.makeIconTex(g, 'icon_elite', 20, 0xff44ff, '☠');

    // --- Skill icons (colored circles with letter) ---
    const skillColors: Record<string, number> = {
      slash: 0xff8844, fireball: 0xff4400, heal: 0x44ff88,
      shield: 0x8888ff, poisonDart: 0x44cc44, quickStrike: 0xffff44,
      thunderbolt: 0xbbbbff, battleCry: 0xff8800,
    };
    for (const [id, color] of Object.entries(skillColors)) {
      g.clear();
      g.fillStyle(color);
      g.fillCircle(24, 24, 22);
      g.fillStyle(0x000000, 0.3);
      g.fillCircle(24, 24, 20);
      g.generateTexture(`skill_${id}`, 48, 48);
    }

    // --- UI elements ---
    g.clear();
    g.fillStyle(0x333366);
    g.fillRoundedRect(0, 0, 80, 80, 12);
    g.lineStyle(2, 0x6666aa);
    g.strokeRoundedRect(0, 0, 80, 80, 12);
    g.generateTexture('skill_btn_bg', 80, 80);

    g.clear();
    g.fillStyle(0x222244);
    g.fillRoundedRect(0, 0, 80, 80, 12);
    g.lineStyle(2, 0x6666aa);
    g.strokeRoundedRect(0, 0, 80, 80, 12);
    g.generateTexture('skill_btn_bg_cd', 80, 80);

    // Upgrade card backgrounds
    g.clear();
    g.fillStyle(0x1a1a2a);
    g.fillRoundedRect(0, 0, 200, 280, 12);
    g.lineStyle(3, 0x44aa66);
    g.strokeRoundedRect(0, 0, 200, 280, 12);
    g.generateTexture('card_common', 200, 280);

    g.clear();
    g.fillStyle(0x1a2a1a);
    g.fillRoundedRect(0, 0, 200, 280, 12);
    g.lineStyle(3, 0x44ff88);
    g.strokeRoundedRect(0, 0, 200, 280, 12);
    g.generateTexture('card_uncommon', 200, 280);

    g.clear();
    g.fillStyle(0x1a0a2a);
    g.fillRoundedRect(0, 0, 200, 280, 12);
    g.lineStyle(3, 0xaa44ff);
    g.strokeRoundedRect(0, 0, 200, 280, 12);
    g.generateTexture('card_rare', 200, 280);

    // Panel background
    g.clear();
    g.fillStyle(0x0d0d1a, 0.92);
    g.fillRoundedRect(0, 0, SCREEN_W, 80, 0);
    g.generateTexture('top_bar_bg', SCREEN_W, 80);

    g.clear();
    g.fillStyle(0x0d0d1a, 0.92);
    g.fillRoundedRect(0, 0, SCREEN_W, 220, 0);
    g.generateTexture('bottom_bar_bg', SCREEN_W, 220);

    // HP bar fill
    g.clear();
    g.fillStyle(0x44cc44);
    g.fillRect(0, 0, 200, 14);
    g.generateTexture('bar_hp', 200, 14);

    g.clear();
    g.fillStyle(0x4488ff);
    g.fillRect(0, 0, 200, 10);
    g.generateTexture('bar_mana', 200, 10);

    g.destroy();
  }

  private makeSquareTex(g: Phaser.GameObjects.Graphics, key: string, size: number, fill: number, stroke: number): void {
    g.clear();
    g.fillStyle(fill);
    g.fillRect(0, 0, size, size);
    g.lineStyle(1, stroke);
    g.strokeRect(0, 0, size, size);
    g.generateTexture(key, size, size);
  }

  private makeEnemyTex(g: Phaser.GameObjects.Graphics, key: string, size: number, color: number): void {
    g.clear();
    g.fillStyle(color);
    g.fillRoundedRect(0, 0, size, size, 4);
    g.fillStyle(0xffffff);
    const eyeY = Math.floor(size * 0.3);
    const eyeR = Math.max(2, Math.floor(size * 0.1));
    g.fillCircle(Math.floor(size * 0.33), eyeY, eyeR);
    g.fillCircle(Math.floor(size * 0.67), eyeY, eyeR);
    g.generateTexture(key, size, size);
  }

  private makeIconTex(g: Phaser.GameObjects.Graphics, key: string, size: number, color: number, _label: string): void {
    g.clear();
    g.fillStyle(color);
    g.fillCircle(size / 2, size / 2, size / 2);
    g.generateTexture(key, size, size);
  }

  create(): void {
    this.scene.start('MainMenuScene');
  }
}
