import { SAVE_KEY } from '../constants';

export type SaveData = {
  totalSouls: number;
  unlockedNodes: string[];
  totalRuns: number;
  bestFloor: number;
  unlockedClasses: string[];
  bestiary: string[]; // discovered enemy archetype ids
};

const DEFAULT_SAVE: SaveData = {
  totalSouls: 0,
  unlockedNodes: [],
  totalRuns: 0,
  bestFloor: 0,
  unlockedClasses: ['warrior'],
  bestiary: [],
};

export const SaveSystem = {
  load(): SaveData {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return { ...DEFAULT_SAVE };
      return { ...DEFAULT_SAVE, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_SAVE };
    }
  },

  save(data: SaveData): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      // Ignore storage errors (private browsing, quota)
    }
  },

  addSouls(amount: number): SaveData {
    const data = this.load();
    data.totalSouls += amount;
    this.save(data);
    return data;
  },

  spendSouls(amount: number): boolean {
    const data = this.load();
    if (data.totalSouls < amount) return false;
    data.totalSouls -= amount;
    this.save(data);
    return true;
  },

  unlockNode(nodeId: string): void {
    const data = this.load();
    if (!data.unlockedNodes.includes(nodeId)) {
      data.unlockedNodes.push(nodeId);
      this.save(data);
    }
  },

  recordRun(floorReached: number, soulsEarned: number): void {
    const data = this.load();
    data.totalRuns++;
    data.bestFloor = Math.max(data.bestFloor, floorReached);
    data.totalSouls += soulsEarned;
    this.save(data);
  },

  discoverEnemy(archetypeId: string): void {
    const data = this.load();
    if (!data.bestiary.includes(archetypeId)) {
      data.bestiary.push(archetypeId);
      this.save(data);
    }
  },

  unlockClass(className: string): void {
    const data = this.load();
    if (!data.unlockedClasses.includes(className)) {
      data.unlockedClasses.push(className);
      this.save(data);
    }
  },
};
