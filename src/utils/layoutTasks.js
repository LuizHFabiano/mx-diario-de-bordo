import { timeStrToMinutes } from './dateUtils';
import { MIN_HOUR_PX, MIN_BLOCK_H } from './constants';

const MIN_COLLISION_MINUTES = (MIN_BLOCK_H / MIN_HOUR_PX) * 60;

export function layoutTasks(tasks, dayEndMin) {
  const withEffectiveEnd = tasks.map((task) => {
    const start = timeStrToMinutes(task.start);
    const declaredEnd = task.end ? timeStrToMinutes(task.end) : start;
    const visualFloorEnd = Math.min(start + MIN_COLLISION_MINUTES, dayEndMin);
    const end = Math.max(declaredEnd, visualFloorEnd);
    return { task, start, end };
  });

  const sorted = [...withEffectiveEnd].sort((a, b) => a.start - b.start);

  const clusters = [];
  let current = [];
  let clusterEnd = -Infinity;
  sorted.forEach((item) => {
    if (item.start >= clusterEnd) {
      if (current.length) clusters.push(current);
      current = [item];
      clusterEnd = item.end;
    } else {
      current.push(item);
      clusterEnd = Math.max(clusterEnd, item.end);
    }
  });
  if (current.length) clusters.push(current);

  const positioned = [];
  clusters.forEach((cluster) => {
    const colEnds = [];
    cluster.forEach((item) => {
      let placedCol = -1;
      for (let c = 0; c < colEnds.length; c++) {
        if (colEnds[c] <= item.start) {
          placedCol = c;
          colEnds[c] = item.end;
          break;
        }
      }
      if (placedCol === -1) {
        placedCol = colEnds.length;
        colEnds.push(item.end);
      }
      item.col = placedCol;
    });
    cluster.forEach((item) => {
      item.totalCols = colEnds.length;
      positioned.push(item);
    });
  });

  return positioned;
}
