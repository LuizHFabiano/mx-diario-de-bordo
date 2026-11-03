import { useState, useEffect, useMemo } from 'react';
import { jsPDF } from 'jspdf';

const TURNOS_FUNCIONARIOS = [
  {
    nome: 'Manhã',
    funcionarios: [
      'Djefferson',
      'Djonattan',
      'Vitor',
      'Luigi',
      'Luiz S.',
      'Maria G.',
      'Paulo H.',
      'Pietro',
    ],
  },
  {
    nome: 'Tarde',
    funcionarios: [
      'Felipe P.',
      'Gabriel',
      'Guilherme',
      'João Pedro',
      'Kauê',
      'Leonardo M',
      'Yuri',
    ],
  },
  {
    nome: 'Noite',
    funcionarios: [
      'Allan',
      'Enerdan',
      'Lucas',
      'Miguel',
      'Natan',
      'Victor',
    ],
  },
];

// 1. ADICIONADO O DOMINGO AQUI
const DIAS_NOMES = [
  { id: 'seg', label: 'Segunda', dayIdx: 1 },
  { id: 'ter', label: 'Terça', dayIdx: 2 },
  { id: 'qua', label: 'Quarta', dayIdx: 3 },
  { id: 'qui', label: 'Quinta', dayIdx: 4 },
  { id: 'sex', label: 'Sexta', dayIdx: 5 },
  { id: 'sab', label: 'Sábado', dayIdx: 6 },
  { id: 'dom', label: 'Domingo', dayIdx: 0 },
];

const STATUS_OPCOES = [
  { value: 'TRABALHO', label: 'Trabalho', color: '#16a34a', bgLight: '#dcfce7', bgDark: '#14532d' },
  { value: 'FOLGA', label: 'Folga', color: '#2563eb', bgLight: '#dbeafe', bgDark: '#1e3a8a' },
  { value: 'ATESTADO', label: 'Atestado', color: '#ca8a04', bgLight: '#fef9c3', bgDark: '#713f12' },
  { value: 'DAY_OFF', label: 'Day Off', color: '#9333ea', bgLight: '#f3e8ff', bgDark: '#581c87' },
  { value: 'FALTA', label: 'Falta', color: '#dc2626', bgLight: '#fee2e2', bgDark: '#7f1d1d' },
];

const DADOS_PRESET = {
  'semana_2026-10-19': {
    'Maria G.': { sex: 'ATESTADO', sab: 'FALTA', dom: 'FOLGA' },
    'Paulo H.': { sab: 'FOLGA', dom: 'FOLGA' },
    'Felipe P.': { sab: 'FOLGA', dom: 'FOLGA' },
    'Kauê': { sab: 'DAY_OFF', dom: 'FOLGA' },
    'Enerdan': { sab: 'FOLGA', dom: 'FOLGA' },
  },
  'semana_2026-10-26': {
    'Gabriel': { sex: 'FOLGA', sab: 'DAY_OFF', dom: 'FOLGA' },
  },
};

