import { useState } from 'react';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useSimulatedNow } from '../hooks/useSimulatedNow';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { FilterBar } from '../components/FilterBar';
import { TimelineGrid } from '../components/TimelineGrid';
import { TaskModal } from '../components/TaskModal';
import { ICONS } from '../icons';
import { formatDateKey, formatLongDate, timeStrToMinutes } from '../utils/dateUtils';
import { filterTasksList, buildFilterDescription } from '../utils/filters';
import { exportDiaryPdf } from '../utils/exportPdf';
import { FALLBACK_COLORS } from '../utils/constants';

export function HojeView({ theme, onToggleTheme }) {
  const { currentUser } = useAuth();
  const { settings, days, categories, users, teams, memberTeamIds, addTask, updateTask, removeTask, closeDayManually, canEditTask } = useAppData();
  const writableTeams = teams.filter((team) => memberTeamIds.includes(team.id));
  const now = useSimulatedNow(15000);
  const todayKey = formatDateKey(now);
  const day = days[todayKey] || { closed: false, tasks: [] };

  const [filterUserEmail, setFilterUserEmail] = useState('all');
  const [filterCategoryIds, setFilterCategoryIds] = useState(() => new Set());
  const [modalTask, setModalTask] = useState(undefined);

  const startMin = timeStrToMinutes(settings.dayStart);
  const endMin = timeStrToMinutes(settings.dayEnd);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const filteredTasks = filterTasksList(day.tasks, filterUserEmail, filterCategoryIds);

  function toggleCategory(id) {
    setFilterCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSaveTask(input) {
    if (modalTask) {
      await updateTask(todayKey, modalTask.id, input);
    } else {
      await addTask(todayKey, input);
    }
    setModalTask(undefined);
  }

  function handleCloseDay() {
    if (window.confirm('Encerrar o diário de hoje? Depois disso não será mais possível editar as atividades.')) {
      closeDayManually(todayKey);
    }
  }

  function handleExport() {
    exportDiaryPdf({
      dateKey: todayKey,
      tasks: filteredTasks,
      categories,
      filterDescription: buildFilterDescription(filterUserEmail, filterCategoryIds, categories, users),
    });
  }

  return (
    <>
      <Header
        title={formatLongDate(now)}
        subtitle={`${settings.dayStart} – ${settings.dayEnd}`}
        actions={
          <>
            {!day.closed && (
              <Button variant="accent" icon={ICONS.plus} onClick={() => setModalTask(null)}>
                Criar
              </Button>
            )}
            {!day.closed && settings.allowManualClose && currentUser.role !== 'ATTENDANT' && (
              <Button variant="ghost" icon={ICONS.lock} onClick={handleCloseDay}>
                Encerrar dia
              </Button>
            )}
            <Button variant="ghost" icon={ICONS.download} onClick={handleExport}>
              Exportar PDF
            </Button>
            <label className="theme-control">
              <span className="theme-control__label">Modo escuro</span>
              <span className="switch">
                <input
                  type="checkbox"
                  checked={theme === 'dark'}
                  onChange={onToggleTheme}
                  aria-label="Ativar modo escuro"
                />
                <span className="switch-track" />
              </span>
            </label>
          </>
        }
      />
      <div className="content-wrapper">
        <div className="timeline-shell">
          {day.closed && (
            <div className="locked-banner">
              <img src={ICONS.lock} alt="" />
              Este diário foi encerrado e não pode mais ser alterado.
            </div>
          )}
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
            canEditTask={canEditTask}
            dayClosed={day.closed}
            showNowLine={!day.closed}
            nowMinutes={nowMinutes}
            onEdit={(task) => setModalTask(task)}
            fallbackColors={FALLBACK_COLORS}
          />
          {filteredTasks.length === 0 && (
            <p className="empty-state">
              {day.tasks.length ? 'Nenhuma atividade corresponde aos filtros selecionados.' : 'Nenhuma atividade registrada.'}
            </p>
          )}
        </div>
      </div>
      {modalTask !== undefined && (
        <TaskModal
          task={modalTask}
          categories={categories}
          teams={writableTeams}
          defaultTeamId={writableTeams[0]?.id}
          onClose={() => setModalTask(undefined)}
          onSave={handleSaveTask}
          onDelete={(id) => removeTask(todayKey, id)}
        />
      )}
    </>
  );
}
