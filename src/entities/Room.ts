import { RuntimeEnemy } from './Enemy';

export type RoomType = 'entrance' | 'exit' | 'combat' | 'treasure' | 'rest' | 'elite';

export type RoomRect = {
  x: number; // tile coords
  y: number;
  w: number;
  h: number;
};

export type Room = {
  id: string;
  type: RoomType;
  rect: RoomRect;
  centerX: number;
  centerY: number;
  enemies: RuntimeEnemy[];
  cleared: boolean;
  visited: boolean;
  connections: string[]; // connected room ids
};

export type Corridor = {
  from: string;
  to: string;
  path: Array<{ x: number; y: number }>;
};

export type RoomGraph = {
  rooms: Map<string, Room>;
  corridors: Corridor[];
  entranceId: string;
  exitId: string;
};
