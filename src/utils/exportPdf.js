import jsPDF from 'jspdf';
import { formatLongDate, parseDateKey, timeStrToMinutes } from './dateUtils';

export function exportDiaryPdf({ dateKey, tasks, categories, filterDescription }) {
  if (!tasks.length) {
    window.alert('Nenhuma atividade registrada para exportar.');
    return;
  }

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 48;
  let y = 56;

  doc.setFillColor(242, 167, 59);
  doc.rect(0, 0, pageW, 6, 'F');

  doc.setFont(undefined, 'bold');
  doc.setFontSize(18);
  doc.setTextColor(28, 27, 26);
  doc.text('MX SOLUÇÕES', marginX, y);

  y += 20;
  doc.setFont(undefined, 'normal');
  doc.setFontSize(11);
  doc.setTextColor(140, 137, 133);
  doc.text('Diário de Bordo — Relatório de Atividades', marginX, y);

  y += 16;
  doc.setFontSize(10.5);
  doc.text(formatLongDate(parseDateKey(dateKey)), marginX, y);

  if (filterDescription) {
    y += 14;
    doc.setFontSize(9);
    doc.setTextColor(140, 137, 133);
    doc.text(`Filtros aplicados — ${filterDescription}`, marginX, y);
  }

  y += 14;
  doc.setDrawColor(231, 228, 223);
  doc.line(marginX, y, pageW - marginX, y);
  y += 26;

  const sorted = [...tasks].sort((a, b) => timeStrToMinutes(a.start) - timeStrToMinutes(b.start));
  const pageBottom = 780;

  sorted.forEach((task) => {
    if (y > pageBottom - 60) {
      doc.addPage();
      y = 56;
    }
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(201, 130, 27);
    doc.text(task.start + (task.end ? ` – ${task.end}` : ' · em aberto'), marginX, y);
    doc.setTextColor(28, 27, 26);
    doc.text(task.title, marginX + 90, y);
    y += 13;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(140, 137, 133);
    const category = task.categoryId ? categories.find((c) => c.id === task.categoryId) : null;
    doc.text(`${category ? category.name + ' · ' : ''}${task.userName}`, marginX, y);
    y += 14;

    doc.setFontSize(10);
    doc.setTextColor(81, 79, 76);
    const desc = task.description && task.description.length ? task.description : '—';
    const lines = doc.splitTextToSize(desc, pageW - marginX * 2 - 12);
    lines.forEach((line) => {
      if (y > pageBottom) {
        doc.addPage();
        y = 56;
      }
      doc.text(line, marginX + 12, y);
      y += 13;
    });
    y += 10;
    doc.setDrawColor(231, 228, 223);
    doc.line(marginX, y, pageW - marginX, y);
    y += 20;
  });

  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(140, 137, 133);
    doc.text(`Página ${p} de ${totalPages}`, pageW - marginX - 60, 820);
  }

  doc.save(`diario-de-bordo-mx-${dateKey}.pdf`);
}
