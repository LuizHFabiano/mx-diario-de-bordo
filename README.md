# MX Diário de Bordo

Sistema web interno da MX Soluções para registrar **o que cada equipe fez durante o turno**. Também tem a **escala de trabalho** dos funcionários. Cada pessoa lança suas atividades numa linha do tempo do dia, os gestores acompanham as equipes deles e dá para exportar o diário em PDF.

> Este README é o resumo do projeto: comece por aqui.
> O passo a passo completo de instalação do servidor do zero está em [`docs/TESTES_E_PUBLICACAO.md`](docs/TESTES_E_PUBLICACAO.md).

---

## 1. Como funciona, em uma imagem

```text
Navegador (qualquer PC da rede da empresa)
      │
      ▼
Nginx  ── porta 8081 ──┬── entrega o site (frontend React, pasta frontend/dist)
                       └── /api/...  ──►  Backend Next.js (porta 3005, só local)
                                                │
                                                ▼
                                    PostgreSQL (banco mx_diario_prod, só local)
```

- **Frontend**: React + Vite. Fica na raiz do repositório (`src/`).
- **Backend**: Next.js (só as rotas de API) + Prisma + PostgreSQL. Fica em `backend/`.
- O frontend **sempre** chama a API pelo caminho relativo `/api/...`. Quem leva a chamada até o backend é o Nginx em produção, e o proxy do Vite em desenvolvimento.

---

## 2. Onde está rodando (produção)

| O quê | Onde |
|---|---|
| Servidor | Notebook com Ubuntu 24.04 + CasaOS, IP atual **10.192.1.98** (Wi-Fi, pode mudar, veja a seção 9) |
| Endereço do sistema | `http://10.192.1.98:8081/` (só dentro da rede da empresa) |
| Código no servidor | `/opt/mx-diario-de-bordo` (dono: usuário de sistema `mxdiario`) |
| Configuração secreta (senha do banco) | `/etc/mx-diario/backend.env` |
| Serviço do backend | `mx-diario-api` (systemd), porta **3005** |
| Nginx | porta **8081**, servindo `/opt/mx-diario-de-bordo/frontend/dist` |
| Banco | PostgreSQL nativo do Ubuntu, `127.0.0.1:5432`, banco `mx_diario_prod` |
| Script de atualização | `/home/pedro/atualizar_mx_diario.sh` |

> ⚠️ As portas 80 e 3000 do servidor são do CasaOS. Por isso a produção usa **8081** (Nginx) e **3005** (backend).
> Os arquivos de exemplo em `deploy/nginx` e `deploy/systemd` ainda estão com 80/3000. No servidor eles foram ajustados à mão.

Os outros containers Docker do servidor (`projeto-mx-painel`, `mxchat-db`, Heimdall, Uptime Kuma, Dashy etc.) **não têm nada a ver** com o Diário de Bordo.

---

## 3. Quem pode fazer o quê

| Perfil | Pode |
|---|---|
| **Atendente** (`ATTENDANT`) | Lançar atividades e editar/excluir **só as próprias** |
| **Gestor** (`MANAGER`) | Tudo do atendente + editar atividades das **equipes que gerencia** |
| **Admin** (`ADMIN`) | Tudo + tela de **Administração** (usuários, equipes, senhas) |

- Conta nova é criada com a senha padrão `Mudar@123`, e o sistema obriga a trocar no primeiro login.
- Conta bloqueada perde todas as sessões na hora.

## 4. Telas

| Menu | Arquivo | O que faz |
|---|---|---|
| Diários de Hoje | `src/views/HojeView.jsx` | Linha do tempo do dia, com criar/editar atividades |
| Diários Passados | `src/views/PassadosView.jsx` | Consulta de dias anteriores e exportação em PDF |
| Escalas | `src/views/EscalasView.jsx` | Escala semanal de cada funcionário (turno, folgas, atestados, faltas) |
| Configurações | `src/views/ConfigView.jsx` | Horário de início/fim do dia etc. |
| Administração | `src/views/AdminView.jsx` | Usuários e equipes (só admin) |

---

## 5. Estrutura de pastas

