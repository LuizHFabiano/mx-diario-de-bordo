import { useEffect, useState } from "react";
import { Button } from "./Button";
import { ICONS } from "../icons";
import { timeStrToMinutes, nowTimeBR } from "../utils/dateUtils";

function formatTimeValue(value, isDeleting) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length < 2) return digits;

  const hours = Math.min(Number(digits.slice(0, 2)), 23);
  const hourValue = String(hours).padStart(2, "0");
  if (digits.length === 2) return isDeleting ? hourValue : `${hourValue}:`;

  if (digits.length < 4) return `${hourValue}:${digits.slice(2)}`;

  const minutes = Math.min(Number(digits.slice(2, 4)), 59);
  return `${hourValue}:${String(minutes).padStart(2, "0")}`;
}

function isValidTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function TaskModal({
  task,
  categories,
  teams,
  defaultTeamId,
  onClose,
  onSave,
  onDelete,
}) {
  const [title, setTitle] = useState("");
  const [start, setStart] = useState(() => nowTimeBR());
  const [end, setEnd] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setStart(task.start);
      setEnd(task.end || "");
      setDescription(task.description);
      setCategoryId(task.categoryId || "");
      setTeamId(task.teamId || "");
    } else {
      setTitle("");
      setStart(nowTimeBR());
      setEnd("");
      setDescription("");
      setCategoryId("");
      setTeamId(defaultTeamId || teams[0]?.id || "");
    }
    setError("");
  }, [task]);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!isValidTime(start)) {
      setError("Informe um horário de início válido.");
      return;
    }
    if (end && !isValidTime(end)) {
      setError("Informe um horário de término válido.");
      return;
    }
    if (end && timeStrToMinutes(end) <= timeStrToMinutes(start)) {
      setError("O horário de término deve ser depois do início.");
      return;
    }
    onSave({
      title: title.trim() || "Sem título",
      start,
      end: end || null,
      description: description.trim(),
      categoryId: categoryId || null,
      teamId,
    });
  }

  function handleDelete() {
    if (!task) return;
    if (
      window.confirm("Excluir esta atividade? Essa ação não pode ser desfeita.")
    ) {
      onDelete(task.id);
      onClose();
    }
  }

  return (
    <div
      className="modal-overlay is-open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true">
        <h2 className="modal__title">
          {task ? "Editar atividade" : "Nova atividade"}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="fieldTitulo">Título da atividade</label>
            <input
              id="fieldTitulo"
              type="text"
              placeholder="Ex.: Reunião com cliente"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="fieldInicio">Horário de início</label>
              <input
                id="fieldInicio"
                type="text"
                maxLength="5"
                placeholder="00:00"
                inputMode="numeric"
                required
                value={start}
                onInput={(e) => {
                  const isDeleting =
                    e.nativeEvent.inputType?.startsWith("delete");
                  setStart(formatTimeValue(e.currentTarget.value, isDeleting));
                }}
              />
            </div>
            <div className="field">
              <label htmlFor="fieldFim">Horário de término (opcional)</label>
              <input
                id="fieldFim"
                type="text"
                maxLength="5"
                placeholder="00:00"
                inputMode="numeric"
                value={end}
                onInput={(e) => {
                  const isDeleting =
                    e.nativeEvent.inputType?.startsWith("delete");
                  setEnd(formatTimeValue(e.currentTarget.value, isDeleting));
                }}
              />
            </div>
          </div>
          {error && <p className="field__error is-visible">{error}</p>}
          {!task && (
            <div className="field">
              <label htmlFor="fieldEquipe">Equipe</label>
              <select
                id="fieldEquipe"
                required
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="field">
            <label htmlFor="fieldCategoria">Categoria</label>
            <select
              id="fieldCategoria"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Sem categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="fieldDesc">Descrição</label>
            <textarea
              id="fieldDesc"
              placeholder="O que foi feito nesse intervalo..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="modal__actions">
            {task && (
              <Button
                type="button"
                variant="danger"
                icon={ICONS.trash}
                onClick={handleDelete}
              >
                Excluir
              </Button>
            )}
            <div className="modal__actions-right">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary">
                Salvar
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
