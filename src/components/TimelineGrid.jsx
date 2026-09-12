import { useMemo } from "react";
import { layoutTasks } from "../utils/layoutTasks";
import { minutesToLabel } from "../utils/dateUtils";
import {
  MIN_HOUR_PX,
  MIN_BLOCK_H,
  hashStringToIndex,
} from "../utils/constants";
import { EventBlock } from "./EventBlock";

export function TimelineGrid({
  dayStartMin,
  dayEndMin,
  tasks,
  categories,
  canEditTask,
  dayClosed,
  showNowLine,
  nowMinutes,
  onEdit,
  fallbackColors,
}) {
  const totalMinutes = dayEndMin - dayStartMin;
  const totalHours = totalMinutes / 60;

  const hourMarks = useMemo(() => {
    const marks = [];
    for (let m = dayStartMin; m < dayEndMin; m += 60) marks.push(m);
    marks.push(dayEndMin);
    return marks;
  }, [dayStartMin, dayEndMin]);

  const positioned = useMemo(
    () => layoutTasks(tasks, dayEndMin),
    [tasks, dayEndMin],
  );

  const pct = (minutes) => `${((minutes - dayStartMin) / totalMinutes) * 100}%`;

  const showNow =
    showNowLine &&
    nowMinutes != null &&
    nowMinutes >= dayStartMin &&
    nowMinutes <= dayEndMin;

  return (
    <div className="timeline-grid-viewport">
      <div
        className="timeline-grid"
        style={{ minHeight: `${totalHours * MIN_HOUR_PX}px` }}
      >
        {hourMarks.map((m) => (
          <span
            key={`label-${m}`}
            className="hour-row__label"
            style={{ top: pct(m) }}
          >
            {minutesToLabel(m)}
          </span>
        ))}
        {hourMarks.slice(0, -1).map((m) => (
          <div
            key={`row-${m}`}
            className="hour-row"
            style={{ top: pct(m), height: `${(1 / totalHours) * 100}%` }}
          />
        ))}
        {showNow && (
          <div className="now-line" style={{ top: pct(nowMinutes) }} />
        )}
        <div className="events-layer">
          {positioned.map(({ task, start, end, col, totalCols }) => {
            const gap = 6;
            const widthPct = 100 / totalCols;
            const leftPct = widthPct * col;
            const category = task.categoryId
              ? categories.find((c) => c.id === task.categoryId)
              : null;
            const fallback =
              fallbackColors[hashStringToIndex(task.id, fallbackColors.length)];
            const lineColor = category ? category.color : fallback.line;
            const canEdit = !dayClosed && canEditTask(task);

            const style = {
              top: pct(start),
              height: `${((end - start) / totalMinutes) * 100}%`,
              minHeight: `${MIN_BLOCK_H}px`,
              left: `calc(${leftPct}% + ${col === 0 ? 0 : gap / 2}px)`,
              width: `calc(${widthPct}% - ${gap}px)`,
              "--ev-line": lineColor,
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
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
