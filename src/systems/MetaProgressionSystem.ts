import { SaveSystem } from './SaveSystem';

export type MetaNode = {
  id: string;
  name: string;
  description: string;
  cost: number; // souls
  requires?: string; // prerequisite node id
  branch: number;
  reward: {
    hpBonus?: number;
    atkBonus?: number;
    startingCardQuality?: 'common' | 'uncommon';
    unlockClass?: string;
  };
};

export const META_TREE: MetaNode[] = [
  // Branch 0 — HP
  { id: 'hp1', name: 'Sturdy', description: '+20 starting max HP', cost: 10, branch: 0,
    reward: { hpBonus: 20 } },
  { id: 'hp2', name: 'Hardy', description: '+30 more starting max HP', cost: 25, requires: 'hp1', branch: 0,
    reward: { hpBonus: 30 } },
  { id: 'hp3', name: 'Ironclad', description: '+50 more starting max HP', cost: 60, requires: 'hp2', branch: 0,
    reward: { hpBonus: 50 } },

  // Branch 1 — ATK
  { id: 'atk1', name: 'Aggressive', description: '+3 starting ATK', cost: 10, branch: 1,
    reward: { atkBonus: 3 } },
  { id: 'atk2', name: 'Warrior\'s Blood', description: '+5 more starting ATK', cost: 25, requires: 'atk1', branch: 1,
    reward: { atkBonus: 5 } },
  { id: 'atk3', name: 'Berserker\'s Gift', description: '+10 more starting ATK', cost: 60, requires: 'atk2', branch: 1,
    reward: { atkBonus: 10 } },

  // Branch 2 — Card quality
  { id: 'card1', name: 'Prepared', description: 'Start each run with a random Common upgrade card.', cost: 15, branch: 2,
    reward: { startingCardQuality: 'common' } },
  { id: 'card2', name: 'Well Equipped', description: 'Starting card is Uncommon quality.', cost: 40, requires: 'card1', branch: 2,
    reward: { startingCardQuality: 'uncommon' } },

  // Branch 3 — Class unlocks
  { id: 'class_mage', name: 'Arcane Studies', description: 'Unlock the Mage class.', cost: 30, branch: 3,
    reward: { unlockClass: 'mage' } },
  { id: 'class_rogue', name: 'Shadow Training', description: 'Unlock the Rogue class.', cost: 50, requires: 'class_mage', branch: 3,
    reward: { unlockClass: 'rogue' } },
];

export type ComputedMetaBonuses = {
  hpBonus: number;
  atkBonus: number;
  startingCardQuality: 'common' | 'uncommon' | null;
};

export const MetaProgressionSystem = {
  computeBonuses(unlockedNodes: string[]): ComputedMetaBonuses {
    const set = new Set(unlockedNodes);
    let hpBonus = 0;
    let atkBonus = 0;
    let cardQuality: 'common' | 'uncommon' | null = null;

    for (const node of META_TREE) {
      if (!set.has(node.id)) continue;
      if (node.reward.hpBonus) hpBonus += node.reward.hpBonus;
      if (node.reward.atkBonus) atkBonus += node.reward.atkBonus;
      if (node.reward.startingCardQuality) cardQuality = node.reward.startingCardQuality;
    }

    return { hpBonus, atkBonus, startingCardQuality: cardQuality };
  },

  canUnlock(nodeId: string, unlockedNodes: string[]): boolean {
    const node = META_TREE.find(n => n.id === nodeId);
    if (!node) return false;
    if (node.requires && !unlockedNodes.includes(node.requires)) return false;
    if (unlockedNodes.includes(nodeId)) return false;
    return true;
  },

  tryUnlock(nodeId: string): boolean {
    const saveData = SaveSystem.load();
    const node = META_TREE.find(n => n.id === nodeId);
    if (!node) return false;
    if (!this.canUnlock(nodeId, saveData.unlockedNodes)) return false;
    if (!SaveSystem.spendSouls(node.cost)) return false;

    SaveSystem.unlockNode(nodeId);
    if (node.reward.unlockClass) {
      SaveSystem.unlockClass(node.reward.unlockClass);
    }
    return true;
  },
};