export function EscalasView({ theme = 'light' }) {
  const isDark = theme === 'dark';

  const [semanaOffset, setSemanaOffset] = useState(0);
  const [turnoFiltro, setTurnoFiltro] = useState('TODOS');
  const [busca, setBusca] = useState('');

  const [escalas, setEscalas] = useState(() => {
    const salvo = localStorage.getItem('mx_escalas_dinamicas_v1');
    return salvo ? JSON.parse(salvo) : DADOS_PRESET;
  });

  useEffect(() => {
    localStorage.setItem('mx_escalas_dinamicas_v1', JSON.stringify(escalas));
  }, [escalas]);

  // Segunda-feira ativa (base: 19/10/2026)
  const dataSegunda = useMemo(() => {
    const base = new Date(2026, 9, 19);
    base.setDate(base.getDate() + semanaOffset * 7);
    return base;
  }, [semanaOffset]);

  const chaveSemana = useMemo(() => {
    const y = dataSegunda.getFullYear();
    const m = String(dataSegunda.getMonth() + 1).padStart(2, '0');
    const d = String(dataSegunda.getDate()).padStart(2, '0');
    return `semana_${y}-${m}-${d}`;
  }, [dataSegunda]);

  const diasCalculados = useMemo(() => {
    return DIAS_NOMES.map((d, idx) => {
      const dataDia = new Date(dataSegunda);
      dataDia.setDate(dataSegunda.getDate() + idx);
      const diaNum = String(dataDia.getDate()).padStart(2, '0');
      const mesNum = String(dataDia.getMonth() + 1).padStart(2, '0');
      return {
        ...d,
        dataFormatada: `${diaNum}/${mesNum}`,
      };
    });
  }, [dataSegunda]);

  // 2. AJUSTADO PARA INCLUIR O DOMINGO NO TEXTO (+6 dias)
  const periodoTexto = useMemo(() => {
    const dataDomingo = new Date(dataSegunda);
    dataDomingo.setDate(dataSegunda.getDate() + 6);
    const d1 = String(dataSegunda.getDate()).padStart(2, '0');
    const m1 = String(dataSegunda.getMonth() + 1).padStart(2, '0');
    const d2 = String(dataDomingo.getDate()).padStart(2, '0');
    const m2 = String(dataDomingo.getMonth() + 1).padStart(2, '0');
    const y = dataDomingo.getFullYear();
    return `${d1}/${m1} a ${d2}/${m2}/${y}`;
  }, [dataSegunda]);

  const getStatus = (nome, diaId) => {
    return escalas[chaveSemana]?.[nome]?.[diaId] || 'TRABALHO';
  };

  const alterarStatus = (nome, diaId, novoStatus) => {
    setEscalas((prev) => ({
      ...prev,
      [chaveSemana]: {
        ...prev[chaveSemana],
        [nome]: {
          ...(prev[chaveSemana]?.[nome] || {}),
          [diaId]: novoStatus,
        },
      },
    }));
  };

  // 3. AJUSTADO LARGURA DO PDF PARA 7 COLUNAS (DOMINGO)
  const exportarParaPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    let y = 16;

    // Cabeçalho
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('MX Soluções - Escala Semanal de Funcionários', 14, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text(`Período da Escala: ${periodoTexto}`, 14, y + 6);
    y += 16;

    TURNOS_FUNCIONARIOS.forEach((turno) => {
      if (y > 175) {
        doc.addPage();
        y = 16;
      }

      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, 269, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`TURNO: ${turno.nome.toUpperCase()} (${turno.funcionarios.length} Colaboradores)`, 16, y + 5);
      y += 9;

      doc.setFillColor(226, 232, 240);
      doc.rect(14, y, 269, 7, 'F');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text('Funcionário', 16, y + 5);

      const colWidth = 31; // Ajustado de 35 para 31 para caber as 7 colunas perfeitamente
      diasCalculados.forEach((dia, i) => {
        const xPos = 52 + i * colWidth;
        doc.text(`${dia.label} (${dia.dataFormatada})`, xPos, y + 5);
      });
      y += 8;

      doc.setFont('helvetica', 'normal');
      turno.funcionarios.forEach((nome, idx) => {
        if (y > 185) {
          doc.addPage();
          y = 16;
        }

        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, y - 4, 269, 6.5, 'F');
        }

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(nome, 16, y);

        doc.setFont('helvetica', 'normal');
        diasCalculados.forEach((dia, i) => {
          const status = getStatus(nome, dia.id);
          const xPos = 52 + i * colWidth;

          if (status === 'TRABALHO') {
            doc.setTextColor(22, 163, 74);
            doc.text('Trabalho', xPos, y);
          } else if (status === 'FOLGA') {
            doc.setTextColor(37, 99, 235);
            doc.text('FOLGA', xPos, y);
          } else if (status === 'ATESTADO') {
            doc.setTextColor(202, 138, 4);
            doc.text('ATESTADO', xPos, y);
          } else if (status === 'DAY_OFF') {
            doc.setTextColor(147, 51, 234);
            doc.text('DAY OFF', xPos, y);
          } else if (status === 'FALTA') {
            doc.setTextColor(220, 38, 38);
            doc.text('FALTA', xPos, y);
          }
        });

        y += 6.5;
      });

      y += 6;
    });

    const nomeArquivo = `escala_mx_${chaveSemana}.pdf`;
    doc.save(nomeArquivo);
  };

  const turnosFiltrados = TURNOS_FUNCIONARIOS.filter((t) =>
    turnoFiltro === 'TODOS' ? true : t.nome === turnoFiltro
  );

  const styles = {
    container: {
      padding: '24px',
      maxWidth: '1400px',
      margin: '0 auto',
      color: isDark ? '#f8fafc' : '#000000',
    },
    title: {
      fontSize: '24px',
      fontWeight: 'bold',
      margin: '0 0 6px 0',
      color: isDark ? '#ffffff' : '#000000',
    },
    subtitle: {
      margin: 0,
      color: isDark ? '#94a3b8' : '#334155',
      fontSize: '14px',
    },
    buttonNav: {
      padding: '9px 16px',
      borderRadius: '6px',
      border: isDark ? '1px solid #475569' : '1px solid #94a3b8',
      background: isDark ? '#1e293b' : '#ffffff',
      color: isDark ? '#ffffff' : '#000000',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '13px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    buttonPdf: {
      padding: '9px 16px',
      borderRadius: '6px',
      border: 'none',
      background: '#0284c7',
      color: '#ffffff',
      cursor: 'pointer',
      fontWeight: 'bold',
      fontSize: '13px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    badgePeriodo: {
      padding: '8px 16px',
      background: isDark ? '#0f172a' : '#f1f5f9',
      borderRadius: '6px',
      fontWeight: 'bold',
      fontSize: '14px',
      border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
      color: isDark ? '#38bdf8' : '#000000',
    },
    filterBar: {
      display: 'flex',
      gap: '12px',
      marginBottom: '20px',
      flexWrap: 'wrap',
      alignItems: 'center',
      background: isDark ? '#1e293b' : '#f8fafc',
      padding: '12px',
      borderRadius: '8px',
      border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
    },
    input: {
      padding: '8px 12px',
      borderRadius: '6px',
      border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
      background: isDark ? '#0f172a' : '#ffffff',
      color: isDark ? '#ffffff' : '#000000',
      minWidth: '220px',
      outline: 'none',
    },
    cardTurno: {
      marginBottom: '32px',
      background: isDark ? '#1e293b' : '#ffffff',
      borderRadius: '10px',
      border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    cardHeader: {
      padding: '12px 18px',
      background: isDark ? '#0f172a' : '#f1f5f9',
      borderBottom: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    th: {
      padding: '12px 8px',
      textAlign: 'center',
      minWidth: '120px',
      color: isDark ? '#cbd5e1' : '#000000',
      borderBottom: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
      background: isDark ? '#111827' : '#f8fafc',
    },
    tdNome: {
      padding: '12px 16px',
      fontWeight: '600',
      color: isDark ? '#f1f5f9' : '#000000',
    },
  };

  return (
    <div style={styles.container}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={styles.title}>Escalas de Funcionários</h1>
          <p style={styles.subtitle}>
            Acompanhamento semanal de turnos, folgas e ausências.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setSemanaOffset((prev) => prev - 1)}
            style={styles.buttonNav}
          >
            <span>←</span> Semana Anterior
          </button>

          <div style={styles.badgePeriodo}>
            Período: {periodoTexto}
          </div>

          <button
            onClick={() => setSemanaOffset((prev) => prev + 1)}
            style={styles.buttonNav}
          >
            Próxima Semana <span>→</span>
          </button>

          <button
            onClick={exportarParaPDF}
            style={styles.buttonPdf}
            title="Exportar a escala da semana exibida em PDF"
          >
            📄 Exportar PDF
          </button>
        </div>
      </header>

      <div style={styles.filterBar}>
        <input
          type="text"
          placeholder="Buscar colaborador..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={styles.input}
        />

        <div style={{ display: 'flex', gap: '6px' }}>
          {['TODOS', 'Manhã', 'Tarde', 'Noite'].map((t) => {
            const ativo = turnoFiltro === t;
            return (
              <button
                key={t}
                onClick={() => setTurnoFiltro(t)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: ativo ? '1px solid #0284c7' : isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                  background: ativo ? '#0284c7' : isDark ? '#0f172a' : '#ffffff',
                  color: ativo ? '#ffffff' : isDark ? '#cbd5e1' : '#000000',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                }}
              >
                {t === 'TODOS' ? 'Todos os Turnos' : `Turno ${t}`}
              </button>
            );
          })}
        </div>
      </div>

      {turnosFiltrados.map((turno) => {
        const funcionariosFiltrados = turno.funcionarios.filter((nome) =>
          nome.toLowerCase().includes(busca.toLowerCase())
        );

        if (funcionariosFiltrados.length === 0) return null;

        return (
          <div key={turno.nome} style={styles.cardTurno}>
            <div style={styles.cardHeader}>
              <span style={{ fontWeight: 'bold', fontSize: '16px', color: isDark ? '#38bdf8' : '#000000' }}>
                Turno: {turno.nome}
              </span>
              <span style={{ fontSize: '13px', color: isDark ? '#94a3b8' : '#475569' }}>
                {funcionariosFiltrados.length} colaboradores
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, width: '200px', textAlign: 'left', paddingLeft: '16px' }}>
                      Funcionário
                    </th>
                    {diasCalculados.map((dia) => (
                      <th key={dia.id} style={styles.th}>
                        <div>{dia.label}</div>
                        <div style={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#475569', fontWeight: 'normal' }}>
                          {dia.dataFormatada}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {funcionariosFiltrados.map((nome, index) => {
                    const rowBg = isDark
                      ? index % 2 === 0 ? '#1e293b' : '#172033'
                      : index % 2 === 0 ? '#ffffff' : '#fafafa';

                    return (
                      <tr
                        key={nome}
                        style={{
                          borderBottom: isDark ? '1px solid #334155' : '1px solid #f1f5f9',
                          background: rowBg,
                        }}
                      >
                        <td style={styles.tdNome}>
                          {nome}
                        </td>
                        {diasCalculados.map((dia) => {
                          const statusAtual = getStatus(nome, dia.id);
                          const confStatus = STATUS_OPCOES.find((s) => s.value === statusAtual) || STATUS_OPCOES[0];

                          return (
                            <td key={dia.id} style={{ padding: '8px', textAlign: 'center' }}>
                              <select
                                value={statusAtual}
                                onChange={(e) => alterarStatus(nome, dia.id, e.target.value)}
                                style={{
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  border: `1px solid ${confStatus.color}`,
                                  background: isDark ? confStatus.bgDark : confStatus.bgLight,
                                  color: isDark ? '#ffffff' : confStatus.color,
                                  fontWeight: 'bold',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  outline: 'none',
                                  width: '100%',
                                }}
                              >
                                {STATUS_OPCOES.map((opt) => (
                                  <option
                                    key={opt.value}
                                    value={opt.value}
                                    style={{
                                      background: isDark ? '#1e293b' : '#ffffff',
                                      color: isDark ? '#ffffff' : '#000000',
                                    }}
                                  >
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}