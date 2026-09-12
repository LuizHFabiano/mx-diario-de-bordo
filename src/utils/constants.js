export const MIN_HOUR_PX = 56;

// Altura mínima do bloco (em minutos "visuais") pedida pelo produto: 30 min.
// Mas o conteúdo (horário + categoria + título) precisa de um piso mínimo em
// pixels pra não ser cortado, independente da escala de tempo. Usamos o maior
// dos dois: se no futuro MIN_HOUR_PX aumentar (timeline mais "zoomada"), os
// 30 minutos passam a valer mais em pixels e assumem o controle sozinhos.
export const MIN_BLOCK_MINUTES = 30;
const CONTENT_FLOOR_PX = 58;
export const MIN_BLOCK_H = Math.max(
  (MIN_BLOCK_MINUTES / 60) * MIN_HOUR_PX,
  CONTENT_FLOOR_PX,
);

export const FALLBACK_COLORS = [{ line: "#D3D3D3" }];

export function hashStringToIndex(value, modulo) {
  const str = String(value);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % modulo;
}