```text
mx-diario-de-bordo/
├── src/                      ← FRONTEND (React)
│   ├── views/                  telas (uma por item do menu)
│   ├── components/             pedaços de tela (Sidebar, TaskModal, TimelineGrid...)
│   ├── data/apiClient.js       ÚNICO ponto que conversa com a API
│   ├── hooks/ utils/           helpers (datas, filtros, PDF, layout da timeline)
│   └── App.jsx                 decide qual tela mostrar
├── vite.config.js            ← build vai para frontend/dist (NÃO MUDAR)
├── backend/                  ← BACKEND (Next.js + Prisma)
│   ├── src/app/api/            rotas da API (cada pasta = uma URL /api/...)
│   ├── src/lib/                autenticação, permissões, conexão com o banco
│   ├── prisma/schema.prisma    desenho do banco (tabelas e campos)
│   ├── prisma/migrations/      histórico de mudanças do banco (NUNCA editar as antigas)
│   └── prisma/seed.ts          cria admin/dados iniciais (NÃO rodar em produção, veja a seção 8)
├── deploy/                   ← modelos de configuração do servidor (nginx, systemd, backup, .env)
└── docs/TESTES_E_PUBLICACAO.md  ← manual completo de instalação e testes
```

## 6. Banco de dados (resumo)

| Tabela | Guarda |
|---|---|
| `User` | usuários (login, nome, perfil, ativo, folgas fixas) |
| `Team`, `user_teams`, `team_managers` | equipes, quem é de qual equipe e quem gerencia qual |
| `work_days` | um dia de trabalho por equipe (aberto/fechado) |
| `tasks` | as atividades lançadas no diário |
| `Category` | categorias/cores das atividades |
| `work_scales` | escala semanal de cada funcionário |
| `SystemSetting` | configuração geral (horário do dia etc.) |
| `sessions`, `audit_logs` | sessões de login e registro de quem fez o quê |

---

## 7. Rodando na sua máquina (desenvolvimento)

Precisa de Node.js e de um PostgreSQL local.

```powershell
# 1) Backend
cd backend
copy ..\deploy\env\backend.env.example .env    # edite a DATABASE_URL para o seu Postgres local
npm install
npx prisma migrate deploy                      # cria as tabelas
npx prisma db seed                             # cria o admin (SÓ no banco local!)
npm run dev                                    # API em http://localhost:3000

# 2) Frontend (outro terminal, na raiz do repositório)
npm install
npm run dev                                    # site em http://localhost:5173
```

O Vite repassa `/api` para `localhost:3000` sozinho. **Não** coloque `http://localhost:3000` em nenhum lugar do código.

---

## 8. ⚠️ Regras de ouro (leia antes de mexer)

Todas estas regras vêm de problemas que já derrubaram a produção.

1. **Mexeu no `schema.prisma`? Crie a migration junto.**
   ```powershell
   cd backend
   npx prisma migrate dev --name descreva_a_mudanca     # no banco LOCAL
   ```
   Commite a pasta nova em `backend/prisma/migrations/`. Sem ela, o deploy sobe um código que procura colunas que não existem, e **o login de todo mundo quebra** (parece que os usuários sumiram).

2. **Confira o SQL da migration.** `CREATE`/`ADD COLUMN` é tranquilo. `DROP`, renomear coluna ou `ALTER ... TYPE` **apaga ou altera dados**, então fale com alguém antes.

3. **Em produção, só `prisma migrate deploy`** (o script já roda). Nunca rode no servidor:
   `prisma migrate dev`, `prisma migrate reset`, `prisma db push`, `prisma db seed`.
   O `seed` **sobrescreve a senha do admin**.

4. **A API é sempre `/api/...`.** Nada de `localhost:3000` no frontend. Em produção, `localhost` é o PC de quem está usando, e o login dá "Failed to fetch".

5. **Não mexa no `outDir` do `vite.config.js`.** Ele tem que ser `frontend/dist`, que é a pasta que o Nginx serve. Se mudar, o site fica preso na versão antiga sem dar erro nenhum.

6. **Antes do PR**, rode `npm run build` no backend **e** na raiz, e teste o login.

7. **Nunca suba arquivos `.env`, senhas ou tokens** para o GitHub.

---

## 9. Atualizando a produção

