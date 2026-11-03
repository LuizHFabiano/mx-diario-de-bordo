import jsPDF from 'jspdf';
import { formatLongDate, parseDateKey, timeStrToMinutes } from './dateUtils';

const MARGIN = 46;
const CELL_PAD = 8;
const COL_GUTTER = 12;
const INK = [28, 27, 26];
const INK_SOFT = [81, 79, 76];
const MUTED = [140, 137, 133];
const BORDER = [225, 221, 215];
const ACCENT = [242, 167, 59];
const ACCENT_DARK = [201, 130, 27];
const GREEN = [31, 146, 84];
const BLUE = [53, 98, 224];
const FOOTER_RESERVE = 46;
const LINE_H = 11.5;

function hexToRgbArray(hex) {
  const clean = (hex || '').replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [Number.isNaN(r) ? 140 : r, Number.isNaN(g) ? 140 : g, Number.isNaN(b) ? 140 : b];
}

function tint(rgb, amount) {
  return rgb.map((c) => Math.round(c + (255 - c) * amount));
}

function darken(rgb, amount) {
  return rgb.map((c) => Math.round(c * (1 - amount)));
}

function fitText(doc, text, maxWidth) {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && doc.getTextWidth(`${truncated}…`) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}…`;
}

function formatDurationLabel(start, end) {
  if (!end) return '—';
  const diff = timeStrToMinutes(end) - timeStrToMinutes(start);
  if (diff <= 0) return '—';
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${h}h ${String(m).padStart(2, '0')}min`;
}

function drawStatusIcon(doc, cx, cy, isOpen) {
  const radius = 7.5;
  if (isOpen) {
    doc.setFillColor(...BLUE);
    doc.circle(cx, cy, radius, 'F');
    doc.setFillColor(255, 255, 255);
    doc.triangle(cx - 2.6, cy - 4, cx - 2.6, cy + 4, cx + 4, cy, 'F');
  } else {
    doc.setFillColor(...GREEN);
    doc.circle(cx, cy, radius, 'F');
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(1.3);
    doc.line(cx - 3.4, cy + 0.2, cx - 0.8, cy + 3.2);
    doc.line(cx - 0.8, cy + 3.2, cx + 3.8, cy - 3.4);
  }
}

function drawBadgeIcon(doc, x, y, size, rgb, kind) {
  doc.setFillColor(...tint(rgb, 0.82));
  doc.roundedRect(x, y, size, size, 4, 4, 'F');
  doc.setDrawColor(...rgb);
  doc.setLineWidth(1.1);
  if (kind === 'calendar') {
    doc.roundedRect(x + size * 0.2, y + size * 0.28, size * 0.6, size * 0.5, 1.4, 1.4, 'S');
    doc.line(x + size * 0.2, y + size * 0.42, x + size * 0.8, y + size * 0.42);
    doc.line(x + size * 0.34, y + size * 0.2, x + size * 0.34, y + size * 0.34);
    doc.line(x + size * 0.66, y + size * 0.2, x + size * 0.66, y + size * 0.34);
  } else {
    doc.line(x + size * 0.26, y + size * 0.24, x + size * 0.74, y + size * 0.24);
    doc.line(x + size * 0.26, y + size * 0.76, x + size * 0.74, y + size * 0.76);
    doc.line(x + size * 0.26, y + size * 0.24, x + size * 0.74, y + size * 0.76);
    doc.line(x + size * 0.74, y + size * 0.24, x + size * 0.26, y + size * 0.76);
  }
}

