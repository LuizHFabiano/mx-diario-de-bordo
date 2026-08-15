import { ICONS } from '../icons';

export function EventBlock({ task, style, category, canEdit, dayClosed, onEdit, onDelete }) {
  const openEnded = !task.end;

  return (
    <div
      className={`event-block${canEdit ? ' is-editable' : ''}${openEnded ? ' is-open-ended' : ''}`}
      style={style}
      onClick={canEdit ? () => onEdit(task) : undefined}
    >
      <div className="event-block__time">
        {task.start}
        {openEnded ? ' · em aberto' : ` – ${task.end}`}
      </div>
      <div className="event-block__meta">
        {category && <span className="event-block__meta-dot" style={{ background: category.color }} />}
        {category ? `${category.name} · ` : ''}
        {task.userName}
      </div>
      <div className="event-block__title">{task.title}</div>
      {task.description && <div className="event-block__desc">{task.description}</div>}
      {canEdit && (
        <button
          type="button"
          className="event-block__delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
        >
          <img src={ICONS.close} alt="" />
        </button>
      )}
      {!canEdit && dayClosed && (
        <div className="event-block__lock">
          <img src={ICONS.lockMuted} alt="" />
        </div>
      )}
    </div>
  );
}
