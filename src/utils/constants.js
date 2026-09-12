export const MIN_HOUR_PX = 56;
export const MIN_BLOCK_H = 132;

export const FALLBACK_COLORS = [
  { line: "#3562E0" },
  { line: "#1F9254" },
  { line: "#7C4FE0" },
  { line: "#0E8E86" },
  { line: "#8A5A2B" },
];

export function hashStringToIndex(value, modulo) {
  const str = String(value);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % modulo;
}
