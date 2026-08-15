import { useMemo } from 'react';
import { layoutTasks } from '../utils/layoutTasks';
import { minutesToLabel, hexToRgba } from '../utils/dateUtils';
import { HOUR_H } from '../utils/constants';
import { EventBlock } from './EventBlock';

export function TimelineGrid({
  dayStartMin,
  dayEndMin,
  tasks,
  categories,
  currentUserEmail,
  dayClosed,
  showNowLine,
  nowMinutes,
  onEdit,
  onDelete,
  fallbackColors,
}) {
  const hourMarks = useMemo(() => {
    const marks = [];
    for (let m = dayStartMin; m < dayEndMin; m += 60) marks.push(m);
    marks.push(dayEndMin);
    return marks;
  }, [dayStartMin, dayEndMin]);

  const positioned = useMemo(() => layoutTasks(tasks, dayEndMin), [tasks, dayEndMin]);
  const gridHeight = ((dayEndMin - dayStartMin) / 60) * HOUR_H;

  const showNow = showNowLine && nowMinutes != null && nowMinutes >= dayStartMin && nowMinutes <= dayEndMin;
  const nowTop = showNow ? ((nowMinutes - dayStartMin) / 60) * HOUR_H : 0;

  return (
    <div className="timeline-grid" style={{ height: `${gridHeight}px` }}>
      {hourMarks.map((m) => (
        <span key={`label-${m}`} className="hour-row__label" style={{ top: `${((m - dayStartMin) / 60) * HOUR_H}px` }}>
          {minutesToLabel(m)}
        </span>
      ))}
      {hourMarks.slice(0, -1).map((m) => (
        <div
          key={`row-${m}`}
          className="hour-row"
          style={{ top: `${((m - dayStartMin) / 60) * HOUR_H}px`, height: `${HOUR_H}px` }}
        />
      ))}
      {showNow && <div className="now-line" style={{ top: `${nowTop}px` }} />}
      <div className="events-layer">
        {positioned.map(({ task, start, end, col, totalCols }) => {
          const top = ((start - dayStartMin) / 60) * HOUR_H;
          const height = Math.max(((end - start) / 60) * HOUR_H, 26);
          const gap = 6;
          const widthPct = 100 / totalCols;
          const leftPct = widthPct * col;
          const category = task.categoryId ? categories.find((c) => c.id === task.categoryId) : null;
          const fallback = fallbackColors[task.id % fallbackColors.length];
          const lineColor = category ? category.color : fallback.line;
          const bgColor = category ? hexToRgba(category.color, 0.14) : fallback.bg;
          const canEdit = !dayClosed && task.userEmail === currentUserEmail;

          const style = {
            top: `${top}px`,
            height: `${height}px`,
            left: `calc(${leftPct}% + ${col === 0 ? 0 : gap / 2}px)`,
            width: `calc(${widthPct}% - ${gap}px)`,
            '--ev-bg': bgColor,
            '--ev-line': lineColor,
          };

          return (
            <EventBlock
              key={task.id}
              task={task}
              style={style}
              category={category}
              canEdit={canEdit}
              dayClosed={dayClosed}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          );
        })}
      </div>
    </div>
  );
}
