import { useEffect, useState, useSyncExternalStore } from 'react';
import { timeStore } from '../lib/timeStore';

export function useSimulatedNow(tickMs = 1000) {
  const offset = useSyncExternalStore(timeStore.subscribe, timeStore.getOffset);
  const [, forceTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);

  return new Date(Date.now() + offset);
}
