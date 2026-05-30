import Phaser from 'phaser';
import { SCREEN_W, SCREEN_H, TOP_BAR_H, BOTTOM_BAR_H, TILE_SIZE } from '../constants';
import { ProceduralGenerator } from '../systems/ProceduralGenerator';
import { Room, RoomGraph } from '../entities/Room';
import { Player, PlayerClass } from '../entities/Player';
import { SaveSystem } from '../systems/SaveSystem';
import { MetaProgressionSystem } from '../systems/MetaProgressionSystem';
import { EventBus } from '../systems/EventBus';
import { UIScene } from './UIScene';
import { makeSeed } from '../utils/RNG';
import { getBiome } from '../data/biomeDefinitions';

const MINIMAP_X = SCREEN_W - 80;
const MINIMAP_Y = TOP_BAR_H + 10;
const MINIMAP_W = 70;
const MINIMAP_H = 70;

interface DungeonSceneData {
  floor: number;
  seed: number;
  playerClass: PlayerClass;
  soulsThisRun: number;
  player?: Player;
}

export class DungeonScene extends Phaser.Scene {
  private floor = 1;
  private seed = 0;
  private soulsThisRun = 0;
  private graph!: RoomGraph;
  private player!: Player;
  private currentRoomId = '';
  private roomGraphics!: Phaser.GameObjects.Graphics;
  private minimapGraphics!: Phaser.GameObjects.Graphics;
  private roomButtons = new Map<string, Phaser.GameObjects.Rectangle>();
  private roomLabels = new Map<string, Phaser.GameObjects.Text>();
  private infoText!: Phaser.GameObjects.Text;

  constructor() { super({ key: 'DungeonScene' }); }

  init(data: DungeonSceneData): void {
    this.floor = data.floor ?? 1;
    this.seed = data.seed ?? makeSeed();
    this.soulsThisRun = data.soulsThisRun ?? 0;

    if (data.player) {
      this.player = data.player;
    } else {
      const saveData = SaveSystem.load();
      const bonuses = MetaProgressionSystem.computeBonuses(saveData.unlockedNodes);
      this.player = new Player(data.playerClass ?? 'warrior', bonuses.hpBonus, bonuses.atkBonus);
    }
  }

  create(): void {
    const biome = getBiome(this.floor);

    // Background
    this.add.rectangle(SCREEN_W / 2, SCREEN_H / 2, SCREEN_W, SCREEN_H, biome.bgColor);

    // Generate dungeon
    const gen = new ProceduralGenerator(this.floor, this.seed);
    this.graph = gen.generateFloor();
    this.currentRoomId = this.graph.entranceId;

    // Graphics layers
    this.roomGraphics = this.add.graphics();
    this.minimapGraphics = this.add.graphics().setDepth(60);

    // Render dungeon map in the content area
    this.renderDungeonMap();

    // Info panel at bottom
    this.infoText = this.add.text(SCREEN_W / 2, SCREEN_H - BOTTOM_BAR_H + 16, '', {
      fontSize: '14px', color: '#cccccc', fontFamily: 'monospace',
      wordWrap: { width: SCREEN_W - 20 }, align: 'center',
    }).setOrigin(0.5, 0).setDepth(55);

    // Minimap background
    this.add.rectangle(MINIMAP_X + MINIMAP_W / 2, MINIMAP_Y + MINIMAP_H / 2 + 2,
      MINIMAP_W + 8, MINIMAP_H + 8, 0x000000, 0.8)
      .setStrokeStyle(1, 0x333366).setDepth(59);

    this.renderMinimap();
    this.updateRoomVisuals();
    this.showCurrentRoomInfo();

    // Connect EventBus
    EventBus.emit('floor:complete', { floorNumber: this.floor });

    // Update UI
    const ui = this.scene.get('UIScene') as UIScene;
    if (ui?.scene.isActive()) {
      ui.updateStats(
        this.player.stats.hp, this.player.stats.maxHP,
        this.player.mana, this.player.stats.maxMana,
        this.floor, this.soulsThisRun,
      );
    }
  }