1. Faça commit e `git push` na branch `main`.
2. Entre no servidor e rode o script:
   ```bash
   ssh pedro@10.192.1.98
   sudo /home/pedro/atualizar_mx_diario.sh
   ```
3. O script faz sozinho: `git pull` → `npm ci` + `prisma migrate deploy` + build do backend → build do frontend → reinicia o `mx-diario-api` → recarrega o Nginx → testa `/api/health`.
4. Abra o site e aperte **Ctrl+F5** (para o navegador não usar a versão antiga em cache).

No passo 2/6, confira se aparece `Applying migration ...` quando você criou uma migration. Se aparecer `No pending migrations` mas o schema mudou, **faltou a migration** (regra 1).

**IP do servidor:** ele está no Wi-Fi e já trocou de IP uma vez (era .196, hoje é .98). O ideal é fazer uma reserva de DHCP no roteador ou usar cabo. A mensagem final do script ainda mostra o IP antigo.

---

## 10. Deu problema? Comandos úteis no servidor

```bash
# A API está de pé?
curl http://127.0.0.1:3005/api/health          # esperado: {"status":"ok","database":"connected"}

# Status e erros do backend (procure "does not exist" = falta migration)
systemctl status mx-diario-api --no-pager
sudo journalctl -u mx-diario-api -n 100 --no-pager

# Os dados estão lá? (contagem real)
sudo -u postgres psql -d mx_diario_prod -c 'SELECT (SELECT count(*) FROM "User") users, (SELECT count(*) FROM tasks) tasks;'

# Quais migrations já foram aplicadas
sudo -u postgres psql -d mx_diario_prod -c 'SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at;'

# Backup manual na hora (faça antes de qualquer coisa arriscada)
sudo -u postgres pg_dump -Fc mx_diario_prod > ~/mx_diario_prod_$(date +%F_%H%M).dump

# Esqueceram a senha de alguém: use a tela de Administração (admin redefine).
# Se for a do próprio admin, existe o script backend/prisma/reset-password.ts.
```

No servidor, comandos `git` precisam rodar como o usuário `mxdiario`:
`sudo -u mxdiario git -C /opt/mx-diario-de-bordo status`

| Sintoma | Causa provável |
|---|---|
| Ninguém consegue logar, log diz `column ... does not exist` | schema mudou sem migration (regra 1) |
| Tela de login: "Failed to fetch", console mostra `localhost:3000` | URL fixa no frontend (regra 4) |
| Deploy "deu certo" mas o site não mudou | `outDir` do Vite mudou (regra 5), ou cache: Ctrl+F5 |
| Build do backend falha com erro de TypeScript | código não foi testado com `npm run build` antes do PR |

---

## 11. Backup

Existe um backup automático pronto no repositório: `deploy/scripts/backup-postgres.sh` + `deploy/systemd/mx-diario-backup.timer` (todo dia às 02:00, guarda 7 dias em `/var/backups/mx-diario`). Confira se está ativo:

```bash
systemctl list-timers | grep mx-diario
ls -lh /var/backups/mx-diario
```

Se não aparecer nada, ative seguindo a seção de backup do [`docs/TESTES_E_PUBLICACAO.md`](docs/TESTES_E_PUBLICACAO.md). **Sem backup, um erro no banco não tem volta.**

---

## 12. Pendências conhecidas

- [ ] Fixar o IP do servidor (reserva de DHCP ou cabo) e corrigir o IP no final do script.
- [ ] Confirmar que o backup diário está ativo (seção 11).
- [ ] `backend/middleware.js` libera a API para qualquer site (`Access-Control-Allow-Origin: *`). Não é necessário, porque o front e a API rodam no mesmo endereço; o ideal é remover.
- [ ] `backend/prisma/seed.ts` tem uma senha padrão de admin escrita no código. Trocar para exigir `INITIAL_ADMIN_PASSWORD`.
- [ ] Limpar duplicados: `backend/next.config.js` e `next.config.ts`; `seed_funcionarios` em 3 lugares; `deploy/EscalasView.jsx` (cópia da tela); `src/views/AdminView.tsx` (não é usado, o app carrega o `.jsx`).
- [ ] O remote do Git no servidor usa um token do GitHub dentro da URL. O ideal é trocar por uma *deploy key* SSH só de leitura.
