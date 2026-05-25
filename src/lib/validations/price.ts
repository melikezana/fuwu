export function validatePrice(value: unknown, min = 0, max = 1000000): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return null;
  }
  return Math.floor(parsed);
}