  private renderDungeonMap(): void {
    const contentY = TOP_BAR_H;
    const contentH = SCREEN_H - TOP_BAR_H - BOTTOM_BAR_H;
    const contentW = SCREEN_W;

    // Find bounding box of all rooms
    const rooms = [...this.graph.rooms.values()];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const r of rooms) {
      minX = Math.min(minX, r.rect.x);
      minY = Math.min(minY, r.rect.y);
      maxX = Math.max(maxX, r.rect.x + r.rect.w);
      maxY = Math.max(maxY, r.rect.y + r.rect.h);
    }

    const mapW = (maxX - minX) * TILE_SIZE;
    const mapH = (maxY - minY) * TILE_SIZE;
    const scaleX = (contentW - 40) / mapW;
    const scaleY = (contentH - 40) / mapH;
    const scale = Math.min(scaleX, scaleY, 1.5);

    const offsetX = (contentW - mapW * scale) / 2;
    const offsetY = contentY + (contentH - mapH * scale) / 2;

    const toScreen = (tx: number, ty: number) => ({
      sx: offsetX + (tx - minX) * TILE_SIZE * scale,
      sy: offsetY + (ty - minY) * TILE_SIZE * scale,
    });

    const g = this.roomGraphics;
    g.clear();

    // Draw corridors
    g.lineStyle(Math.max(2, 3 * scale), 0x223322, 0.7);
    for (const corridor of this.graph.corridors) {
      const fromRoom = this.graph.rooms.get(corridor.from)!;
      const toRoom = this.graph.rooms.get(corridor.to)!;
      const from = toScreen(fromRoom.centerX, fromRoom.centerY);
      const to = toScreen(toRoom.centerX, toRoom.centerY);
      g.lineBetween(from.sx, from.sy, to.sx, to.sy);
    }

    // Clear old buttons/labels
    this.roomButtons.forEach(b => b.destroy());
    this.roomLabels.forEach(l => l.destroy());
    this.roomButtons.clear();
    this.roomLabels.clear();

