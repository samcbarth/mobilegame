import Phaser from 'phaser';

export type EventMap = {
  'combat:start': { enemyIds: string[] };
  'combat:victory': { xp: number; souls: number; gold: number };
  'combat:defeat': undefined;
  'upgrade:selected': { cardId: string };
  'floor:complete': { floorNumber: number };
  'player:statChanged': { stat: string; newValue: number };
  'player:died': undefined;
  'enemy:died': { enemyId: string };
  'skill:used': { skillId: string };
  'meta:soulsChanged': { total: number };
  'ui:showMessage': { text: string; duration?: number };
};

class TypedEventBus extends Phaser.Events.EventEmitter {
  emit<K extends keyof EventMap>(event: K, data?: EventMap[K]): boolean {
    return super.emit(event as string, data);
  }

  on<K extends keyof EventMap>(event: K, fn: (data: EventMap[K]) => void, context?: unknown): this {
    return super.on(event as string, fn, context);
  }

  once<K extends keyof EventMap>(event: K, fn: (data: EventMap[K]) => void, context?: unknown): this {
    return super.once(event as string, fn, context);
  }

  off<K extends keyof EventMap>(event: K, fn?: (data: EventMap[K]) => void, context?: unknown): this {
    return super.off(event as string, fn, context);
  }
}

export const EventBus = new TypedEventBus();
