import Phaser from 'phaser';
import { SCREEN_W, SCREEN_H } from './constants';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { DungeonScene } from './scenes/DungeonScene';
import { CombatScene } from './scenes/CombatScene';
import { UpgradeScene } from './scenes/UpgradeScene';
import { GameOverScene } from './scenes/GameOverScene';
import { UIScene } from './scenes/UIScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: SCREEN_W,
  height: SCREEN_H,
  backgroundColor: '#060610',
  parent: 'game',
  scene: [
    BootScene,
    MainMenuScene,
    DungeonScene,
    CombatScene,
    UpgradeScene,
    GameOverScene,
    UIScene,
  ],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
  render: {
    antialias: false,
    pixelArt: false,
    roundPixels: true,
  },
  input: {
    activePointers: 4, // multi-touch support
  },
};

new Phaser.Game(config);
