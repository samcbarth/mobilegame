import { RNG } from '../utils/RNG';
import { Room, RoomGraph, RoomType, Corridor, RoomRect } from '../entities/Room';
import { RuntimeEnemy, createRuntimeEnemy } from '../entities/Enemy';
import { ENEMY_TEMPLATES, ENEMY_MODIFIERS, EnemyModifier, MODIFIER_ADJECTIVES } from '../data/enemyTemplates';
import { getBiome } from '../data/biomeDefinitions';
import {
  ROOM_COUNT_BASE, ROOM_COUNT_PER_FLOORS, ROOM_COUNT_MAX,
  ENEMIES_PER_ROOM_BASE, ENEMIES_PER_ROOM_SCALE, ENEMIES_PER_ROOM_MAX,
  ELITE_CHANCE_PER_FLOOR, ELITE_CHANCE_MAX, ENEMY_STAT_SCALE_PER_FLOOR,
} from '../constants';

const GRID_W = 60;
const GRID_H = 60;
const MIN_ROOM_SIZE = 6;
const MAX_ROOM_SIZE = 14;
const ROOM_PADDING = 1;

type Partition = { x: number; y: number; w: number; h: number };

let uidCounter = 0;
const uid = () => `room_${++uidCounter}`;
const enemyUid = () => `enemy_${++uidCounter}`;

export class ProceduralGenerator {
  private rng: RNG;
  private floor: number;

  constructor(floor: number, seed: number) {
    this.floor = floor;
    this.rng = new RNG(seed ^ (floor * 0x9e3779b9));
  }

  generateFloor(): RoomGraph {
    const targetRooms = Math.min(
      ROOM_COUNT_BASE + Math.floor(this.floor / ROOM_COUNT_PER_FLOORS),
      ROOM_COUNT_MAX,
    );

    const partitions = this.bsp({ x: 1, y: 1, w: GRID_W - 2, h: GRID_H - 2 }, targetRooms);
    const rooms = partitions.map(p => this.partitionToRoom(p));

    // Build adjacency by proximity (rooms that share corridor endpoints)
    const connected = this.connectRooms(rooms);

    // Assign types
    this.assignRoomTypes(connected);

    // Populate enemies
    for (const room of connected.values()) {
      if (room.type === 'combat' || room.type === 'elite') {
        room.enemies = this.generateRoomEnemies(room.type === 'elite');
      }
    }

    const corridors = this.buildCorridors(connected);
    const entrance = [...connected.values()].find(r => r.type === 'entrance')!;
    const exit = [...connected.values()].find(r => r.type === 'exit')!;

    return { rooms: connected, corridors, entranceId: entrance.id, exitId: exit.id };
  }

  private bsp(space: Partition, targetCount: number): Partition[] {
    const leaves: Partition[] = [];
    const queue: Partition[] = [space];

    while (leaves.length + queue.length < targetCount && queue.length > 0) {
      const p = queue.shift()!;
      const canSplitH = p.h >= MIN_ROOM_SIZE * 2 + 2;
      const canSplitV = p.w >= MIN_ROOM_SIZE * 2 + 2;

      if (!canSplitH && !canSplitV) {
        leaves.push(p);
        continue;
      }

      const splitHorizontal = canSplitH && (!canSplitV || this.rng.next() < 0.5);

      if (splitHorizontal) {
        const splitY = this.rng.randInt(MIN_ROOM_SIZE + 1, p.h - MIN_ROOM_SIZE - 1);
        queue.push({ x: p.x, y: p.y, w: p.w, h: splitY });
        queue.push({ x: p.x, y: p.y + splitY, w: p.w, h: p.h - splitY });
      } else {
        const splitX = this.rng.randInt(MIN_ROOM_SIZE + 1, p.w - MIN_ROOM_SIZE - 1);
        queue.push({ x: p.x, y: p.y, w: splitX, h: p.h });
        queue.push({ x: p.x + splitX, y: p.y, w: p.w - splitX, h: p.h });
      }
    }

    // Remaining queue items become leaves too
    leaves.push(...queue);
    return leaves;
  }