export function exportDiaryPdf({ dateKey, tasks, categories, filterDescription }) {
  if (!tasks.length) {
    window.alert('Nenhuma atividade registrada para exportar.');
    return;
  }

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const tableW = pageW - MARGIN * 2;

  const colIconW = 22;
  const colHorarioW = 72;
  const colCategoriaW = 72;
  const colOperadorW = 76;
  const colDuracaoW = 54;
  const colDescricaoW = tableW - colIconW - colHorarioW - colCategoriaW - colOperadorW - colDuracaoW;

  const colIconX = MARGIN;
  const colHorarioX = colIconX + colIconW;
  const colCategoriaX = colHorarioX + colHorarioW;
  const colDescricaoX = colCategoriaX + colCategoriaW;
  const colOperadorX = colDescricaoX + colDescricaoW;
  const colDuracaoX = colOperadorX + colOperadorW;

  const descricaoContentW = colDescricaoW - CELL_PAD - COL_GUTTER;
  const operadorContentW = colOperadorW - CELL_PAD - (COL_GUTTER - 4);

  let y = 46;

  doc.setFont(undefined, 'bold');
  doc.setFontSize(24);
  doc.setTextColor(...INK);
  doc.text('MX', MARGIN, y);

  doc.setFontSize(9.5);
  doc.setTextColor(...ACCENT_DARK);
  doc.text('SOLUÇÕES', MARGIN, y + 14, { charSpace: 1.4 });

  const titleX = MARGIN + 190;
  doc.setFont(undefined, 'bold');
  doc.setFontSize(19);
  doc.setTextColor(...INK);
  doc.text('RELATÓRIO DIÁRIO DE ATIVIDADES', titleX, y - 2);
  const titleWidth = doc.getTextWidth('RELATÓRIO DIÁRIO DE ATIVIDADES');
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(2.2);
  doc.line(titleX, y + 8, titleX + titleWidth, y + 8);

  y += 34;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(1);
  doc.line(MARGIN, y, pageW - MARGIN, y);

  y += 26;
  const metaIconSize = 26;
  const metaColRightX = MARGIN + tableW * 0.52;

  drawBadgeIcon(doc, MARGIN, y - metaIconSize + 6, metaIconSize, ACCENT_DARK, 'calendar');
  doc.setFont(undefined, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text('DATA', MARGIN + metaIconSize + 10, y - 12, { charSpace: 0.6 });
  doc.setFontSize(11.5);
  doc.setTextColor(...INK);
  doc.text(formatLongDate(parseDateKey(dateKey)), MARGIN + metaIconSize + 10, y + 3);

  drawBadgeIcon(doc, metaColRightX, y - metaIconSize + 6, metaIconSize, BLUE, 'hourglass');
  doc.setFont(undefined, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text('FILTROS APLICADOS', metaColRightX + metaIconSize + 10, y - 12, { charSpace: 0.6 });
  doc.setFontSize(11.5);
  doc.setTextColor(...INK);
  const filtersLabel = filterDescription && filterDescription.length ? filterDescription : 'Nenhum filtro aplicado';
  const filtersMaxWidth = pageW - MARGIN - (metaColRightX + metaIconSize + 10);
  doc.text(fitText(doc, filtersLabel, filtersMaxWidth), metaColRightX + metaIconSize + 10, y + 3);

  y += 24;
  doc.setDrawColor(...BORDER);
  doc.line(MARGIN, y, pageW - MARGIN, y);
  y += 22;

  function drawTableHeader(startY) {
    doc.setFillColor(...INK);
    doc.rect(MARGIN, startY, tableW, 24, 'F');
    doc.setFont(undefined, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('HORÁRIO', colHorarioX + CELL_PAD, startY + 15, { charSpace: 0.4 });
    doc.text('CATEGORIA', colCategoriaX + CELL_PAD, startY + 15, { charSpace: 0.4 });
    doc.text('DESCRIÇÃO', colDescricaoX + CELL_PAD, startY + 15, { charSpace: 0.4 });
    doc.text('OPERADOR', colOperadorX + CELL_PAD, startY + 15, { charSpace: 0.4 });
    doc.text('DURAÇÃO', colDuracaoX + CELL_PAD, startY + 15, { charSpace: 0.4 });
    return startY + 24 + 12;
  }

  function ensureSpace(neededHeight) {
    if (y + neededHeight > pageH - FOOTER_RESERVE) {
      doc.addPage();
      y = 46;
      y = drawTableHeader(y);
    }
  }

  y = drawTableHeader(y);

  const sorted = [...tasks].sort((a, b) => timeStrToMinutes(a.start) - timeStrToMinutes(b.start));

  sorted.forEach((task) => {
    const category = task.categoryId ? categories.find((c) => c.id === task.categoryId) : null;
    const categoryLabelFull = category ? category.name.toUpperCase() : 'SEM CATEGORIA';
    const categoryRgb = category ? hexToRgbArray(category.color) : [140, 137, 133];

    doc.setFont(undefined, 'bold');
    doc.setFontSize(9.5);
    const titleLines = doc.splitTextToSize(task.title || 'Sem título', descricaoContentW);

    doc.setFont(undefined, 'normal');
    doc.setFontSize(8.5);
    const descText = task.description && task.description.length ? task.description : '—';
    const descLines = doc.splitTextToSize(descText, descricaoContentW);
    const operatorLines = doc.splitTextToSize(task.userName || '—', operadorContentW);

    const titleBlockH = titleLines.length * LINE_H;
    const descBlockH = descLines.length * LINE_H;
    const contentBlockH = titleBlockH + descBlockH + 6;
    const operatorBlockH = operatorLines.length * LINE_H;
    const isEdited = Boolean(task.isEdited || task.editedAt);
    const rowHeight = Math.max(Math.max(contentBlockH, operatorBlockH) + 28, isEdited ? 58 : 50);

    ensureSpace(rowHeight);

    const rowTop = y;

    drawStatusIcon(doc, colIconX + colIconW / 2, rowTop + 18, !task.end);

    doc.setFont(undefined, 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...ACCENT_DARK);
    const timeLabel = task.end ? `${task.start} – ${task.end}` : task.start;
    doc.text(timeLabel, colHorarioX + CELL_PAD, rowTop + 16);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    const statusLabel = task.end ? 'CONCLUÍDA' : 'EM ABERTO';
    const statusX = colHorarioX + CELL_PAD;
    doc.text(statusLabel, statusX, rowTop + 27, { charSpace: 0.4 });
    if (isEdited) {
      doc.setFont(undefined, 'italic');
      doc.setFontSize(7);
      doc.setTextColor(...MUTED);
      doc.text('(Editado)', statusX, rowTop + 38);
    }

    const maxPillW = colCategoriaW - CELL_PAD - 6;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(7.5);
    const categoryLabel = fitText(doc, categoryLabelFull, maxPillW - 20);
    const pillW = Math.min(maxPillW, doc.getTextWidth(categoryLabel) + 20);
    doc.setFillColor(...tint(categoryRgb, 0.85));
    doc.roundedRect(colCategoriaX + CELL_PAD, rowTop + 6, pillW, 15, 7.5, 7.5, 'F');
    doc.setFillColor(...categoryRgb);
    doc.circle(colCategoriaX + CELL_PAD + 9, rowTop + 13.5, 2.6, 'F');
    doc.setFont(undefined, 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...darken(categoryRgb, 0.35));
    doc.text(categoryLabel, colCategoriaX + CELL_PAD + 15, rowTop + 16);

    let cursorY = rowTop + 17;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    titleLines.forEach((line) => {
      doc.text(line, colDescricaoX + CELL_PAD, cursorY);
      cursorY += LINE_H;
    });

    cursorY += 4;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...INK_SOFT);
    descLines.forEach((line) => {
      doc.text(line, colDescricaoX + CELL_PAD, cursorY);
      cursorY += LINE_H;
    });

    doc.setFont(undefined, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...INK_SOFT);
    operatorLines.forEach((line, i) => {
      doc.text(line, colOperadorX + CELL_PAD, rowTop + 17 + i * LINE_H);
    });

    doc.setFont(undefined, 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    doc.text(formatDurationLabel(task.start, task.end), colDuracaoX + CELL_PAD, rowTop + 17);

    y = rowTop + rowHeight;
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.75);
    doc.line(MARGIN, y - 8, pageW - MARGIN, y - 8);
  });

  const total = sorted.length;
  const iniciadas = sorted.filter((t) => !t.end).length;
  const finalizadas = sorted.filter((t) => Boolean(t.end)).length;
  const totalMinutes = sorted.reduce((sum, t) => {
    if (!t.end) return sum;
    const diff = timeStrToMinutes(t.end) - timeStrToMinutes(t.start);
    return diff > 0 ? sum + diff : sum;
  }, 0);
  const totalDurationLabel = `${Math.floor(totalMinutes / 60)}h ${String(totalMinutes % 60).padStart(2, '0')}min`;
  const categoryOccurrences = sorted.reduce((counts, task) => {
    const category = task.categoryId ? categories.find((item) => item.id === task.categoryId) : null;
    const categoryName = category ? category.name.toUpperCase() : 'SEM CATEGORIA';
    counts.set(categoryName, (counts.get(categoryName) || 0) + 1);
    return counts;
  }, new Map());
  const categoryMetrics = [...categoryOccurrences.entries()].map(([label, value]) => ({ label, value: String(value), color: INK }));
  const categoryColumns = Math.min(4, categoryMetrics.length);
  const categoryRows = Math.ceil(categoryMetrics.length / categoryColumns);
  const categoryRowHeight = 42;

  const cardHeight = 98 + categoryRows * categoryRowHeight;
  y += 16;
  if (y + cardHeight > pageH - FOOTER_RESERVE) {
    doc.addPage();
    y = 46;
  }

  doc.setFillColor(250, 249, 247);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(MARGIN, y, tableW, cardHeight, 6, 6, 'FD');

  doc.setFont(undefined, 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text('RESUMO DO DIA', MARGIN + 18, y + 22, { charSpace: 0.4 });
  doc.setDrawColor(...BORDER);
  doc.line(MARGIN + 18, y + 30, pageW - MARGIN - 18, y + 30);

  const metrics = [
    { label: 'Total Ocorrências', value: String(total), color: INK },
    { label: 'Iniciadas', value: String(iniciadas), color: GREEN },
    { label: 'Finalizadas', value: String(finalizadas), color: BLUE },
    { label: 'Duração Total', value: totalDurationLabel, color: ACCENT_DARK },
  ];
  const metricColW = tableW / metrics.length;
  metrics.forEach((metric, i) => {
    const cx = MARGIN + metricColW * i + metricColW / 2;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(metric.label, cx, y + 52, { align: 'center' });
    doc.setFont(undefined, 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...metric.color);
    doc.text(metric.value, cx, y + 74, { align: 'center' });
  });

  doc.setDrawColor(...BORDER);
  doc.line(MARGIN + 18, y + 89, pageW - MARGIN - 18, y + 89);
  const categoryColW = tableW / categoryColumns;
  categoryMetrics.forEach((metric, index) => {
    const column = index % categoryColumns;
    const row = Math.floor(index / categoryColumns);
    const cx = MARGIN + categoryColW * column + categoryColW / 2;
    const rowY = y + 107 + row * categoryRowHeight;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(fitText(doc, metric.label, categoryColW - 16), cx, rowY, { align: 'center' });
    doc.setFont(undefined, 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...metric.color);
    doc.text(metric.value, cx, rowY + 22, { align: 'center' });
  });

  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(...INK);
    doc.rect(0, pageH - 14, pageW, 14, 'F');
    doc.setFillColor(...ACCENT);
    doc.rect(pageW * 0.62, pageH - 14, pageW * 0.38, 14, 'F');
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`Página ${p} de ${totalPages}`, MARGIN, pageH - 22);
  }

  doc.save(`diario-de-bordo-mx-${dateKey}.pdf`);
}
