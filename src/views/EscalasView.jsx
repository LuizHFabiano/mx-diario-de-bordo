import { useState, useEffect, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../data/apiClient';

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

function getHojeISO() {
  const hoje = new Date();
  const y = hoje.getFullYear();
  const m = String(hoje.getMonth() + 1).padStart(2, '0');
  const d = String(hoje.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatarDataBR(isoStr) {
  if (!isoStr) return '';
  const [y, m, d] = isoStr.split('-');
  if (!y || !m || !d) return isoStr;
  return `${d}/${m}/${y}`;
}

function toISODate(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const ordenarNomes = (lista) =>
  [...lista].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

const SETORES_DISPONIVEIS = ['Suporte', 'Financeiro', 'Comercial'];

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

const MESES_OPCOES = [
  { value: '01', label: '01 - Janeiro' },
  { value: '02', label: '02 - Fevereiro' },
  { value: '03', label: '03 - Março' },
  { value: '04', label: '04 - Abril' },
  { value: '05', label: '05 - Maio' },
  { value: '06', label: '06 - Junho' },
  { value: '07', label: '07 - Julho' },
  { value: '08', label: '08 - Agosto' },
  { value: '09', label: '09 - Setembro' },
  { value: '10', label: '10 - Outubro' },
  { value: '11', label: '11 - Novembro' },
  { value: '12', label: '12 - Dezembro' },
];

const STATUS_OPCOES = [
  { value: 'TRABALHO', label: 'Trabalho', color: '#16a34a', bgLight: '#dcfce7', bgDark: '#14532d' },
  { value: 'FOLGA', label: 'Folga', color: '#2563eb', bgLight: '#dbeafe', bgDark: '#1e3a8a' },
  { value: 'FERIADO', label: 'Feriado', color: '#0891b2', bgLight: '#cffafe', bgDark: '#164e63' },
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
  const [setorFiltro, setSetorFiltro] = useState('TODOS');
  const [turnoFiltro, setTurnoFiltro] = useState('TODOS');
  const [busca, setBusca] = useState('');

  // Lista dinâmica de turnos e colaboradores
  const [turnosFuncionarios, setTurnosFuncionarios] = useState(() => {
    try {
      const salvoTurnos = localStorage.getItem('mx_turnos_funcionarios_v1');
      return salvoTurnos ? JSON.parse(salvoTurnos) : TURNOS_INICIAIS;
    } catch {
      return TURNOS_INICIAIS;
    }
  });

  // Mapa de setor por colaborador ({ [nome]: 'Suporte' | 'Financeiro' | 'Comercial' })
  const [setoresFuncionarios, setSetoresFuncionarios] = useState(() => {
    try {
      const salvoSetores = localStorage.getItem('mx_setores_funcionarios_v1');
      return salvoSetores ? JSON.parse(salvoSetores) : {};
    } catch {
      return {};
    }
  });

  // Vigência de vínculo por colaborador ({ [nome]: { admissao: 'YYYY-MM-DD', desligamento: 'YYYY-MM-DD' | null } })
  const [vigenciaFuncionarios, setVigenciaFuncionarios] = useState(() => {
    try {
      const salvoVigencia = localStorage.getItem('mx_vigencia_funcionarios_v1');
      return salvoVigencia ? JSON.parse(salvoVigencia) : {};
    } catch {
      return {};
    }
  });

  // Modal de gerenciamento de colaboradores (apenas ADMIN)
  const [modalGerenciarAberto, setModalGerenciarAberto] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoSetor, setNovoSetor] = useState('Suporte');
  const [novoTurno, setNovoTurno] = useState('Manhã');
  const [novaDataAdmissao, setNovaDataAdmissao] = useState(() => getHojeISO());
  const [novasFolgasFixas, setNovasFolgasFixas] = useState(['dom']);
  const [erroCadastro, setErroCadastro] = useState('');
  const [buscaGerenciarFunc, setBuscaGerenciarFunc] = useState('');

  // Estado de edição de colaborador existente (abre em modal sobreposto)
  const [editandoFunc, setEditandoFunc] = useState(null);
  const [editNome, setEditNome] = useState('');
  const [editSetor, setEditSetor] = useState('Suporte');
  const [editTurno, setEditTurno] = useState('Manhã');
  const [editDataAdmissao, setEditDataAdmissao] = useState('2026-01-01');
  const [editDataDesligamento, setEditDataDesligamento] = useState('');
  const [editFolgasFixas, setEditFolgasFixas] = useState([]);
  const [erroEdicao, setErroEdicao] = useState('');

  // Modal de desligamento rápido
  const [desligandoFunc, setDesligandoFunc] = useState(null); // { nome, turnoNome }
  const [dataDesligamentoInput, setDataDesligamentoInput] = useState(() => getHojeISO());

 // Modal de exportação individual
  const [modalPdfAberto, setModalPdfAberto] = useState(false);
  const [buscaPdfFunc, setBuscaPdfFunc] = useState('');
  const [dropdownPdfAberto, setDropdownPdfAberto] = useState(false);
  const [funcSelecionado, setFuncSelecionado] = useState('');
  const [mesSelecionado, setMesSelecionado] = useState(() =>
    String(new Date().getMonth() + 1).padStart(2, '0')
  );
  const [anoSelecionado, setAnoSelecionado] = useState(() =>
    String(new Date().getFullYear())
  );

  // Modal de relatório de faltas
  const [modalFaltasAberto, setModalFaltasAberto] = useState(false);
  const [mesFaltas, setMesFaltas] = useState(() =>
    String(new Date().getMonth() + 1).padStart(2, '0')
  );
  const [anoFaltas, setAnoFaltas] = useState(() =>
    String(new Date().getFullYear())
  );

  // Modal de configuração rápida de folga fixa por colaborador
  const [funcFolgaFixaModal, setFuncFolgaFixaModal] = useState(null);

  const getSetorColaborador = (nome) => setoresFuncionarios?.[nome] || 'Suporte';

  const getVigenciaColaborador = (nome) => {
    const reg = vigenciaFuncionarios?.[nome];
    return {
      admissao: reg?.admissao || '2026-01-01',
      desligamento: reg?.desligamento || null,
    };
  };

  // Verifica se o colaborador estava ativo em uma data específica ('YYYY-MM-DD')
  const isAtivoNaData = (nome, dataISO) => {
    const { admissao, desligamento } = getVigenciaColaborador(nome);
    if (admissao && dataISO < admissao) return false;
    if (desligamento && dataISO > desligamento) return false;
    return true;
  };

  const getMotivoInativoNaData = (nome, dataISO) => {
    const { admissao, desligamento } = getVigenciaColaborador(nome);
    if (admissao && dataISO < admissao) return 'NÃO ADMITIDO';
    if (desligamento && dataISO > desligamento) return 'DESLIGADO';
    return null;
  };

  const anosDisponiveis = useMemo(() => {
    const anoAtual = new Date().getFullYear();
    return [anoAtual - 1, anoAtual, anoAtual + 1].map(String);
  }, []);

  const todosFuncionariosOrdenados = useMemo(() => {
    return ordenarNomes(turnosFuncionarios.flatMap((t) => t.funcionarios));
  }, [turnosFuncionarios]);

  const funcionariosFiltradosPdf = useMemo(() => {
    const termo = buscaPdfFunc.trim().toLowerCase();
    if (!termo) return todosFuncionariosOrdenados;
    return todosFuncionariosOrdenados.filter((nome) =>
      nome.toLowerCase().includes(termo)
    );
  }, [todosFuncionariosOrdenados, buscaPdfFunc]);

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

  const [apiPronta, setApiPronta] = useState(false);

  // Carrega os dados compartilhados do PostgreSQL ao abrir a aba Escalas
  useEffect(() => {
    let ativo = true;
    apiClient('/api/work-scales')
      .then((res) => {
        if (!ativo) return;
        if (res?.data) {
          if (Array.isArray(res.data.turnosFuncionarios)) {
            setTurnosFuncionarios(res.data.turnosFuncionarios);
          }
          if (res.data.setoresFuncionarios) {
            setSetoresFuncionarios(res.data.setoresFuncionarios);
          }
          if (res.data.vigenciaFuncionarios) {
            setVigenciaFuncionarios(res.data.vigenciaFuncionarios);
          }
          if (res.data.escalas) {
            setEscalas(res.data.escalas);
          }
          if (res.data.observacoes) {
            setObservacoes(res.data.observacoes);
          }
          if (res.data.folgasFixas) {
            setFolgasFixas(res.data.folgasFixas);
          }
        }
        setApiPronta(true);
      })
      .catch(() => {
        if (ativo) setApiPronta(true);
      });
    return () => {
      ativo = false;
    };
  }, []);

  // Salva automaticamente no PostgreSQL sempre que houver alteração na escala
  useEffect(() => {
    if (!apiPronta) return;
    const timer = setTimeout(() => {
      apiClient('/api/work-scales', {
        method: 'PUT',
        body: JSON.stringify({
          turnosFuncionarios,
          setoresFuncionarios,
          vigenciaFuncionarios,
          escalas,
          observacoes,
          folgasFixas,
        }),
      }).catch((err) => console.error('Erro ao sincronizar escalas:', err));
    }, 500);
    return () => clearTimeout(timer);
  }, [
    apiPronta,
    turnosFuncionarios,
    setoresFuncionarios,
    vigenciaFuncionarios,
    escalas,
    observacoes,
    folgasFixas,
  ]);

  useEffect(() => {
    localStorage.setItem('mx_turnos_funcionarios_v1', JSON.stringify(turnosFuncionarios));
  }, [turnosFuncionarios]);

  useEffect(() => {
    localStorage.setItem('mx_setores_funcionarios_v1', JSON.stringify(setoresFuncionarios));
  }, [setoresFuncionarios]);

  useEffect(() => {
    localStorage.setItem('mx_vigencia_funcionarios_v1', JSON.stringify(vigenciaFuncionarios));
  }, [vigenciaFuncionarios]);

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

    const jaExiste = todosFuncionariosOrdenados.some(
      (f) => f.toLowerCase() === nomeLimpo.toLowerCase()
    );
    if (jaExiste) {
      setErroCadastro('Já existe um colaborador com esse nome na escala.');
      return;
    }

    setTurnosFuncionarios((prev) =>
      prev.map((t) =>
        t.nome === novoTurno
          ? { ...t, funcionarios: ordenarNomes([...t.funcionarios, nomeLimpo]) }
          : t
      )
    );

    setSetoresFuncionarios((prev) => ({
      ...prev,
      [nomeLimpo]: novoSetor,
    }));

    setVigenciaFuncionarios((prev) => ({
      ...prev,
      [nomeLimpo]: {
        admissao: novaDataAdmissao || getHojeISO(),
        desligamento: null,
      },
    }));

    if (novasFolgasFixas.length > 0) {
      setFolgasFixas((prev) => ({
        ...prev,
        [nomeLimpo]: novasFolgasFixas,
      }));
    }

    setNovoNome('');
    setNovoSetor('Suporte');
    setNovaDataAdmissao(getHojeISO());
    setNovasFolgasFixas(['dom']);
    setErroCadastro('');
  };

  // Iniciar edição de colaborador (ADMIN)
  const iniciarEdicaoColaborador = (nome, turnoNome) => {
    const vig = getVigenciaColaborador(nome);
    setEditandoFunc({ nomeOriginal: nome, turnoOriginal: turnoNome });
    setEditNome(nome);
    setEditSetor(getSetorColaborador(nome));
    setEditTurno(turnoNome);
    setEditDataAdmissao(vig.admissao);
    setEditDataDesligamento(vig.desligamento || '');
    setEditFolgasFixas(folgasFixas[nome] || []);
    setErroEdicao('');
  };

  // Salvar edição de colaborador (ADMIN)
  const salvarEdicaoColaborador = (e) => {
    e.preventDefault();
    if (!isAdmin || !editandoFunc) return;

    const nomeLimpo = editNome.trim();
    if (!nomeLimpo) {
      setErroEdicao('O nome do colaborador não pode ficar vazio.');
      return;
    }

    if (editDataDesligamento && editDataAdmissao && editDataDesligamento < editDataAdmissao) {
      setErroEdicao('A data de desligamento não pode ser anterior à data de admissão.');
      return;
    }

    const mudouNome =
      nomeLimpo.toLowerCase() !== editandoFunc.nomeOriginal.toLowerCase();
    if (mudouNome) {
      const jaExiste = todosFuncionariosOrdenados.some(
        (f) => f.toLowerCase() === nomeLimpo.toLowerCase()
      );
      if (jaExiste) {
        setErroEdicao('Já existe outro colaborador com esse nome.');
        return;
      }
    }

    const { nomeOriginal } = editandoFunc;

    // Atualiza lista de turnos e ordena
    setTurnosFuncionarios((prev) =>
      prev.map((t) => {
        const semAntigo = t.funcionarios.filter((f) => f !== nomeOriginal);
        if (t.nome === editTurno) {
          return { ...t, funcionarios: ordenarNomes([...semAntigo, nomeLimpo]) };
        }
        return { ...t, funcionarios: ordenarNomes(semAntigo) };
      })
    );

    // Atualiza setor
    setSetoresFuncionarios((prev) => {
      const copia = { ...prev };
      if (nomeOriginal !== nomeLimpo) {
        delete copia[nomeOriginal];
      }
      copia[nomeLimpo] = editSetor;
      return copia;
    });

    // Atualiza vigência (admissão / desligamento)
    setVigenciaFuncionarios((prev) => {
      const copia = { ...prev };
      if (nomeOriginal !== nomeLimpo) {
        delete copia[nomeOriginal];
      }
      copia[nomeLimpo] = {
        admissao: editDataAdmissao || '2026-01-01',
        desligamento: editDataDesligamento || null,
      };
      return copia;
    });

    // Atualiza folgas fixas
    setFolgasFixas((prev) => {
      const copia = { ...prev };
      if (nomeOriginal !== nomeLimpo) {
        delete copia[nomeOriginal];
      }
      copia[nomeLimpo] = editFolgasFixas;
      return copia;
    });

    // Se o nome foi alterado, migra registros semanais e observações
    if (nomeOriginal !== nomeLimpo) {
      setEscalas((prev) => {
        const atualizado = {};
        Object.keys(prev).forEach((semana) => {
          const dadosSemana = { ...prev[semana] };
          if (dadosSemana[nomeOriginal]) {
            dadosSemana[nomeLimpo] = dadosSemana[nomeOriginal];
            delete dadosSemana[nomeOriginal];
          }
          atualizado[semana] = dadosSemana;
        });
        return atualizado;
      });

      setObservacoes((prev) => {
        const atualizado = {};
        Object.keys(prev).forEach((semana) => {
          const dadosSemana = { ...prev[semana] };
          if (dadosSemana[nomeOriginal]) {
            dadosSemana[nomeLimpo] = dadosSemana[nomeOriginal];
            delete dadosSemana[nomeOriginal];
          }
          atualizado[semana] = dadosSemana;
        });
        return atualizado;
      });

      if (funcSelecionado === nomeOriginal) {
        setFuncSelecionado(nomeLimpo);
      }
    }

    setEditandoFunc(null);
    setErroEdicao('');
  };

  // Confirmar desligamento preservando histórico
  const confirmarDesligamento = (e) => {
    e.preventDefault();
    if (!isAdmin || !desligandoFunc) return;

    const { nome } = desligandoFunc;
    const vigAtual = getVigenciaColaborador(nome);
    const dataFinal = dataDesligamentoInput || getHojeISO();

    if (vigAtual.admissao && dataFinal < vigAtual.admissao) {
      alert('A data de desligamento não pode ser anterior à data de admissão.');
      return;
    }

    setVigenciaFuncionarios((prev) => ({
      ...prev,
      [nome]: {
        admissao: vigAtual.admissao,
        desligamento: dataFinal,
      },
    }));

    setDesligandoFunc(null);
  };

  // Reativar colaborador desligado
  const reativarColaborador = (nome) => {
    if (!isAdmin) return;
    const vigAtual = getVigenciaColaborador(nome);
    setVigenciaFuncionarios((prev) => ({
      ...prev,
      [nome]: {
        admissao: vigAtual.admissao,
        desligamento: null,
      },
    }));
  };

  // Excluir cadastro definitivamente (apenas para erro de digitação/duplicidade)
  const excluirDefinitivamente = (nomeRemover, turnoNome) => {
    if (!isAdmin) return;
    const confirmar = window.confirm(
      `ATENÇÃO: Isso apagará "${nomeRemover}" e TODO o histórico de escalas dele.\n\nSe ele apenas saiu da empresa, use "Desligar" para manter o histórico.\nDeseja realmente excluir definitivamente?`
    );
    if (!confirmar) return;

    if (editandoFunc?.nomeOriginal === nomeRemover) {
      setEditandoFunc(null);
    }

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

  const toggleEditFolgaFixa = (diaId) => {
    setEditFolgasFixas((prev) =>
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
        dataISO: toISODate(dataDia),
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

  // Verifica se o colaborador teve pelo menos 1 dia ativo na semana exibida
  const isAtivoNaSemanaExibida = (nome) => {
    return diasCalculados.some((dia) => isAtivoNaData(nome, dia.dataISO));
  };

 // Contagem e datas de faltas por operador no mês (considerando apenas dias em que estava ativo)
  const relatorioFaltasPorOperador = useMemo(() => {
    const targetAno = parseInt(anoFaltas, 10);
    const targetMes = parseInt(mesFaltas, 10) - 1;
    const totalDiasNoMes = new Date(targetAno, targetMes + 1, 0).getDate();
    const inicioMesISO = `${anoFaltas}-${mesFaltas}-01`;
    const fimMesISO = `${anoFaltas}-${mesFaltas}-${String(totalDiasNoMes).padStart(2, '0')}`;

    const funcionariosDoMes = todosFuncionariosOrdenados.filter((nome) => {
      const { admissao, desligamento } = getVigenciaColaborador(nome);
      if (admissao && admissao > fimMesISO) return false;
      if (desligamento && desligamento < inicioMesISO) return false;
      return true;
    });

    const mapaFaltas = {};
    funcionariosDoMes.forEach((nome) => {
      mapaFaltas[nome] = [];
    });

    const mapIds = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

    for (let dia = 1; dia <= totalDiasNoMes; dia++) {
      const dataAtual = new Date(targetAno, targetMes, dia);
      const dataISO = toISODate(dataAtual);
      const diaSemanaIdx = dataAtual.getDay();
      const diffSeg = diaSemanaIdx === 0 ? -6 : 1 - diaSemanaIdx;
      const segDaquelaSemana = new Date(dataAtual);
      segDaquelaSemana.setDate(dataAtual.getDate() + diffSeg);
      const chaveDaquelaSemana = `semana_${toISODate(segDaquelaSemana)}`;
      const diaIdKey = mapIds[diaSemanaIdx];

      funcionariosDoMes.forEach((nome) => {
        if (!isAtivoNaData(nome, dataISO)) return;
        if (getStatus(nome, diaIdKey, chaveDaquelaSemana) === 'FALTA') {
          const dataCurta = `${String(dia).padStart(2, '0')}/${mesFaltas}`;
          const obs = getObservacao(nome, diaIdKey, chaveDaquelaSemana).trim();
          mapaFaltas[nome].push(obs ? `${dataCurta} (${obs})` : dataCurta);
        }
      });
    }

    return Object.entries(mapaFaltas).map(([nome, diasFaltados]) => ({
      nome,
      totalFaltas: diasFaltados.length,
      diasFaltados,
    }));
  }, [anoFaltas, mesFaltas, escalas, observacoes, todosFuncionariosOrdenados, vigenciaFuncionarios]);

  // PDF Mensal de Faltas (quantidade + dias exatos de falta por colaborador)
  const exportarPDFFaltasMes = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let y = 16;

    const mesLabel = MESES_OPCOES.find((m) => m.value === mesFaltas)?.label || mesFaltas;
    const totalGeralFaltas = relatorioFaltasPorOperador.reduce((acc, item) => acc + item.totalFaltas, 0);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('MX Soluções - Relatório Mensal de Faltas', 14, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Referência: ${mesLabel} / ${anoFaltas} | Total de faltas no mês: ${totalGeralFaltas}`, 14, y + 6);
    y += 15;

    doc.setFillColor(226, 232, 240);
    doc.rect(14, y, 182, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('Operador (Setor)', 17, y + 5.5);
    doc.text('Qtd.', 85, y + 5.5);
    doc.text('Datas das Faltas', 102, y + 5.5);
    y += 13;

    relatorioFaltasPorOperador.forEach((item, idx) => {
      const textoDatas = item.diasFaltados.length > 0 ? item.diasFaltados.join(', ') : '-';
      const linhasDatas = doc.splitTextToSize(textoDatas, 90);
      const alturaLinha = Math.max(6.5, linhasDatas.length * 4.8 + 2);

      if (y + alturaLinha > 275) {
        doc.addPage();
        y = 16;
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 4, 182, alturaLinha, 'F');
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(`${item.nome} (${getSetorColaborador(item.nome)})`, 17, y);

      if (item.totalFaltas > 0) {
        doc.setTextColor(220, 38, 38);
      } else {
        doc.setTextColor(22, 163, 74);
      }
      doc.text(String(item.totalFaltas), 88, y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(linhasDatas, 102, y);

      y += alturaLinha;
    });

    doc.save(`relatorio_faltas_${mesFaltas}-${anoFaltas}.pdf`);
  };

  // PDF Semanal Geral (respeitando vigência na semana e filtro de setor)
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
    const subtituloSetor = setorFiltro === 'TODOS' ? 'Todos os Setores' : `Setor: ${setorFiltro}`;
    doc.text(`Período da Escala: ${periodoTexto} | ${subtituloSetor}`, 14, y + 6);
    y += 16;

    turnosFuncionarios.forEach((turno) => {
      const listaOrdenada = ordenarNomes(turno.funcionarios).filter((nome) => {
        const bateSetor = setorFiltro === 'TODOS' ? true : getSetorColaborador(nome) === setorFiltro;
        return bateSetor && isAtivoNaSemanaExibida(nome);
      });
      if (listaOrdenada.length === 0) return;

      if (y > 175) {
        doc.addPage();
        y = 16;
      }

      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, 269, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`TURNO: ${turno.nome.toUpperCase()} (${listaOrdenada.length} Colaboradores)`, 16, y + 5);
      y += 9;

      doc.setFillColor(226, 232, 240);
      doc.rect(14, y, 269, 7, 'F');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text('Funcionário (Setor)', 16, y + 5);

      const colWidth = 30;
      diasCalculados.forEach((dia, i) => {
        const xPos = 62 + i * colWidth;
        doc.text(`${dia.label} (${dia.dataFormatada})`, xPos, y + 5);
      });
      y += 12;

      doc.setFont('helvetica', 'normal');
      listaOrdenada.forEach((nome, idx) => {
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
        doc.text(`${nome} (${getSetorColaborador(nome)})`, 16, y);

        doc.setFont('helvetica', 'normal');
        diasCalculados.forEach((dia, i) => {
          const xPos = 62 + i * colWidth;
          const motivoInativo = getMotivoInativoNaData(nome, dia.dataISO);

          if (motivoInativo) {
            doc.setTextColor(148, 163, 184);
            doc.text(motivoInativo === 'DESLIGADO' ? 'Desligado' : '-', xPos, y);
            return;
          }

          const status = getStatus(nome, dia.id);
          if (status === 'TRABALHO') {
            doc.setTextColor(22, 163, 74);
            doc.text('Trabalho', xPos, y);
          } else if (status === 'FOLGA') {
            doc.setTextColor(37, 99, 235);
            doc.text('FOLGA', xPos, y);
          } else if (status === 'FERIADO') {
            doc.setTextColor(8, 145, 178);
            doc.text('FERIADO', xPos, y);
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

  // PDF Individual Mensal (preserva histórico completo até a data de desligamento)
  const exportarPDFMensalIndividual = () => {
    const ano = parseInt(anoSelecionado, 10);
    const mes = parseInt(mesSelecionado, 10) - 1;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let y = 16;

    const totalDiasNoMes = new Date(ano, mes + 1, 0).getDate();
    const nomeMesExtenso = new Date(ano, mes, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

    const turnoObj = turnosFuncionarios.find((t) => t.funcionarios.includes(funcSelecionado));
    const turnoNome = turnoObj ? turnoObj.nome : 'N/A';
    const setorNome = getSetorColaborador(funcSelecionado);
    const vig = getVigenciaColaborador(funcSelecionado);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('MX Soluções - Espelho de Escala Mensal', 14, y);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Colaborador: ${funcSelecionado} | Setor: ${setorNome} | Turno: ${turnoNome}`, 14, y + 6);

    const textoVinculo = vig.desligamento
      ? `Admissão: ${formatarDataBR(vig.admissao)} | Desligamento: ${formatarDataBR(vig.desligamento)}`
      : `Admissão: ${formatarDataBR(vig.admissao)} | Situação: Ativo`;
    doc.text(`Mês de Referência: ${nomeMesExtenso.toUpperCase()} | ${textoVinculo}`, 14, y + 11.5);

    y += 22;

    doc.setFillColor(226, 232, 240);
    doc.rect(14, y, 182, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('Data', 18, y + 5.5);
    doc.text('Dia da Semana', 60, y + 5.5);
    doc.text('Status Registrado / Observação', 130, y + 5.5);

    y += 13;

    const resumo = { TRABALHO: 0, FOLGA: 0, FERIADO: 0, ATESTADO: 0, DAY_OFF: 0, FALTA: 0 };
    const diasSemanaNomes = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

    doc.setFont('helvetica', 'normal');

    for (let dia = 1; dia <= totalDiasNoMes; dia++) {
      if (y > 265) {
        doc.addPage();
        y = 16;
      }

      const dataAtual = new Date(ano, mes, dia);
      const dataISO = toISODate(dataAtual);
      const diaSemanaIdx = dataAtual.getDay();
      const dataFmt = `${String(dia).padStart(2, '0')}/${String(mes + 1).padStart(2, '0')}/${ano}`;
      const diaSemanaNome = diasSemanaNomes[diaSemanaIdx];

      if (dia % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 4, 182, 6.5, 'F');
      }

      doc.setTextColor(30, 41, 59);
      doc.text(dataFmt, 18, y);
      doc.text(diaSemanaNome, 60, y);

      const motivoInativo = getMotivoInativoNaData(funcSelecionado, dataISO);
      if (motivoInativo) {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 116, 139);
        doc.text(
          motivoInativo === 'DESLIGADO' ? 'Desligado da empresa' : 'Anterior à admissão',
          130,
          y
        );
        doc.setFont('helvetica', 'normal');
        y += 6.5;
        continue;
      }

      const diffSeg = diaSemanaIdx === 0 ? -6 : 1 - diaSemanaIdx;
      const segDaquelaSemana = new Date(dataAtual);
      segDaquelaSemana.setDate(dataAtual.getDate() + diffSeg);
      const chaveDaquelaSemana = `semana_${toISODate(segDaquelaSemana)}`;

      const mapIds = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
      const diaIdKey = mapIds[diaSemanaIdx];

      const statusAtual = getStatus(funcSelecionado, diaIdKey, chaveDaquelaSemana);
      const obsAtual = getObservacao(funcSelecionado, diaIdKey, chaveDaquelaSemana);
      resumo[statusAtual] = (resumo[statusAtual] || 0) + 1;

      const confStatus = STATUS_OPCOES.find((s) => s.value === statusAtual) || STATUS_OPCOES[0];
      doc.setFont('helvetica', 'bold');
      if (statusAtual === 'TRABALHO') doc.setTextColor(22, 163, 74);
      else if (statusAtual === 'FOLGA') doc.setTextColor(37, 99, 235);
      else if (statusAtual === 'FERIADO') doc.setTextColor(8, 145, 178);
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
    doc.text('RESUMO DO MÊS (PERÍODO ATIVO)', 18, y + 6);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);

    doc.text(`• Dias de Trabalho: ${resumo.TRABALHO}`, 18, y + 13);
    doc.text(`• Folgas: ${resumo.FOLGA}`, 18, y + 19);
    doc.text(`• Feriados: ${resumo.FERIADO}`, 85, y + 13);
    doc.text(`• Day Off: ${resumo.DAY_OFF}`, 85, y + 19);
    doc.text(`• Atestados: ${resumo.ATESTADO}`, 145, y + 13);
    doc.text(`• Faltas: ${resumo.FALTA}`, 145, y + 19);

    const nomeFich = `escala_mensal_${funcSelecionado.toLowerCase().replace(/\s+/g, '_')}_${mesSelecionado}-${anoSelecionado}.pdf`;
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
      gap: '14px',
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
      minWidth: '210px',
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
            Acompanhamento semanal de setores, turnos, folgas e ausências.
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
                setEditandoFunc(null);
                setDesligandoFunc(null);
                setBuscaGerenciarFunc('');
                setNovaDataAdmissao(getHojeISO());
                setModalGerenciarAberto(true);
              }}
              style={styles.buttonAdmin}
              title="Adicionar, editar ou desligar funcionários da escala (Apenas Admin)"
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
              const inicial =
                todosFuncionariosOrdenados.includes(funcSelecionado)
                  ? funcSelecionado
                  : todosFuncionariosOrdenados[0] || '';
              setFuncSelecionado(inicial);
              setBuscaPdfFunc(inicial);
              setDropdownPdfAberto(false);
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
            width: '660px',
            maxWidth: '95%',
            maxHeight: '88vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
            color: isDark ? '#ffffff' : '#000000'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>Gerenciar Colaboradores da Escala</h3>
              <button
                onClick={() => {
                  setEditandoFunc(null);
                  setDesligandoFunc(null);
                  setBuscaGerenciarFunc('');
                  setModalGerenciarAberto(false);
                }}
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

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.2fr', gap: '10px', marginBottom: '12px' }}>
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
                    Setor:
                  </label>
                  <select
                    value={novoSetor}
                    onChange={(e) => setNovoSetor(e.target.value)}
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
                    {SETORES_DISPONIVEIS.map((setor) => (
                      <option key={setor} value={setor}>{setor}</option>
                    ))}
                  </select>
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

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                    Admissão:
                  </label>
                  <input
                    type="date"
                    value={novaDataAdmissao}
                    onChange={(e) => setNovaDataAdmissao(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px',
                      borderRadius: '6px',
                      border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                      background: isDark ? '#1e293b' : '#ffffff',
                      color: isDark ? '#ffffff' : '#000000',
                      boxSizing: 'border-box'
                    }}
                  />
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

            {/* Listagem ordenada por turno com filtro de pesquisa */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <h4 style={{ margin: 0, fontSize: '14px' }}>Colaboradores Cadastrados (A–Z)</h4>
                <input
                  type="text"
                  placeholder="Pesquisar colaborador..."
                  value={buscaGerenciarFunc}
                  onChange={(e) => setBuscaGerenciarFunc(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                    background: isDark ? '#0f172a' : '#ffffff',
                    color: isDark ? '#ffffff' : '#000000',
                    fontSize: '12px',
                    minWidth: '210px',
                    outline: 'none'
                  }}
                />
              </div>

              {turnosFuncionarios.map((turno) => {
                const termo = buscaGerenciarFunc.trim().toLowerCase();
                const listaOrdenada = ordenarNomes(turno.funcionarios).filter((nome) =>
                  termo ? nome.toLowerCase().includes(termo) : true
                );

                if (termo && listaOrdenada.length === 0) return null;

                return (
                  <div key={turno.nome} style={{ marginBottom: '14px' }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      padding: '4px 8px',
                      background: isDark ? '#0f172a' : '#f1f5f9',
                      borderRadius: '4px',
                      marginBottom: '6px'
                    }}>
                      Turno {turno.nome} ({listaOrdenada.length})
                    </div>

                    {listaOrdenada.length === 0 ? (
                      <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 8px' }}>Nenhum colaborador neste turno.</p>
                    ) : (
                      listaOrdenada.map((nome) => {
                        const setorAtual = getSetorColaborador(nome);
                        const vig = getVigenciaColaborador(nome);
                        const desligado = Boolean(vig.desligamento);
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
                              padding: '8px',
                              borderBottom: isDark ? '1px solid #334155' : '1px solid #f1f5f9',
                              fontSize: '13px',
                              gap: '8px',
                              opacity: desligado ? 0.78 : 1,
                              background: desligado
                                ? (isDark ? 'rgba(220, 38, 38, 0.08)' : '#fef2f2')
                                : 'transparent'
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                <strong>{nome}</strong>
                                <span style={{
                                  fontSize: '11px',
                                  padding: '1px 7px',
                                  borderRadius: '999px',
                                  background: isDark ? '#334155' : '#e2e8f0',
                                  color: isDark ? '#e2e8f0' : '#1e293b',
                                  fontWeight: '600'
                                }}>
                                  {setorAtual}
                                </span>
                                {desligado ? (
                                  <span style={{
                                    fontSize: '11px',
                                    padding: '1px 7px',
                                    borderRadius: '999px',
                                    background: '#fee2e2',
                                    color: '#b91c1c',
                                    fontWeight: 'bold'
                                  }}>
                                    Desligado em {formatarDataBR(vig.desligamento)}
                                  </span>
                                ) : (
                                  fixas && (
                                    <span style={{ fontSize: '11px', color: '#2563eb' }}>
                                      (Folga fixa: {fixas})
                                    </span>
                                  )
                                )}
                              </div>
                              <div style={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b', marginTop: '2px' }}>
                                Admissão: {formatarDataBR(vig.admissao)}
                                {desligado && ` • Histórico preservado até ${formatarDataBR(vig.desligamento)}`}
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                              <button
                                type="button"
                                onClick={() => iniciarEdicaoColaborador(nome, turno.nome)}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '4px',
                                  border: '1px solid #2563eb',
                                  background: 'transparent',
                                  color: isDark ? '#60a5fa' : '#2563eb',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  cursor: 'pointer'
                                }}
                              >
                                Editar
                              </button>

                              {!desligado ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDataDesligamentoInput(getHojeISO());
                                    setDesligandoFunc({ nome, turnoNome: turno.nome });
                                  }}
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: '4px',
                                    border: '1px solid #d97706',
                                    background: 'transparent',
                                    color: isDark ? '#fbbf24' : '#b45309',
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Desligar
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => reativarColaborador(nome)}
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: '4px',
                                    border: '1px solid #16a34a',
                                    background: 'transparent',
                                    color: '#16a34a',
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Reativar
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => excluirDefinitivamente(nome, turno.nome)}
                                title="Apagar cadastro definitivamente (apenas em caso de erro de cadastro)"
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid #dc2626',
                                  background: 'transparent',
                                  color: '#dc2626',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  cursor: 'pointer'
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button
                onClick={() => {
                  setEditandoFunc(null);
                  setDesligandoFunc(null);
                  setBuscaGerenciarFunc('');
                  setModalGerenciarAberto(false);
                }}
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

      {/* MODAL SECUNDÁRIO DE DESLIGAMENTO (PRESERVA HISTÓRICO) */}
      {isAdmin && desligandoFunc && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.72)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1100
        }}>
          <div style={{
            background: isDark ? '#1e293b' : '#ffffff',
            padding: '24px',
            borderRadius: '12px',
            width: '440px',
            maxWidth: '92%',
            boxShadow: '0 25px 35px -5px rgba(0,0,0,0.45)',
            border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
            color: isDark ? '#ffffff' : '#000000'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', color: '#d97706' }}>
              Registrar Desligamento: {desligandoFunc.nome}
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: isDark ? '#cbd5e1' : '#475569' }}>
              Todo o histórico de escalas, folgas, feriados e faltas até a data abaixo será mantido nos registros e nos relatórios em PDF.
            </p>

            <form onSubmit={confirmarDesligamento}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>
                  Último dia trabalhado / Data de desligamento:
                </label>
                <input
                  type="date"
                  value={dataDesligamentoInput}
                  onChange={(e) => setDataDesligamentoInput(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                    background: isDark ? '#0f172a' : '#ffffff',
                    color: isDark ? '#ffffff' : '#000000',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setDesligandoFunc(null)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid #94a3b8',
                    background: 'transparent',
                    color: isDark ? '#ffffff' : '#000000',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '13px'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#d97706',
                    color: '#ffffff',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Confirmar Desligamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SECUNDÁRIO DE EDIÇÃO DE COLABORADOR (SOBREPOSTO) */}
      {isAdmin && editandoFunc && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.72)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1100
        }}>
          <div style={{
            background: isDark ? '#1e293b' : '#ffffff',
            padding: '24px',
            borderRadius: '12px',
            width: '520px',
            maxWidth: '94%',
            boxShadow: '0 25px 35px -5px rgba(0,0,0,0.45)',
            border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
            color: isDark ? '#ffffff' : '#000000'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', color: isDark ? '#93c5fd' : '#1d4ed8' }}>
                ✏️ Editar Colaborador: {editandoFunc.nomeOriginal}
              </h3>
              <button
                type="button"
                onClick={() => setEditandoFunc(null)}
                style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: isDark ? '#94a3b8' : '#475569' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={salvarEdicaoColaborador}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                    Nome:
                  </label>
                  <input
                    type="text"
                    value={editNome}
                    onChange={(e) => setEditNome(e.target.value)}
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                      background: isDark ? '#0f172a' : '#ffffff',
                      color: isDark ? '#ffffff' : '#000000',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                    Setor:
                  </label>
                  <select
                    value={editSetor}
                    onChange={(e) => setEditSetor(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                      background: isDark ? '#0f172a' : '#ffffff',
                      color: isDark ? '#ffffff' : '#000000',
                      boxSizing: 'border-box'
                    }}
                  >
                    {SETORES_DISPONIVEIS.map((setor) => (
                      <option key={setor} value={setor}>{setor}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                    Turno:
                  </label>
                  <select
                    value={editTurno}
                    onChange={(e) => setEditTurno(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                      background: isDark ? '#0f172a' : '#ffffff',
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

              {/* Datas de Admissão e Desligamento */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                    Data de Admissão:
                  </label>
                  <input
                    type="date"
                    value={editDataAdmissao}
                    onChange={(e) => setEditDataAdmissao(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                      background: isDark ? '#0f172a' : '#ffffff',
                      color: isDark ? '#ffffff' : '#000000',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                    Data de Desligamento (opcional):
                  </label>
                  <input
                    type="date"
                    value={editDataDesligamento}
                    onChange={(e) => setEditDataDesligamento(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                      background: isDark ? '#0f172a' : '#ffffff',
                      color: isDark ? '#ffffff' : '#000000',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>
                  Dias de folga fixa semanal:
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {DIAS_NOMES.map((dia) => {
                    const marcado = editFolgasFixas.includes(dia.id);
                    return (
                      <button
                        key={dia.id}
                        type="button"
                        onClick={() => toggleEditFolgaFixa(dia.id)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: marcado
                            ? '2px solid #2563eb'
                            : isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                          background: marcado
                            ? (isDark ? '#1e3a8a' : '#dbeafe')
                            : (isDark ? '#0f172a' : '#f8fafc'),
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

              {erroEdicao && (
                <p style={{ color: '#dc2626', fontSize: '12px', margin: '0 0 12px 0', fontWeight: 'bold' }}>
                  {erroEdicao}
                </p>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditandoFunc(null)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid #94a3b8',
                    background: 'transparent',
                    color: isDark ? '#ffffff' : '#000000',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '13px'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
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

      {/* MODAL MENSAL INDIVIDUAL (INCLUI DESLIGADOS PARA CONSULTA HISTÓRICA) */}
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
            width: '440px',
            maxWidth: '92%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
            color: isDark ? '#ffffff' : '#000000'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Gerar Relatório Mensal</h3>

            <div style={{ marginBottom: '16px', position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: 'bold' }}>
                Colaborador:
              </label>

              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Digite o nome (ex: Mar...)"
                  value={buscaPdfFunc}
                  onFocus={() => setDropdownPdfAberto(true)}
                  onChange={(e) => {
                    const valor = e.target.value;
                    setBuscaPdfFunc(valor);
                    setDropdownPdfAberto(true);

                    const exato = todosFuncionariosOrdenados.find(
                      (n) => n.toLowerCase() === valor.trim().toLowerCase()
                    );
                    setFuncSelecionado(exato || '');
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 32px 9px 10px',
                    borderRadius: '6px',
                    border: funcSelecionado
                      ? '1px solid #0d9488'
                      : isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                    background: isDark ? '#0f172a' : '#fff',
                    color: isDark ? '#fff' : '#000',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />

                {buscaPdfFunc && (
                  <button
                    type="button"
                    title="Limpar pesquisa"
                    onClick={() => {
                      setBuscaPdfFunc('');
                      setFuncSelecionado('');
                      setDropdownPdfAberto(true);
                    }}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: isDark ? '#94a3b8' : '#64748b',
                      cursor: 'pointer',
                      fontSize: '14px',
                      padding: '2px 4px'
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {dropdownPdfAberto && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    maxHeight: '190px',
                    overflowY: 'auto',
                    borderRadius: '6px',
                    border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                    background: isDark ? '#0f172a' : '#ffffff',
                    boxShadow: '0 10px 20px rgba(0,0,0,0.25)',
                    zIndex: 1200
                  }}
                >
                  {funcionariosFiltradosPdf.length === 0 ? (
                    <div style={{ padding: '10px 12px', fontSize: '13px', color: '#94a3b8' }}>
                      Nenhum colaborador encontrado
                    </div>
                  ) : (
                    funcionariosFiltradosPdf.map((nome) => {
                      const vig = getVigenciaColaborador(nome);
                      const selecionado = nome === funcSelecionado;
                      return (
                        <div
                          key={nome}
                          onClick={() => {
                            setFuncSelecionado(nome);
                            setBuscaPdfFunc(nome);
                            setDropdownPdfAberto(false);
                          }}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '8px',
                            background: selecionado
                              ? (isDark ? '#1e3a8a' : '#dbeafe')
                              : 'transparent',
                            borderBottom: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9'
                          }}
                        >
                          <span style={{ fontWeight: selecionado ? 'bold' : '500' }}>
                            {nome}{' '}
                            <span style={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b' }}>
                              ({getSetorColaborador(nome)})
                            </span>
                          </span>

                          {vig.desligamento && (
                            <span style={{
                              fontSize: '10px',
                              padding: '1px 6px',
                              borderRadius: '999px',
                              background: '#fee2e2',
                              color: '#b91c1c',
                              fontWeight: 'bold',
                              flexShrink: 0
                            }}>
                              Desligado em {formatarDataBR(vig.desligamento)}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {!funcSelecionado && buscaPdfFunc.trim() !== '' && (
                <span style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: '#d97706' }}>
                  Clique em um colaborador da lista acima para selecioná-lo.
                </span>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: 'bold' }}>
                Mês / Ano:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                <select
                  value={mesSelecionado}
                  onChange={(e) => setMesSelecionado(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                    background: isDark ? '#0f172a' : '#fff',
                    color: isDark ? '#fff' : '#000',
                    boxSizing: 'border-box'
                  }}
                >
                  {MESES_OPCOES.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>

                <select
                  value={anoSelecionado}
                  onChange={(e) => setAnoSelecionado(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                    background: isDark ? '#0f172a' : '#fff',
                    color: isDark ? '#fff' : '#000',
                    boxSizing: 'border-box'
                  }}
                >
                  {anosDisponiveis.map((ano) => (
                    <option key={ano} value={ano}>{ano}</option>
                  ))}
                </select>
              </div>
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
                disabled={!funcSelecionado}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: funcSelecionado ? '#0d9488' : '#64748b',
                  color: '#fff',
                  fontWeight: 'bold',
                  cursor: funcSelecionado ? 'pointer' : 'not-allowed'
                }}
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
            width: '520px',
            maxWidth: '92%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
            color: isDark ? '#ffffff' : '#000000'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Relatório de Faltas no Mês</h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: 'bold' }}>Mês / Ano:</label>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                <select
                  value={mesFaltas}
                  onChange={(e) => setMesFaltas(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                    background: isDark ? '#0f172a' : '#fff',
                    color: isDark ? '#fff' : '#000',
                    boxSizing: 'border-box'
                  }}
                >
                  {MESES_OPCOES.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>

                <select
                  value={anoFaltas}
                  onChange={(e) => setAnoFaltas(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                    background: isDark ? '#0f172a' : '#fff',
                    color: isDark ? '#fff' : '#000',
                    boxSizing: 'border-box'
                  }}
                >
                  {anosDisponiveis.map((ano) => (
                    <option key={ano} value={ano}>{ano}</option>
                  ))}
                </select>
              </div>
            </div>

           <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: isDark ? '#0f172a' : '#f1f5f9' }}>
                  <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>Operador</th>
                  <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #cbd5e1', width: '70px' }}>Qtd.</th>
                  <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>Dias que faltou</th>
                </tr>
              </thead>
              <tbody>
                {relatorioFaltasPorOperador.map((item) => (
                  <tr key={item.nome} style={{ borderBottom: isDark ? '1px solid #334155' : '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px' }}>
                      {item.nome}{' '}
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        ({getSetorColaborador(item.nome)})
                      </span>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', color: item.totalFaltas > 0 ? '#dc2626' : '#16a34a' }}>
                      {item.totalFaltas}
                    </td>
                    <td style={{ padding: '8px', fontSize: '12px', color: item.diasFaltados.length > 0 ? (isDark ? '#fca5a5' : '#b91c1c') : '#64748b' }}>
                      {item.diasFaltados.length > 0 ? item.diasFaltados.join(', ') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setModalFaltasAberto(false)}
                style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #94a3b8', background: 'transparent', color: isDark ? '#fff' : '#000', cursor: 'pointer' }}
              >
                Fechar
              </button>
              <button
                onClick={exportarPDFFaltasMes}
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#dc2626', color: '#ffffff', fontWeight: 'bold', cursor: 'pointer' }}
              >
                📄 Gerar PDF
              </button>
            </div>
          </div>
        </div>
      )
           }

      {/* Barra de Filtros (Busca + Setor + Turno) */}
      <div style={styles.filterBar}>
        <input
          type="text"
          placeholder="Buscar colaborador..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={styles.input}
        />

        {/* Filtro por Setor */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: isDark ? '#94a3b8' : '#475569' }}>
            Setor:
          </span>
          {['TODOS', ...SETORES_DISPONIVEIS].map((setor) => {
            const ativo = setorFiltro === setor;
            return (
              <button
                key={setor}
                onClick={() => setSetorFiltro(setor)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: ativo ? '1px solid #4f46e5' : isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                  background: ativo ? '#4f46e5' : isDark ? '#0f172a' : '#ffffff',
                  color: ativo ? '#ffffff' : isDark ? '#cbd5e1' : '#000000',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                }}
              >
                {setor === 'TODOS' ? 'Todos os Setores' : setor}
              </button>
            );
          })}
        </div>

        {/* Filtro por Turno */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: isDark ? '#94a3b8' : '#475569' }}>
            Turno:
          </span>
          {['TODOS', 'Manhã', 'Tarde', 'Noite'].map((t) => {
            const ativo = turnoFiltro === t;
            return (
              <button
                key={t}
                onClick={() => setTurnoFiltro(t)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: ativo ? '1px solid #0284c7' : isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                  background: ativo ? '#0284c7' : isDark ? '#0f172a' : '#ffffff',
                  color: ativo ? '#ffffff' : isDark ? '#cbd5e1' : '#000000',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                }}
              >
                {t === 'TODOS' ? 'Todos os Turnos' : t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabelas de Turno (ordenadas alfabeticamente, filtradas por vigência na semana, setor e busca) */}
      {turnosFiltrados.map((turno) => {
        const funcionariosFiltrados = ordenarNomes(turno.funcionarios).filter((nome) => {
          const bateNome = nome.toLowerCase().includes(busca.toLowerCase());
          const bateSetor =
            setorFiltro === 'TODOS' ? true : getSetorColaborador(nome) === setorFiltro;
          const ativoNaSemana = isAtivoNaSemanaExibida(nome);
          return bateNome && bateSetor && ativoNaSemana;
        });

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
                    <th style={{ ...styles.th, width: '230px', textAlign: 'left', paddingLeft: '16px' }}>
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

                    const setorAtual = getSetorColaborador(nome);
                    const vig = getVigenciaColaborador(nome);
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span>{nome}</span>
                            <span style={{
                              fontSize: '10px',
                              padding: '1px 6px',
                              borderRadius: '999px',
                              background: isDark ? '#334155' : '#e2e8f0',
                              color: isDark ? '#cbd5e1' : '#334155',
                              fontWeight: '600',
                            }}>
                              {setorAtual}
                            </span>
                            {vig.desligamento && (
                              <span style={{
                                fontSize: '10px',
                                padding: '1px 6px',
                                borderRadius: '999px',
                                background: '#fee2e2',
                                color: '#b91c1c',
                                fontWeight: 'bold',
                              }}>
                                Saiu em {formatarDataBR(vig.desligamento)}
                              </span>
                            )}
                          </div>
                          {isAdmin ? (
                            <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                onClick={() => setFuncFolgaFixaModal(nome)}
                                title="Configurar dias fixos de folga deste colaborador"
                                style={{
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

                              <button
                                type="button"
                                onClick={() => iniciarEdicaoColaborador(nome, turno.nome)}
                                title="Editar nome, setor, turno, vigência ou folgas fixas"
                                style={{
                                  padding: '2px 7px',
                                  fontSize: '11px',
                                  borderRadius: '4px',
                                  border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                                  background: isDark ? '#0f172a' : '#f8fafc',
                                  color: isDark ? '#cbd5e1' : '#334155',
                                  cursor: 'pointer',
                                  fontWeight: '600',
                                }}
                              >
                                ✏️ Editar
                              </button>
                            </div>
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
                          const motivoInativo = getMotivoInativoNaData(nome, dia.dataISO);

                          if (motivoInativo) {
                            return (
                              <td key={dia.id} style={{ padding: '8px', textAlign: 'center' }}>
                                <div style={{
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  border: isDark ? '1px dashed #475569' : '1px dashed #cbd5e1',
                                  background: isDark ? '#0f172a' : '#f1f5f9',
                                  color: isDark ? '#64748b' : '#94a3b8',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                }}>
                                  {motivoInativo === 'DESLIGADO' ? 'Desligado' : 'Não admitido'}
                                </div>
                              </td>
                            );
                          }

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