# Diário de Bordo — MX Soluções (React SPA)

Migração do protótipo em HTML/CSS/JS único para um projeto React (Vite), organizado para
crescer: hospedagem em servidor, painel admin e um backend real com banco de dados.

## Rodando localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173`. Para gerar o build de produção:

```bash
npm run build
npm run preview
```

## Estrutura

```
src/
  data/localRepository.js   camada de dados (ver "Preparando para um backend real")
  lib/timeStore.js          relógio simulado, compartilhado fora do React
  hooks/                    useSimulatedNow, useUsers
  context/                  AuthContext, AppDataContext
  components/                peças reutilizáveis (Sidebar, Header, FilterBar, TimelineGrid,
                              EventBlock, TaskModal, AuthScreen, Button)
  views/                     HojeView, PassadosView, ConfigView
  utils/                     datas, layout de sobreposição de tarefas, filtros, exportação PDF
  icons.js                   ícones como data-URI SVG, consumidos só via <img>
```

## Preparando para um backend real

Toda a persistência passa por um único arquivo: `src/data/localRepository.js`. Ele expõe um
objeto `repo` com métodos assíncronos (`getUsers`, `saveSharedData`, `getCategories`, etc.).
Hoje cada método lê/escreve no `localStorage`, mas a assinatura já é a de uma API remota.

Quando houver um backend, o caminho é:

1. Criar `src/data/apiRepository.js` com a mesma "forma" (os mesmos métodos, mesmos parâmetros
   de entrada/saída), mas usando `fetch('/api/...')` por dentro.
2. Trocar a importação `import { repo } from '../data/localRepository'` por
   `import { repo } from '../data/apiRepository'` nos contexts (`AuthContext.jsx` e
   `AppDataContext.jsx` são os dois únicos arquivos que importam `repo`).

Nada em `views/` ou `components/` precisa mudar, porque eles só conversam com os contexts.

## Painel admin (próximo passo sugerido, não implementado)

O modelo de usuário (`{ name, email, password }`) já está isolado em `mx_users`. Para um
painel admin, o caminho natural é acrescentar um campo `role: 'admin' | 'member'` ao usuário,
expor uma verificação `currentUser.role === 'admin'` em `AuthContext`, e usar isso para
mostrar um item extra na `Sidebar` e uma view `AdminView` (por exemplo, gestão de usuários,
substituição do dono de uma tarefa, ou exclusão de dias encerrados). A estrutura de
contexts/repo atual já suporta essa extensão sem refatoração.

## O que é simulado, e o que não é

- **Autenticação**: e-mail/senha comparados em texto puro contra `mx_users` no `localStorage`.
  Funciona para o protótipo, mas **não é seguro para produção** — um backend real precisa
  fazer hash de senha (bcrypt/argon2) e nunca devolver a senha ao cliente.
- **Categorias**: globais, guardadas em `mx_categories`, compartilhadas por todos os usuários
  do navegador atual (não há multi-tenant/empresa ainda).
- **Diário**: compartilhado entre todos os usuários logados neste navegador (`mx_shared`) —
  cada tarefa carrega `userEmail`/`userName` de quem criou, e só essa pessoa pode editar ou
  excluir enquanto o dia estiver aberto.
- **Relógio simulado**: em Configurações, para testar o encerramento automático à meia-noite
  sem esperar a data virar de verdade.

## Funcionalidades preservadas desta rodada

- Vínculo obrigatório de cada tarefa a um usuário, com filtro por usuário e por categoria na
  tela principal e nos diários passados.
- Categorias globais com nome e cor personalizados, com CRUD em Configurações.
- Botão "Encerrar dia" atrás de um toggle em Configurações, desabilitado por padrão.
- Tarefas sem horário de término ("em aberto").
- Exportação em PDF sempre disponível, respeitando os filtros ativos.
- Interface 100% responsiva, sem `<svg>` no JSX (ícones via `<img>` com data-URI), CSS sem
  comentários e sem `!important`.
