import { useState, useEffect, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { useAuth } from '../context/AuthContext';

// Calcula a segunda-feira da semana atual usando o horário local da máquina
function getSegundaFeiraAtual() {
  const hoje = new Date();
  const diaDaSemana = hoje.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  const diferencaParaSegunda = diaDaSemana === 0 ? -6 : 1 - diaDaSemana;
  
  const segunda = new Date(hoje);
  segunda.setDate(hoje.getDate() + diferencaParaSegunda);
  segunda.setHours(0, 0, 0, 0);
  
  return segunda;
}

const TURNOS_INICIAIS = [
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

const DIAS_NOMES = [
  { id: 'seg', label: 'Segunda', curto: 'Seg', dayIdx: 1 },
  { id: 'ter', label: 'Terça', curto: 'Ter', dayIdx: 2 },
  { id: 'qua', label: 'Quarta', curto: 'Qua', dayIdx: 3 },
  { id: 'qui', label: 'Quinta', curto: 'Qui', dayIdx: 4 },
  { id: 'sex', label: 'Sexta', curto: 'Sex', dayIdx: 5 },
  { id: 'sab', label: 'Sábado', curto: 'Sáb', dayIdx: 6 },
  { id: 'dom', label: 'Domingo', curto: 'Dom', dayIdx: 0 },
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
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';

  const [semanaOffset, setSemanaOffset] = useState(0);
  const [turnoFiltro, setTurnoFiltro] = useState('TODOS');
  const [busca, setBusca] = useState('');

  // Lista dinâmica de turnos e colaboradores (salva no localStorage)
  const [turnosFuncionarios, setTurnosFuncionarios] = useState(() => {
    try {
      const salvoTurnos = localStorage.getItem('mx_turnos_funcionarios_v1');
      return salvoTurnos ? JSON.parse(salvoTurnos) : TURNOS_INICIAIS;
    } catch {
      return TURNOS_INICIAIS;
    }
  });

  // Modal de gerenciamento de colaboradores (apenas ADMIN)
  const [modalGerenciarAberto, setModalGerenciarAberto] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoTurno, setNovoTurno] = useState('Manhã');
  const [novasFolgasFixas, setNovasFolgasFixas] = useState(['dom']);
  const [erroCadastro, setErroCadastro] = useState('');

  // Modal de exportação individual
  const [modalPdfAberto, setModalPdfAberto] = useState(false);
  const [funcSelecionado, setFuncSelecionado] = useState('Allan');
  const [mesAnoSelecionado, setMesAnoSelecionado] = useState(() => {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  });

  // Modal de relatório de faltas
  const [modalFaltasAberto, setModalFaltasAberto] = useState(false);
  const [mesAnoFaltas, setMesAnoFaltas] = useState(() => {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  });

  // Modal de configuração de folga fixa por colaborador
  const [funcFolgaFixaModal, setFuncFolgaFixaModal] = useState(null);

  const todosFuncionarios = useMemo(() => {
    return turnosFuncionarios.flatMap((t) => t.funcionarios);
  }, [turnosFuncionarios]);

  const [escalas, setEscalas] = useState(() => {
    try {
      const salvo = localStorage.getItem('mx_escalas_dinamicas_v1');
      return salvo ? JSON.parse(salvo) : DADOS_PRESET;
    } catch {
      return DADOS_PRESET;
    }
  });

  const [observacoes, setObservacoes] = useState(() => {
    try {
      const salvoObs = localStorage.getItem('mx_escalas_obs_v1');
      return salvoObs ? JSON.parse(salvoObs) : {};
    } catch {
      return {};
    }
  });

  const [folgasFixas, setFolgasFixas] = useState(() => {
    try {
      const salvoFixas = localStorage.getItem('mx_folgas_fixas_v1');
      return salvoFixas ? JSON.parse(salvoFixas) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('mx_turnos_funcionarios_v1', JSON.stringify(turnosFuncionarios));
  }, [turnosFuncionarios]);

  useEffect(() => {
    localStorage.setItem('mx_escalas_dinamicas_v1', JSON.stringify(escalas));
  }, [escalas]);

  useEffect(() => {
    localStorage.setItem('mx_escalas_obs_v1', JSON.stringify(observacoes));
  }, [observacoes]);

  useEffect(() => {
    localStorage.setItem('mx_folgas_fixas_v1', JSON.stringify(folgasFixas));
  }, [folgasFixas]);

  // Adicionar novo colaborador (ADMIN)
  const adicionarColaborador = (e) => {
    e.preventDefault();
    if (!isAdmin) return;

    const nomeLimpo = novoNome.trim();
    if (!nomeLimpo) {
      setErroCadastro('Informe o nome do colaborador.');
      return;
    }

    const jaExiste = todosFuncionarios.some(
      (f) => f.toLowerCase() === nomeLimpo.toLowerCase()
    );
    if (jaExiste) {
      setErroCadastro('Já existe um colaborador com esse nome na escala.');
      return;
    }

    setTurnosFuncionarios((prev) =>
      prev.map((t) =>
        t.nome === novoTurno
          ? { ...t, funcionarios: [...t.funcionarios, nomeLimpo] }
          : t
      )
    );

    if (novasFolgasFixas.length > 0) {
      setFolgasFixas((prev) => ({
        ...prev,
        [nomeLimpo]: novasFolgasFixas,
      }));
    }

    setNovoNome('');
    setNovasFolgasFixas(['dom']);
    setErroCadastro('');
  };

  // Remover colaborador (ADMIN)
  const removerColaborador = (nomeRemover, turnoNome) => {
    if (!isAdmin) return;
    const confirmar = window.confirm(
      `Remover "${nomeRemover}" do turno ${turnoNome}? Ele deixará de aparecer nas escalas.`
    );
    if (!confirmar) return;

    setTurnosFuncionarios((prev) =>
      prev.map((t) =>
        t.nome === turnoNome
          ? { ...t, funcionarios: t.funcionarios.filter((f) => f !== nomeRemover) }
          : t
      )
    );
  };

  const toggleNovaFolgaFixa = (diaId) => {
    setNovasFolgasFixas((prev) =>
      prev.includes(diaId) ? prev.filter((d) => d !== diaId) : [...prev, diaId]
    );
  };

  // Segunda-feira ativa
  const dataSegunda = useMemo(() => {
    const base = getSegundaFeiraAtual();
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

  const getStatus = (nome, diaId, chaveEspecifica = chaveSemana) => {
    const statusManual = escalas?.[chaveEspecifica]?.[nome]?.[diaId];
    if (statusManual) {
      return statusManual;
    }
    const diasFixosDoFunc = folgasFixas?.[nome] || [];
    if (diasFixosDoFunc.includes(diaId)) {
      return 'FOLGA';
    }
    return 'TRABALHO';
  };

  const getObservacao = (nome, diaId, chaveEspecifica = chaveSemana) => {
    return observacoes?.[chaveEspecifica]?.[nome]?.[diaId] || '';
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

  const alterarObservacao = (nome, diaId, texto) => {
    setObservacoes((prev) => ({
      ...prev,
      [chaveSemana]: {
        ...prev[chaveSemana],
        [nome]: {
          ...(prev[chaveSemana]?.[nome] || {}),
          [diaId]: texto,
        },
      },
    }));
  };

  const toggleFolgaFixa = (nome, diaId) => {
    if (!isAdmin) return;
    setFolgasFixas((prev) => {
      const atuais = prev[nome] || [];
      const jaTem = atuais.includes(diaId);
      const atualizados = jaTem
        ? atuais.filter((d) => d !== diaId)
        : [...atuais, diaId];
      return {
        ...prev,
        [nome]: atualizados,
      };
    });
  };

  // Contagem de faltas por operador
  const relatorioFaltasPorOperador = useMemo(() => {
    const [anoStr, mesStr] = (mesAnoFaltas || '2026-11').split('-');
    const targetAno = parseInt(anoStr, 10);
    const targetMes = parseInt(mesStr, 10) - 1;

    const mapaFaltas = {};
    todosFuncionarios.forEach((nome) => {
      mapaFaltas[nome] = 0;
    });

    if (escalas) {
      Object.keys(escalas).forEach((chave) => {
        const match = chave.match(/semana_(\d{4})-(\d{2})-(\d{2})/);
        if (!match) return;
        const segAno = parseInt(match[1], 10);
        const segMes = parseInt(match[2], 10) - 1;

        if (segAno === targetAno && segMes === targetMes) {
          const dadosSemana = escalas[chave] || {};
          Object.keys(dadosSemana).forEach((nome) => {
            if (mapaFaltas[nome] !== undefined && dadosSemana[nome]) {
              DIAS_NOMES.forEach((dia) => {
                if (dadosSemana[nome][dia.id] === 'FALTA') {
                  mapaFaltas[nome] += 1;
                }
              });
            }
          });
        }
      });
    }

    return Object.entries(mapaFaltas).map(([nome, totalFaltas]) => ({
      nome,
      totalFaltas,
    }));
  }, [mesAnoFaltas, escalas, todosFuncionarios]);

  // PDF Semanal Geral
  const exportarParaPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    let y = 16;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('MX Soluções - Escala Semanal de Funcionários', 14, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text(`Período da Escala: ${periodoTexto}`, 14, y + 6);
    y += 16;

    turnosFuncionarios.forEach((turno) => {
      if (turno.funcionarios.length === 0) return;

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

      const colWidth = 31;
      diasCalculados.forEach((dia, i) => {
        const xPos = 52 + i * colWidth;
        doc.text(`${dia.label} (${dia.dataFormatada})`, xPos, y + 5);
      });
      y += 12;

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

  // PDF Individual Mensal
  const exportarPDFMensalIndividual = () => {
    const [anoStr, mesStr] = (mesAnoSelecionado || '2026-11').split('-');
    const ano = parseInt(anoStr, 10);
    const mes = parseInt(mesStr, 10) - 1;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let y = 16;

    const totalDiasNoMes = new Date(ano, mes + 1, 0).getDate();
    const nomeMesExtenso = new Date(ano, mes, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

    const turnoObj = turnosFuncionarios.find((t) => t.funcionarios.includes(funcSelecionado));
    const turnoNome = turnoObj ? turnoObj.nome : 'N/A';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('MX Soluções - Espelho de Escala Mensal', 14, y);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Colaborador: ${funcSelecionado} | Turno: ${turnoNome}`, 14, y + 6);
    doc.text(`Mês de Referência: ${nomeMesExtenso.toUpperCase()}`, 14, y + 12);

    y += 24;

    doc.setFillColor(226, 232, 240);
    doc.rect(14, y, 182, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('Data', 18, y + 5.5);
    doc.text('Dia da Semana', 60, y + 5.5);
    doc.text('Status Registrado / Observação', 130, y + 5.5);

    y += 13;

    const resumo = { TRABALHO: 0, FOLGA: 0, ATESTADO: 0, DAY_OFF: 0, FALTA: 0 };
    const diasSemanaNomes = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

    doc.setFont('helvetica', 'normal');

    for (let dia = 1; dia <= totalDiasNoMes; dia++) {
      if (y > 265) {
        doc.addPage();
        y = 16;
      }

      const dataAtual = new Date(ano, mes, dia);
      const diaSemanaIdx = dataAtual.getDay();
      const dataFmt = `${String(dia).padStart(2, '0')}/${String(mes + 1).padStart(2, '0')}/${ano}`;
      const diaSemanaNome = diasSemanaNomes[diaSemanaIdx];

      const diffSeg = diaSemanaIdx === 0 ? -6 : 1 - diaSemanaIdx;
      const segDaquelaSemana = new Date(dataAtual);
      segDaquelaSemana.setDate(dataAtual.getDate() + diffSeg);
      const chaveDaquelaSemana = `semana_${segDaquelaSemana.getFullYear()}-${String(segDaquelaSemana.getMonth() + 1).padStart(2, '0')}-${String(segDaquelaSemana.getDate()).padStart(2, '0')}`;

      const mapIds = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
      const diaIdKey = mapIds[diaSemanaIdx];

      const statusAtual = getStatus(funcSelecionado, diaIdKey, chaveDaquelaSemana);
      const obsAtual = getObservacao(funcSelecionado, diaIdKey, chaveDaquelaSemana);
      resumo[statusAtual] = (resumo[statusAtual] || 0) + 1;

      if (dia % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 4, 182, 6.5, 'F');
      }

      doc.setTextColor(30, 41, 59);
      doc.text(dataFmt, 18, y);
      doc.text(diaSemanaNome, 60, y);

      const confStatus = STATUS_OPCOES.find((s) => s.value === statusAtual) || STATUS_OPCOES[0];
      doc.setFont('helvetica', 'bold');
      if (statusAtual === 'TRABALHO') doc.setTextColor(22, 163, 74);
      else if (statusAtual === 'FOLGA') doc.setTextColor(37, 99, 235);
      else if (statusAtual === 'ATESTADO') doc.setTextColor(202, 138, 4);
      else if (statusAtual === 'DAY_OFF') doc.setTextColor(147, 51, 234);
      else if (statusAtual === 'FALTA') doc.setTextColor(220, 38, 38);

      const textoExibicao = obsAtual && ['FALTA', 'ATESTADO'].includes(statusAtual)
        ? `${confStatus.label} (${obsAtual})`
        : confStatus.label;

      doc.text(textoExibicao, 130, y);
      doc.setFont('helvetica', 'normal');

      y += 6.5;
    }

    y += 6;
    if (y > 240) {
      doc.addPage();
      y = 16;
    }

    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, 182, 28, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('RESUMO DO MÊS', 18, y + 6);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);

    doc.text(`• Dias de Trabalho: ${resumo.TRABALHO}`, 18, y + 13);
    doc.text(`• Folgas: ${resumo.FOLGA}`, 18, y + 19);
    doc.text(`• Day Off: ${resumo.DAY_OFF}`, 90, y + 13);
    doc.text(`• Atestados: ${resumo.ATESTADO}`, 90, y + 19);
    doc.text(`• Faltas: ${resumo.FALTA}`, 150, y + 13);

    const nomeFich = `escala_mensal_${funcSelecionado.toLowerCase().replace(/\s+/g, '_')}_${mesAnoSelecionado}.pdf`;
    doc.save(nomeFich);
    setModalPdfAberto(false);
  };

  const turnosFiltrados = turnosFuncionarios.filter((t) =>
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
    buttonAdmin: {
      padding: '9px 16px',
      borderRadius: '6px',
      border: 'none',
      background: '#4f46e5',
      color: '#ffffff',
      cursor: 'pointer',
      fontWeight: 'bold',
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
    buttonPdfIndiv: {
      padding: '9px 16px',
      borderRadius: '6px',
      border: 'none',
      background: '#0d9488',
      color: '#ffffff',
      cursor: 'pointer',
      fontWeight: 'bold',
      fontSize: '13px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    buttonFaltas: {
      padding: '9px 16px',
      borderRadius: '6px',
      border: 'none',
      background: '#dc2626',
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
      minWidth: '130px',
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

          {isAdmin && (
            <button
              onClick={() => {
                setErroCadastro('');
                setModalGerenciarAberto(true);
              }}
              style={styles.buttonAdmin}
              title="Adicionar ou remover funcionários da escala (Apenas Admin)"
            >
              👥 Colaboradores
            </button>
          )}

          <button
            onClick={exportarParaPDF}
            style={styles.buttonPdf}
            title="Exportar a escala da semana exibida em PDF"
          >
            📄 PDF Semanal
          </button>

          <button
            onClick={() => {
              if (!todosFuncionarios.includes(funcSelecionado) && todosFuncionarios.length > 0) {
                setFuncSelecionado(todosFuncionarios[0]);
              }
              setModalPdfAberto(true);
            }}
            style={styles.buttonPdfIndiv}
            title="Exportar relatório mensal individual por colaborador"
          >
            👤 PDF Individual
          </button>

          <button
            onClick={() => setModalFaltasAberto(true)}
            style={styles.buttonFaltas}
            title="Ver contagem de faltas por operador no mês"
          >
            📊 Faltas Mês
          </button>
        </div>
      </header>

      {/* MODAL DE GERENCIAR COLABORADORES (APENAS ADMIN) */}
      {isAdmin && modalGerenciarAberto && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: isDark ? '#1e293b' : '#ffffff',
            padding: '24px',
            borderRadius: '12px',
            width: '560px',
            maxWidth: '94%',
            maxHeight: '88vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
            color: isDark ? '#ffffff' : '#000000'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>Gerenciar Colaboradores da Escala</h3>
              <button
                onClick={() => setModalGerenciarAberto(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: isDark ? '#94a3b8' : '#475569' }}
              >
                ✕
              </button>
            </div>

            {/* Formulário de novo colaborador */}
            <form
              onSubmit={adicionarColaborador}
              style={{
                padding: '16px',
                borderRadius: '8px',
                background: isDark ? '#0f172a' : '#f8fafc',
                border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                marginBottom: '20px'
              }}
            >
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: isDark ? '#38bdf8' : '#0284c7' }}>
                + Adicionar Novo Colaborador
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                    Nome:
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Carlos M."
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                      background: isDark ? '#1e293b' : '#ffffff',
                      color: isDark ? '#ffffff' : '#000000',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                    Turno:
                  </label>
                  <select
                    value={novoTurno}
                    onChange={(e) => setNovoTurno(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                      background: isDark ? '#1e293b' : '#ffffff',
                      color: isDark ? '#ffffff' : '#000000',
                      boxSizing: 'border-box'
                    }}
                  >
                    {turnosFuncionarios.map((t) => (
                      <option key={t.nome} value={t.nome}>{t.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>
                  Dias de folga fixa semanal:
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {DIAS_NOMES.map((dia) => {
                    const marcado = novasFolgasFixas.includes(dia.id);
                    return (
                      <button
                        key={dia.id}
                        type="button"
                        onClick={() => toggleNovaFolgaFixa(dia.id)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: marcado
                            ? '2px solid #2563eb'
                            : isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                          background: marcado
                            ? (isDark ? '#1e3a8a' : '#dbeafe')
                            : (isDark ? '#1e293b' : '#ffffff'),
                          color: marcado
                            ? (isDark ? '#ffffff' : '#1d4ed8')
                            : (isDark ? '#cbd5e1' : '#334155'),
                          fontWeight: 'bold',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        {marcado ? `✓ ${dia.curto}` : dia.curto}
                      </button>
                    );
                  })}
                </div>
              </div>

              {erroCadastro && (
                <p style={{ color: '#dc2626', fontSize: '12px', margin: '0 0 10px 0', fontWeight: 'bold' }}>
                  {erroCadastro}
                </p>
              )}

              <button
                type="submit"
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#16a34a',
                  color: '#ffffff',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Adicionar à Escala
              </button>
            </form>

            {/* Listagem por turno para remoção */}
            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Colaboradores Ativos</h4>
              {turnosFuncionarios.map((turno) => (
                <div key={turno.nome} style={{ marginBottom: '14px' }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    padding: '4px 8px',
                    background: isDark ? '#0f172a' : '#f1f5f9',
                    borderRadius: '4px',
                    marginBottom: '6px'
                  }}>
                    Turno {turno.nome} ({turno.funcionarios.length})
                  </div>

                  {turno.funcionarios.length === 0 ? (
                    <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 8px' }}>Nenhum colaborador neste turno.</p>
                  ) : (
                    turno.funcionarios.map((nome) => {
                      const fixas = (folgasFixas[nome] || [])
                        .map((id) => DIAS_NOMES.find((d) => d.id === id)?.curto)
                        .join(', ');

                      return (
                        <div
                          key={nome}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '6px 8px',
                            borderBottom: isDark ? '1px solid #334155' : '1px solid #f1f5f9',
                            fontSize: '13px'
                          }}
                        >
                          <div>
                            <strong>{nome}</strong>
                            {fixas && (
                              <span style={{ marginLeft: '8px', fontSize: '11px', color: '#2563eb' }}>
                                (Folga fixa: {fixas})
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removerColaborador(nome, turno.nome)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '4px',
                              border: '1px solid #dc2626',
                              background: 'transparent',
                              color: '#dc2626',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              cursor: 'pointer'
                            }}
                          >
                            Remover
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button
                onClick={() => setModalGerenciarAberto(false)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: '1px solid #94a3b8',
                  background: 'transparent',
                  color: isDark ? '#ffffff' : '#000000',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE FOLGA FIXA POR COLABORADOR */}
      {isAdmin && funcFolgaFixaModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: isDark ? '#1e293b' : '#ffffff',
            padding: '24px',
            borderRadius: '12px',
            width: '440px',
            maxWidth: '90%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
            color: isDark ? '#ffffff' : '#000000'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>
              Folga Fixa: {funcFolgaFixaModal}
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: isDark ? '#94a3b8' : '#475569' }}>
              Selecione os dias da semana em que este colaborador folga automaticamente em todas as semanas:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '20px' }}>
              {DIAS_NOMES.map((dia) => {
                const selecionado = (folgasFixas[funcFolgaFixaModal] || []).includes(dia.id);
                return (
                  <button
                    key={dia.id}
                    type="button"
                    onClick={() => toggleFolgaFixa(funcFolgaFixaModal, dia.id)}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '8px',
                      border: selecionado
                        ? '2px solid #2563eb'
                        : isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                      background: selecionado
                        ? (isDark ? '#1e3a8a' : '#dbeafe')
                        : (isDark ? '#0f172a' : '#f8fafc'),
                      color: selecionado
                        ? (isDark ? '#ffffff' : '#1d4ed8')
                        : (isDark ? '#cbd5e1' : '#334155'),
                      fontWeight: 'bold',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    {selecionado ? `✓ ${dia.curto}` : dia.curto}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setFuncFolgaFixaModal(null)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MENSAL INDIVIDUAL */}
      {modalPdfAberto && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: isDark ? '#1e293b' : '#ffffff',
            padding: '24px',
            borderRadius: '12px',
            width: '400px',
            maxWidth: '90%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
            color: isDark ? '#ffffff' : '#000000'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Gerar Relatório Mensal</h3>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: 'bold' }}>Colaborador:</label>
              <select
                value={funcSelecionado}
                onChange={(e) => setFuncSelecionado(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: isDark ? '#0f172a' : '#fff', color: isDark ? '#fff' : '#000' }}
              >
                {todosFuncionarios.map((nome) => (
                  <option key={nome} value={nome}>{nome}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: 'bold' }}>Mês/Ano:</label>
              <input
                type="month"
                value={mesAnoSelecionado}
                onChange={(e) => setMesAnoSelecionado(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: isDark ? '#0f172a' : '#fff', color: isDark ? '#fff' : '#000' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setModalPdfAberto(false)}
                style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #94a3b8', background: 'transparent', color: isDark ? '#fff' : '#000', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={exportarPDFMensalIndividual}
                style={{ padding: '8px 14px', borderRadius: '6px', border: 'none', background: '#0d9488', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Gerar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RELATÓRIO DE FALTAS */}
      {modalFaltasAberto && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: isDark ? '#1e293b' : '#ffffff',
            padding: '24px',
            borderRadius: '12px',
            width: '500px',
            maxWidth: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
            color: isDark ? '#ffffff' : '#000000'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Relatório de Faltas no Mês</h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: 'bold' }}>Selecione o Mês:</label>
              <input
                type="month"
                value={mesAnoFaltas}
                onChange={(e) => setMesAnoFaltas(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: isDark ? '#0f172a' : '#fff', color: isDark ? '#fff' : '#000' }}
              />
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <thead>
                <tr style={{ background: isDark ? '#0f172a' : '#f1f5f9' }}>
                  <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>Operador</th>
                  <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #cbd5e1' }}>Total de Faltas</th>
                </tr>
              </thead>
              <tbody>
                {relatorioFaltasPorOperador.map((item) => (
                  <tr key={item.nome} style={{ borderBottom: isDark ? '1px solid #334155' : '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px' }}>{item.nome}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', color: item.totalFaltas > 0 ? '#dc2626' : '#16a34a' }}>
                      {item.totalFaltas}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setModalFaltasAberto(false)}
                style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #94a3b8', background: 'transparent', color: isDark ? '#fff' : '#000', cursor: 'pointer' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Filtros */}
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

      {/* Tabelas de Turno */}
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
                    <th style={{ ...styles.th, width: '210px', textAlign: 'left', paddingLeft: '16px' }}>
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

                    const diasFixosFunc = folgasFixas[nome] || [];
                    const resumoFixas = diasFixosFunc.length > 0
                      ? diasFixosFunc.map((id) => DIAS_NOMES.find((d) => d.id === id)?.curto).join(', ')
                      : null;

                    return (
                      <tr
                        key={nome}
                        style={{
                          borderBottom: isDark ? '1px solid #334155' : '1px solid #f1f5f9',
                          background: rowBg,
                        }}
                      >
                        <td style={styles.tdNome}>
                          <div>{nome}</div>
                          {isAdmin ? (
                            <button
                              type="button"
                              onClick={() => setFuncFolgaFixaModal(nome)}
                              title="Configurar dias fixos de folga deste colaborador"
                              style={{
                                marginTop: '4px',
                                padding: '2px 7px',
                                fontSize: '11px',
                                borderRadius: '4px',
                                border: resumoFixas
                                  ? '1px solid #2563eb'
                                  : isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                                background: resumoFixas
                                  ? (isDark ? '#1e3a8a' : '#eff6ff')
                                  : 'transparent',
                                color: resumoFixas
                                  ? (isDark ? '#93c5fd' : '#1d4ed8')
                                  : (isDark ? '#94a3b8' : '#64748b'),
                                cursor: 'pointer',
                                fontWeight: '600',
                              }}
                            >
                              {resumoFixas ? `📅 Fixa: ${resumoFixas}` : '⚙️ Folga fixa'}
                            </button>
                          ) : (
                            resumoFixas && (
                              <span style={{
                                display: 'inline-block',
                                marginTop: '4px',
                                padding: '2px 7px',
                                fontSize: '11px',
                                borderRadius: '4px',
                                background: isDark ? '#1e3a8a' : '#eff6ff',
                                color: isDark ? '#93c5fd' : '#1d4ed8',
                                fontWeight: '600',
                              }}>
                                📅 Fixa: {resumoFixas}
                              </span>
                            )
                          )}
                        </td>
                        {diasCalculados.map((dia) => {
                          const statusAtual = getStatus(nome, dia.id);
                          const obsAtual = getObservacao(nome, dia.id);
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

                              {['FALTA', 'ATESTADO'].includes(statusAtual) && (
                                <input
                                  type="text"
                                  placeholder="Motivo..."
                                  value={obsAtual}
                                  onChange={(e) => alterarObservacao(nome, dia.id, e.target.value)}
                                  style={{
                                    marginTop: '6px',
                                    width: '100%',
                                    padding: '4px 6px',
                                    fontSize: '11px',
                                    borderRadius: '4px',
                                    border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                                    background: isDark ? '#0f172a' : '#ffffff',
                                    color: isDark ? '#ffffff' : '#000000',
                                    boxSizing: 'border-box',
                                    display: 'block'
                                  }}
                                />
                              )}
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