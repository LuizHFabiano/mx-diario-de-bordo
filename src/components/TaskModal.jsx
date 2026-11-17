import apiClient from '../data/apiClient';
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


  const [fetchedTeams, setFetchedTeams] = React.useState([]);

  React.useEffect(() => {
    async function loadTeams() {
      if (!teams || teams.length === 0) {
        try {
          const res = await apiClient('/api/equipes');
          const list = Array.isArray(res) ? res : (res.teams || res.equipes || []);
          setFetchedTeams(list);
        } catch (err) {
          console.error("Erro ao carregar equipes:", err);
        }
      }
    }
    loadTeams();
  }, [teams]);

  const activeTeams = (teams && teams.length > 0) ? teams : fetchedTeams;
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
      setError("Informe um horÃ¡rio de inÃ­cio vÃ¡lido.");
      return;
    }
    if (end && !isValidTime(end)) {
      setError("Informe um horÃ¡rio de tÃ©rmino vÃ¡lido.");
      return;
    }
    if (end && timeStrToMinutes(end) <= timeStrToMinutes(start)) {
      setError("O horÃ¡rio de tÃ©rmino deve ser depois do inÃ­cio.");
      return;
    }
    onSave({
      title: title.trim() || "Sem tÃ­tulo",
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
      window.confirm("Excluir esta atividade? Essa aÃ§Ã£o nÃ£o pode ser desfeita.")
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
            <label htmlFor="fieldTitulo">TÃ­tulo da atividade</label>
            <input
              id="fieldTitulo"
              type="text"
              placeholder="Ex.: ReuniÃ£o com cliente"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="fieldInicio">HorÃ¡rio de inÃ­cio</label>
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
              <label htmlFor="fieldFim">HorÃ¡rio de tÃ©rmino (opcional)</label>
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
                <option value="">Selecione uma equipe</option>
                {(activeTeams || []).map((team) => (
                  <option key={team.id || team.nome || team.name} value={team.id || team.nome || team.name}>
                    {team.nome || team.name || `Equipe ${team.id}`}
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
            <label htmlFor="fieldDesc">DescriÃ§Ã£o</label>
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



