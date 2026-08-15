import { useEffect, useState } from 'react';
import { Button } from './Button';
import { timeStrToMinutes } from '../utils/dateUtils';

export function TaskModal({ task, categories, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setStart(task.start);
      setEnd(task.end || '');
      setDescription(task.description);
      setCategoryId(task.categoryId || '');
    } else {
      setTitle('');
      setStart('09:00');
      setEnd('');
      setDescription('');
      setCategoryId('');
    }
    setError('');
  }, [task]);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function handleSubmit(e) {
    e.preventDefault();
    if (end && timeStrToMinutes(end) <= timeStrToMinutes(start)) {
      setError('O horário de término deve ser depois do início.');
      return;
    }
    onSave({
      title: title.trim() || 'Sem título',
      start,
      end: end || null,
      description: description.trim(),
      categoryId: categoryId || null,
    });
  }

  return (
    <div
      className="modal-overlay is-open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true">
        <h2 className="modal__title">{task ? 'Editar atividade' : 'Nova atividade'}</h2>
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
              <input id="fieldInicio" type="time" required value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="fieldFim">Horário de término (opcional)</label>
              <input id="fieldFim" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          {error && <p className="field__error is-visible">{error}</p>}
          <div className="field">
            <label htmlFor="fieldCategoria">Categoria</label>
            <select id="fieldCategoria" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
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
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Salvar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
