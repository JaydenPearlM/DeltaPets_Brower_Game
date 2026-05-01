/**
 * Converts any value to a finite number.
 * Returns fallback if the result is not finite.
 */
export function safeNum(value: unknown, fallback = 0): number {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}
