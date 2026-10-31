import { useMemo, useState } from 'react';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { FilterBar } from '../components/FilterBar';
import { TimelineGrid } from '../components/TimelineGrid';
import { ICONS } from '../icons';
import { formatLongDate, parseDateKey, timeStrToMinutes } from '../utils/dateUtils';
import { filterTasksList, buildFilterDescription } from '../utils/filters';
import { exportDiaryPdf } from '../utils/exportPdf';
import { FALLBACK_COLORS } from '../utils/constants';
import { DateDropdown } from '../components/DateDropdown';

function normalizeSearch(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function PassadosView() {
  const { currentUser } = useAuth();
  const { settings, days, categories, users, canEditTask } = useAppData();
  const [selectedDate, setSelectedDate] = useState(null);
  const [filterUserEmail, setFilterUserEmail] = useState('all');
  const [filterCategoryIds, setFilterCategoryIds] = useState(() => new Set());
  const [dateQuery, setDateQuery] = useState('');
  const [dayFilter, setDayFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  const closedDays = useMemo(
    () => Object.keys(days).filter((k) => days[k].closed).sort().reverse(),
    [days]
  );
  const visibleClosedDays = useMemo(() => {
    const query = normalizeSearch(dateQuery.trim());
    return closedDays.filter((key) => {
      const date = parseDateKey(key);
      const localizedDate = formatLongDate(date);
      const numericDate = new Intl.DateTimeFormat('pt-BR').format(date);
      const matchesDay = !dayFilter || date.getDate() === Number(dayFilter);
      const matchesMonth = !monthFilter || date.getMonth() + 1 === Number(monthFilter);
      const matchesYear = !yearFilter || date.getFullYear() === Number(yearFilter);
      const matchesQuery = !query || [key, localizedDate, numericDate].some((value) => normalizeSearch(value).includes(query));
      return matchesDay && matchesMonth && matchesYear && matchesQuery;
    });
  }, [closedDays, dateQuery, dayFilter, monthFilter, yearFilter]);

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
        <Header
          title="Diários Passados"
          subtitle={`${closedDays.length} dia(s) encerrado(s)`}
          actions={null}
        />
        <div className="content-wrapper">
          {closedDays.length === 0 ? (
            <div className="placeholder">Nenhum diário encerrado ainda.</div>
          ) : (
            <>
              <div className="day-list-controls">
                <div className="day-list-search">
                  <input
                    type="text"
                    placeholder="Filtrar por data..."
                    value={dateQuery}
                    onChange={(event) => setDateQuery(event.target.value)}
                    aria-label="Filtrar diários por data"
                  />
                </div>
                <div className="date-fields" aria-label="Filtros de data">
                  <DateDropdown
                    label="Dia"
                    value={dayFilter}
                    onChange={setDayFilter}
                    options={Array.from({ length: 31 }, (_, index) => ({
                      value: String(index + 1),
                      label: String(index + 1).padStart(2, '0'),
                    }))}
                  />
                  <DateDropdown
                    label="Mês"
                    value={monthFilter}
                    onChange={setMonthFilter}
                    options={Array.from({ length: 12 }, (_, index) => ({
                      value: String(index + 1),
                      label: String(index + 1).padStart(2, '0'),
                    }))}
                  />
                  <DateDropdown
                    label="Ano"
                    value={yearFilter}
                    onChange={setYearFilter}
                    options={[...new Set(closedDays.map((key) => key.slice(0, 4)))].sort().reverse().map((year) => ({
                      value: year,
                      label: year,
                    }))}
                  />
                </div>
              </div>
              {visibleClosedDays.length ? (
                <div className="day-list">
                  {visibleClosedDays.map((key) => (
                    <button key={key} type="button" className="day-list__item" onClick={() => setSelectedDate(key)}>
                      {formatLongDate(parseDateKey(key))} · {days[key].tasks.length} atividade(s)
                    </button>
                  ))}
                </div>
              ) : (
                <p className="day-list__empty">Nenhum diário corresponde à data pesquisada.</p>
              )}
            </>
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
            canEditTask={canEditTask}
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