  private partitionToRoom(p: Partition): Room {
    const pw = Math.max(MIN_ROOM_SIZE, Math.min(p.w - ROOM_PADDING * 2, MAX_ROOM_SIZE));
    const ph = Math.max(MIN_ROOM_SIZE, Math.min(p.h - ROOM_PADDING * 2, MAX_ROOM_SIZE));
    const rx = p.x + ROOM_PADDING + this.rng.randInt(0, Math.max(0, p.w - pw - ROOM_PADDING * 2));
    const ry = p.y + ROOM_PADDING + this.rng.randInt(0, Math.max(0, p.h - ph - ROOM_PADDING * 2));

    const rect: RoomRect = { x: rx, y: ry, w: pw, h: ph };
    return {
      id: uid(),
      type: 'combat',
      rect,
      centerX: rx + Math.floor(pw / 2),
      centerY: ry + Math.floor(ph / 2),
      enemies: [],
      cleared: false,
      visited: false,
      connections: [],
    };
  }

  private connectRooms(rooms: Room[]): Map<string, Room> {
    // Connect each room to its nearest unconnected neighbour (MST-like)
    const connected = new Map<string, Room>();
    rooms.forEach(r => connected.set(r.id, r));

    if (rooms.length < 2) return connected;

    // Prim's-style: start from first room, greedily add nearest
    const inTree = new Set<string>([rooms[0].id]);

    while (inTree.size < rooms.length) {
      let bestDist = Infinity;
      let bestA = '';
      let bestB = '';

      for (const aId of inTree) {
        const a = connected.get(aId)!;
        for (const room of rooms) {
          if (inTree.has(room.id)) continue;
          const dx = a.centerX - room.centerX;
          const dy = a.centerY - room.centerY;
          const dist = dx * dx + dy * dy;
          if (dist < bestDist) { bestDist = dist; bestA = aId; bestB = room.id; }
        }
      }

      if (!bestA || !bestB) break;
      connected.get(bestA)!.connections.push(bestB);
      connected.get(bestB)!.connections.push(bestA);
      inTree.add(bestB);
    }

    // Add a few extra connections for loops (better exploration feel)
    const roomArr = rooms.slice();
    const extraCount = Math.max(1, Math.floor(rooms.length / 4));
    for (let i = 0; i < extraCount; i++) {
      const a = this.rng.pick(roomArr);
      const b = this.rng.pick(roomArr);
      if (a.id !== b.id && !a.connections.includes(b.id)) {
        a.connections.push(b.id);
        b.connections.push(a.id);
      }
    }

    return connected;
  }

  private assignRoomTypes(rooms: Map<string, Room>): void {
    const arr = [...rooms.values()];

    // Entrance: room with most connections (hub) near start
    arr.sort((a, b) => b.connections.length - a.connections.length);
    arr[0].type = 'entrance';

    // Exit: farthest room from entrance by BFS depth
    const exitRoom = this.bfsFarthest(arr[0].id, rooms);
    exitRoom.type = 'exit';

    // Remaining: assign special rooms then fill with combat
    const remaining = arr.filter(r => r.type === 'combat');
    const shuffled = this.rng.shuffle(remaining);

    let idx = 0;
    // 1-2 treasure rooms
    const treasureCount = 1 + Math.floor(this.floor / 10);
    for (let i = 0; i < Math.min(treasureCount, shuffled.length - 1); i++) {
      shuffled[idx++].type = 'treasure';
    }
    // 1 rest room
    if (idx < shuffled.length - 1) shuffled[idx++].type = 'rest';
    // Elite rooms based on floor
    const eliteChance = Math.min(this.floor * ELITE_CHANCE_PER_FLOOR, ELITE_CHANCE_MAX);
    if (idx < shuffled.length - 1 && this.rng.next() < eliteChance) {
      shuffled[idx++].type = 'elite';
    }
    // Rest are combat
  }

  private bfsFarthest(startId: string, rooms: Map<string, Room>): Room {
    const dist = new Map<string, number>([[startId, 0]]);
    const queue = [startId];
    let farthestId = startId;
    let maxDist = 0;

    while (queue.length > 0) {
      const cur = queue.shift()!;
      const room = rooms.get(cur)!;
      for (const nId of room.connections) {
        if (!dist.has(nId)) {
          const d = (dist.get(cur) ?? 0) + 1;
          dist.set(nId, d);
          if (d > maxDist) { maxDist = d; farthestId = nId; }
          queue.push(nId);
        }
      }
    }
    return rooms.get(farthestId)!;
  }

