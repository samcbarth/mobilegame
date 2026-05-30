// Mulberry32 seeded PRNG — fast, good distribution, zero deps
export class RNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state |= 0;
    this.state = this.state + 0x6d2b79f5 | 0;
    let z = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    z ^= z + Math.imul(z ^ (z >>> 7), 61 | z);
    return ((z ^ (z >>> 14)) >>> 0) / 0x100000000;
  }

  randInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  randFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  shuffle<T>(arr: T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Weighted pick: items is [{item, weight}]
  weightedPick<T>(items: Array<{ item: T; weight: number }>): T {
    const total = items.reduce((s, x) => s + x.weight, 0);
    let r = this.next() * total;
    for (const { item, weight } of items) {
      r -= weight;
      if (r <= 0) return item;
    }
    return items[items.length - 1].item;
  }
}

export function makeSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff);
}
