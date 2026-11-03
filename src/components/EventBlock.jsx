import { ICONS } from "../icons";

export function EventBlock({
  task,
  style,
  category,
  canEdit,
  dayClosed,
  onEdit,
}) {
  const openEnded = !task.end;
  const isEdited = Boolean(task.isEdited);

  return (
    <div
      className={`event-block${canEdit ? " is-editable" : ""}${openEnded ? " is-open-ended" : ""}`}
      style={style}
      onClick={canEdit ? () => onEdit(task) : undefined}
    >
      <div className="event-block__time">
        {task.start}
        {openEnded ? " · em aberto" : ` – ${task.end}`}
      </div>
      <div className="event-block__meta">
        {category && (
          <span
            className="event-block__meta-dot"
            style={{ background: category.color }}
          />
        )}
        <span className="event-block__meta-text">
          {category ? `${category.name} · ` : ""}
          {task.userName}
          {isEdited && <span className="event-block__edited">(Editado)</span>}
        </span>
      </div>
      <div className="event-block__title">{task.title}</div>
      {task.description && (
        <div className="event-block__desc">{task.description}</div>
      )}
      {!canEdit && dayClosed && (
        <div className="event-block__lock">
          <img src={ICONS.lockMuted} alt="" />
        </div>
      )}
    </div>
  );
}
