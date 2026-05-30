export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const hpColor = (pct: number): number => {
  if (pct > 0.5) return 0x44cc44;
  if (pct > 0.25) return 0xddcc00;
  return 0xcc2222;
};

export function scaleStatToFloor(base: number, floor: number, rate = 0.15): number {
  return Math.round(base * (1 + (floor - 1) * rate));
}
