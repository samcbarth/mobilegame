import { UPGRADE_CARDS, UpgradeCard, RARITY_WEIGHTS, Rarity } from '../data/upgradeCards';
import { RNG } from '../utils/RNG';

export class UpgradeSystem {
  // Draw `count` cards, guaranteeing at least 1 uncommon/rare on floor >= 5
  static drawCards(ownedIds: Set<string>, floor: number, seed: number, count = 3): UpgradeCard[] {
    const rng = new RNG(seed);
    const available = UPGRADE_CARDS.filter(c => !c.unique || !ownedIds.has(c.id));

    if (available.length === 0) return [];

    const drawn: UpgradeCard[] = [];
    const usedIds = new Set<string>();

    // Floor 5+: guarantee at least one uncommon or rare
    let mustUpgrade = floor >= 5;

    for (let i = 0; i < count; i++) {
      const pool = available.filter(c => !usedIds.has(c.id));
      if (pool.length === 0) break;

      let card: UpgradeCard;
      if (mustUpgrade && i === 0) {
        // Force uncommon or rare
        const upgraded = pool.filter(c => c.rarity !== 'common');
        card = upgraded.length > 0
          ? rng.weightedPick(upgraded.map(c => ({ item: c, weight: RARITY_WEIGHTS[c.rarity] })))
          : rng.weightedPick(pool.map(c => ({ item: c, weight: RARITY_WEIGHTS[c.rarity] })));
        mustUpgrade = false;
      } else {
        card = rng.weightedPick(pool.map(c => ({ item: c, weight: RARITY_WEIGHTS[c.rarity] })));
      }

      drawn.push(card);
      usedIds.add(card.id);
    }

    return drawn;
  }

  static rarityColor(rarity: Rarity): number {
    switch (rarity) {
      case 'common': return 0xaaaaaa;
      case 'uncommon': return 0x44ff88;
      case 'rare': return 0xaa44ff;
    }
  }
}