  private generateRoomEnemies(isElite: boolean): RuntimeEnemy[] {
    const count = isElite
      ? 1
      : Math.min(
          ENEMIES_PER_ROOM_BASE + Math.floor(this.floor / ENEMIES_PER_ROOM_SCALE),
          ENEMIES_PER_ROOM_MAX,
        );

    const enemies: RuntimeEnemy[] = [];
    for (let i = 0; i < count; i++) {
      enemies.push(this.generateEnemy(isElite));
    }
    return enemies;
  }

  generateEnemy(isElite = false): RuntimeEnemy {
    const biome = getBiome(this.floor);
    const archetypeId = this.rng.pick(biome.enemyIds);
    const template = ENEMY_TEMPLATES[archetypeId];

    // Floor scaling
    const scale = (1 + (this.floor - 1) * ENEMY_STAT_SCALE_PER_FLOOR) * biome.statMultiplier;

    // Modifiers
    const modifierCount = isElite ? 2 : this.rng.randInt(0, 2);
    const mods = this.rng.shuffle([...ENEMY_MODIFIERS]).slice(0, modifierCount) as EnemyModifier[];

    let hp = Math.round(template.baseHP * scale);
    let atk = Math.round(template.baseATK * scale);
    let def = Math.round(template.baseDEF * scale);
    let spd = template.baseSPD;
    const abilities = [...template.abilities];

    for (const mod of mods) {
      switch (mod) {
        case 'armored': def = Math.round(def * 1.4); break;
        case 'swift': spd *= 1.5; break;
        case 'vampiric': abilities.push('lifeSteal'); break;
        case 'enraged': atk = Math.round(atk * 1.6); break;
        case 'shielded': hp = Math.round(hp * 1.3); break;
        case 'splitting': abilities.push('split'); break;
      }
    }

    if (isElite) {
      hp *= 3;
      atk = Math.round(atk * 2);
    }

    // Procedural name
    const adjective = mods.length > 0
      ? MODIFIER_ADJECTIVES[mods[0]]
      : this.rng.pick(biome.adjectives);
    const name = `${adjective} ${template.name}`;

    // Tint color shifted by modifiers
    let color = template.spriteColor;
    if (mods.includes('enraged')) color = blendColors(color, 0xff2200, 0.4);
    if (mods.includes('armored')) color = blendColors(color, 0x888888, 0.3);
    if (isElite) color = blendColors(color, 0xff00ff, 0.25);

    return createRuntimeEnemy({
      uid: enemyUid(),
      name,
      archetypeId,
      hp,
      maxHP: hp,
      atk,
      def,
      spd,
      abilities: [...new Set(abilities)],
      modifiers: mods,
      spriteColor: color,
      size: isElite ? 'large' : template.size,
      soulsValue: Math.round(template.soulsValue * scale * (isElite ? 3 : 1)),
      xpValue: Math.round(template.xpValue * scale * (isElite ? 3 : 1)),
      isBoss: isElite,
    });
  }

  private buildCorridors(rooms: Map<string, Room>): Corridor[] {
    const seen = new Set<string>();
    const corridors: Corridor[] = [];

    for (const room of rooms.values()) {
      for (const nId of room.connections) {
        const key = [room.id, nId].sort().join(':');
        if (seen.has(key)) continue;
        seen.add(key);
        const neighbor = rooms.get(nId)!;
        corridors.push({
          from: room.id,
          to: nId,
          path: lCorridor(room.centerX, room.centerY, neighbor.centerX, neighbor.centerY),
        });
      }
    }
    return corridors;
  }
}

function lCorridor(x1: number, y1: number, x2: number, y2: number): Array<{ x: number; y: number }> {
  const path: Array<{ x: number; y: number }> = [];
  // Horizontal then vertical
  const stepX = x1 < x2 ? 1 : -1;
  const stepY = y1 < y2 ? 1 : -1;
  for (let x = x1; x !== x2; x += stepX) path.push({ x, y: y1 });
  for (let y = y1; y !== y2; y += stepY) path.push({ x: x2, y });
  path.push({ x: x2, y: y2 });
  return path;
}

function blendColors(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bv = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bv;
}