    // Draw rooms
    for (const room of rooms) {
      const { sx, sy } = toScreen(room.rect.x, room.rect.y);
      const rw = room.rect.w * TILE_SIZE * scale;
      const rh = room.rect.h * TILE_SIZE * scale;

      const fillColor = this.roomFillColor(room);
      const strokeColor = this.roomStrokeColor(room);

      g.fillStyle(fillColor, 0.9);
      g.fillRoundedRect(sx, sy, rw, rh, 4);
      g.lineStyle(2, strokeColor);
      g.strokeRoundedRect(sx, sy, rw, rh, 4);

      const cx = sx + rw / 2;
      const cy = sy + rh / 2;

      // Clickable button overlay
      const btn = this.add.rectangle(cx, cy, rw, rh, 0xffffff, 0)
        .setInteractive({ useHandCursor: true })
        .setDepth(10);
      btn.on('pointerdown', () => this.tryEnterRoom(room.id));
      btn.on('pointerover', () => { if (room.id !== this.currentRoomId) btn.setFillStyle(0xffffff, 0.08); });
      btn.on('pointerout', () => btn.setFillStyle(0xffffff, 0));
      this.roomButtons.set(room.id, btn);

      // Room icon
      const icon = this.roomIcon(room);
      const lbl = this.add.text(cx, cy, icon, {
        fontSize: `${Math.max(10, 14 * scale)}px`,
        color: '#ffffff', fontFamily: 'monospace',
      }).setOrigin(0.5).setDepth(11);
      this.roomLabels.set(room.id, lbl);
    }
  }

  private roomFillColor(room: Room): number {
    if (room.id === this.currentRoomId) return 0x335577;
    if (room.cleared) return 0x112211;
    if (!room.visited) return 0x1a1a2a;
    switch (room.type) {
      case 'entrance': return 0x223344;
      case 'exit': return 0x332233;
      case 'treasure': return 0x333211;
      case 'rest': return 0x113322;
      case 'elite': return 0x331133;
      default: return 0x221a1a;
    }
  }

  private roomStrokeColor(room: Room): number {
    if (room.id === this.currentRoomId) return 0x88ccff;
    switch (room.type) {
      case 'entrance': return 0x8888ff;
      case 'exit': return 0xffffff;
      case 'treasure': return 0xffcc00;
      case 'rest': return 0x44cc88;
      case 'elite': return 0xff44ff;
      default: return room.cleared ? 0x334433 : 0x445544;
    }
  }

  private roomIcon(room: Room): string {
    if (!room.visited && room.id !== this.currentRoomId && room.type !== 'entrance') return '?';
    switch (room.type) {
      case 'entrance': return '▶';
      case 'exit': return '✦';
      case 'treasure': return '★';
      case 'rest': return '♥';
      case 'elite': return '☠';
      default: return room.cleared ? '✓' : '⚔';
    }
  }

  private tryEnterRoom(roomId: string): void {
    if (roomId === this.currentRoomId) return;
    const currentRoom = this.graph.rooms.get(this.currentRoomId)!;

    // Can only move to adjacent rooms
    if (!currentRoom.connections.includes(roomId)) {
      EventBus.emit('ui:showMessage', { text: 'Not adjacent!', duration: 1000 });
      return;
    }

    // Must clear current room first
    if ((currentRoom.type === 'combat' || currentRoom.type === 'elite') && !currentRoom.cleared) {
      EventBus.emit('ui:showMessage', { text: 'Clear this room first!', duration: 1200 });
      return;
    }

    this.currentRoomId = roomId;
    const room = this.graph.rooms.get(roomId)!;
    room.visited = true;

    this.updateRoomVisuals();
    this.showCurrentRoomInfo();

    switch (room.type) {
      case 'combat':
      case 'elite':
        if (!room.cleared) this.startCombat(room);
        break;
      case 'treasure':
        if (!room.cleared) this.handleTreasure(room);
        break;
      case 'rest':
        if (!room.cleared) this.handleRest(room);
        break;
      case 'exit':
        this.goToNextFloor();
        break;
    }
  }

  private startCombat(room: Room): void {
    this.scene.pause('DungeonScene');
    this.scene.launch('CombatScene', {
      room,
      player: this.player,
      floor: this.floor,
      soulsThisRun: this.soulsThisRun,
    });

    this.scene.get('CombatScene').events.once('combatVictory', (data: { souls: number; xp: number }) => {
      room.cleared = true;
      this.soulsThisRun += data.souls;
      this.player.gainXP(data.xp);
      this.scene.resume('DungeonScene');
      this.renderDungeonMap();
      this.updateRoomVisuals();
      this.showCurrentRoomInfo();
      const ui = this.scene.get('UIScene') as UIScene;
      if (ui?.scene.isActive()) {
        ui.updateStats(this.player.stats.hp, this.player.stats.maxHP,
          this.player.mana, this.player.stats.maxMana, this.floor, this.soulsThisRun);
      }
    });

    this.scene.get('CombatScene').events.once('combatDefeat', () => {
      SaveSystem.recordRun(this.floor, this.soulsThisRun);
      this.scene.stop('DungeonScene');
      this.scene.stop('UIScene');
      this.scene.start('GameOverScene', { floor: this.floor, souls: this.soulsThisRun });
    });
  }

  private handleTreasure(room: Room): void {
    room.cleared = true;
    this.scene.pause('DungeonScene');
    this.scene.launch('UpgradeScene', {
      player: this.player,
      floor: this.floor,
      seed: makeSeed(),
      isTreasure: true,
    });
    this.scene.get('UpgradeScene').events.once('upgradeDone', () => {
      this.scene.resume('DungeonScene');
      this.renderDungeonMap();
      this.updateRoomVisuals();
    });
  }

  private handleRest(room: Room): void {
    room.cleared = true;
    const healAmt = Math.round(this.player.stats.maxHP * 0.30);
    this.player.heal(healAmt);
    EventBus.emit('ui:showMessage', { text: `Rested! +${healAmt} HP`, duration: 2000 });
    const ui = this.scene.get('UIScene') as UIScene;
    if (ui?.scene.isActive()) {
      ui.updateStats(this.player.stats.hp, this.player.stats.maxHP,
        this.player.mana, this.player.stats.maxMana, this.floor, this.soulsThisRun);
    }
    this.renderDungeonMap();
    this.updateRoomVisuals();
  }

  private goToNextFloor(): void {
    const nextFloor = this.floor + 1;
    SaveSystem.recordRun(nextFloor, 0); // Update best floor tracking
    this.scene.pause('DungeonScene');
    this.scene.launch('UpgradeScene', {
      player: this.player,
      floor: this.floor,
      seed: makeSeed(),
      isTreasure: false,
    });
    this.scene.get('UpgradeScene').events.once('upgradeDone', () => {
      this.scene.stop('DungeonScene');
      this.scene.start('DungeonScene', {
        floor: nextFloor,
        seed: makeSeed(),
        playerClass: this.player.class,
        soulsThisRun: this.soulsThisRun,
        player: this.player,
      });
    });
  }

  private updateRoomVisuals(): void {
    this.renderMinimap();
  }

  private renderMinimap(): void {
    const g = this.minimapGraphics;
    g.clear();

    g.fillStyle(0x000000, 0.7);
    g.fillRect(MINIMAP_X - 2, MINIMAP_Y - 2, MINIMAP_W + 4, MINIMAP_H + 4);

    const rooms = [...this.graph.rooms.values()];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const r of rooms) {
      minX = Math.min(minX, r.rect.x); minY = Math.min(minY, r.rect.y);
      maxX = Math.max(maxX, r.rect.x + r.rect.w); maxY = Math.max(maxY, r.rect.y + r.rect.h);
    }

    const scaleX = MINIMAP_W / ((maxX - minX) * TILE_SIZE);
    const scaleY = MINIMAP_H / ((maxY - minY) * TILE_SIZE);
    const scale = Math.min(scaleX, scaleY);

    for (const room of rooms) {
      if (!room.visited && room.id !== this.currentRoomId) continue;
      const rx = MINIMAP_X + (room.rect.x - minX) * TILE_SIZE * scale;
      const ry = MINIMAP_Y + (room.rect.y - minY) * TILE_SIZE * scale;
      const rw = Math.max(3, room.rect.w * TILE_SIZE * scale);
      const rh = Math.max(3, room.rect.h * TILE_SIZE * scale);

      const color = room.id === this.currentRoomId ? 0x88ccff
        : room.cleared ? 0x224422
        : this.roomStrokeColor(room);
      g.fillStyle(color, 0.9);
      g.fillRect(rx, ry, rw, rh);
    }

    // Player dot
    const curRoom = this.graph.rooms.get(this.currentRoomId)!;
    const px = MINIMAP_X + (curRoom.centerX - minX) * TILE_SIZE * scale;
    const py = MINIMAP_Y + (curRoom.centerY - minY) * TILE_SIZE * scale;
    g.fillStyle(0xffffff);
    g.fillCircle(px, py, 3);
  }

  private showCurrentRoomInfo(): void {
    const room = this.graph.rooms.get(this.currentRoomId)!;
    const lines: string[] = [];
    switch (room.type) {
      case 'entrance': lines.push('Dungeon Entrance', 'Find the exit to descend deeper.'); break;
      case 'exit': lines.push('Floor Exit', 'Tap to descend to the next floor.'); break;
      case 'combat': lines.push(
        room.cleared ? 'Cleared Room' : `Combat Room  [${room.enemies.length} enemies]`,
        room.cleared ? '' : 'Tap to fight!',
      ); break;
      case 'elite': lines.push(
        room.cleared ? 'Elite Cleared' : `ELITE ROOM  [Boss encounter!]`,
        room.cleared ? '' : '⚠ Powerful enemy ahead!',
      ); break;
      case 'treasure': lines.push(room.cleared ? 'Empty Chest' : '★ Treasure Room', room.cleared ? '' : 'Tap to claim reward!'); break;
      case 'rest': lines.push(room.cleared ? 'Resting Place' : '♥ Rest Area', room.cleared ? '' : 'Tap to heal 30% HP.'); break;
    }
    this.infoText.setText(lines.join('\n'));
  }
}
