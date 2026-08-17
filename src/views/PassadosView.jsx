import { useMemo, useState } from 'react';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useUsers } from '../hooks/useUsers';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { FilterBar } from '../components/FilterBar';
import { TimelineGrid } from '../components/TimelineGrid';
import { ICONS } from '../icons';
import { formatLongDate, parseDateKey, timeStrToMinutes } from '../utils/dateUtils';
import { filterTasksList, buildFilterDescription } from '../utils/filters';
import { exportDiaryPdf } from '../utils/exportPdf';
import { FALLBACK_COLORS } from '../utils/constants';

export function PassadosView() {
  const { currentUser } = useAuth();
  const { settings, days, categories } = useAppData();
  const users = useUsers();
  const [selectedDate, setSelectedDate] = useState(null);
  const [filterUserEmail, setFilterUserEmail] = useState('all');
  const [filterCategoryIds, setFilterCategoryIds] = useState(() => new Set());

  const closedDays = useMemo(
    () => Object.keys(days).filter((k) => days[k].closed).sort().reverse(),
    [days]
  );

  function toggleCategory(id) {
    setFilterCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!selectedDate || !closedDays.includes(selectedDate)) {
    return (
      <>
        <Header title="Diários Passados" subtitle={`${closedDays.length} dia(s) encerrado(s)`} actions={null} />
        <div className="content-wrapper">
          {closedDays.length === 0 ? (
            <div className="placeholder">Nenhum diário encerrado ainda.</div>
          ) : (
            <div className="day-list">
              {closedDays.map((key) => (
                <button key={key} type="button" className="day-list__item" onClick={() => setSelectedDate(key)}>
                  {formatLongDate(parseDateKey(key))} · {days[key].tasks.length} atividade(s)
                </button>
              ))}
            </div>
          )}
        </div>
      </>
    );
  }

  const day = days[selectedDate];
  const startMin = timeStrToMinutes(settings.dayStart);
  const endMin = timeStrToMinutes(settings.dayEnd);
  const filteredTasks = filterTasksList(day.tasks, filterUserEmail, filterCategoryIds);

  function handleExport() {
    exportDiaryPdf({
      dateKey: selectedDate,
      tasks: filteredTasks,
      categories,
      filterDescription: buildFilterDescription(filterUserEmail, filterCategoryIds, categories, users),
    });
  }

  return (
    <>
      <Header
        title={formatLongDate(parseDateKey(selectedDate))}
        subtitle="Diário encerrado"
        actions={
          <>
            <Button variant="ghost" icon={ICONS.back} onClick={() => setSelectedDate(null)}>
              Voltar
            </Button>
            <Button variant="ghost" icon={ICONS.download} onClick={handleExport}>
              Exportar PDF
            </Button>
          </>
        }
      />
      <div className="content-wrapper">
        <div className="timeline-shell">
          <div className="locked-banner">
            <img src={ICONS.lock} alt="" />
            Diário encerrado — somente visualização.
          </div>
          <FilterBar
            users={users}
            categories={categories}
            filterUserEmail={filterUserEmail}
            onChangeUser={setFilterUserEmail}
            filterCategoryIds={filterCategoryIds}
            onToggleCategory={toggleCategory}
          />
          <TimelineGrid
            dayStartMin={startMin}
            dayEndMin={endMin}
            tasks={filteredTasks}
            categories={categories}
            currentUserEmail={currentUser.email}
            dayClosed={true}
            showNowLine={false}
            nowMinutes={null}
            onEdit={() => {}}
            fallbackColors={FALLBACK_COLORS}
          />
          {filteredTasks.length === 0 && (
            <p className="empty-state">
              {day.tasks.length ? 'Nenhuma atividade corresponde aos filtros selecionados.' : 'Nenhuma atividade registrada.'}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
