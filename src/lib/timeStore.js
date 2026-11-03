const listeners = new Set();
let offsetMs = Number(localStorage.getItem('mx_time_offset') || 0);

function getOffset() {
  return offsetMs;
}

function setOffset(ms) {
  offsetMs = ms;
  localStorage.setItem('mx_time_offset', String(ms));
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const timeStore = { getOffset, setOffset, subscribe };
