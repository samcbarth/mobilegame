import Phaser from 'phaser';

export type DamageNumberConfig = {
  scene: Phaser.Scene;
  x: number;
  y: number;
  amount: number;
  isCrit: boolean;
  isHeal: boolean;
  isPoison: boolean;
};

export function spawnDamageNumber(cfg: DamageNumberConfig): void {
  const color = cfg.isHeal ? '#44ff88' : cfg.isPoison ? '#88ff44' : cfg.isCrit ? '#ffff44' : '#ffffff';
  const size = cfg.isCrit ? 22 : 16;
  const prefix = cfg.isHeal ? '+' : '-';
  const text = cfg.scene.add.text(cfg.x, cfg.y, `${prefix}${cfg.amount}`, {
    fontSize: `${size}px`,
    color,
    stroke: '#000000',
    strokeThickness: 3,
    fontFamily: 'monospace',
  }).setOrigin(0.5).setDepth(100);

  cfg.scene.tweens.add({
    targets: text,
    y: cfg.y - 60,
    alpha: 0,
    scaleX: cfg.isCrit ? 1.4 : 1,
    scaleY: cfg.isCrit ? 1.4 : 1,
    duration: 900,
    ease: 'Power2',
    onComplete: () => text.destroy(),
  });
}
