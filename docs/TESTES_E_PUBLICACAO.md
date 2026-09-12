# Testes e publicação — MX Diário de Bordo

## Situação atual

O backend possui autenticação, sessões, administração de equipes e usuários no PostgreSQL. O front-end já consome essas APIs para login, troca de senha e área de administração.

Categorias, dias e tarefas também estão no PostgreSQL. Um registro criado por uma conta é carregado pelas demais contas autenticadas. O `localStorage` deixou de ser usado para os dados operacionais do Diário.

Este documento já reflete um primeiro deploy real, feito e validado em um Ubuntu 24.04 doméstico. Onde o comportamento real divergiu do plano original, o texto foi corrigido — não é só teoria.

## Checklist de testes locais

Execute o backend em um terminal:

```powershell
Set-Location backend
npm run dev
```

Em outro terminal, execute o front-end na raiz do repositório:

```powershell
npm run dev
```

Abra `http://localhost:5173` e valide:

1. `GET http://localhost:3000/api/health` retorna `{"status":"ok","database":"connected"}`.
2. Login inválido mostra erro e não entra no sistema.
3. Login `admin` abre a opção **Administração** na lateral.
4. Login de uma conta comum não exibe **Administração**.
5. Uma conta criada com a senha padrão `Mudar@123` recebe tela obrigatória de troca de senha.
6. Após trocar a senha, a conta entra e a troca deixa de ser solicitada.
7. Administração cria uma conta de Atendente com uma equipe.
8. Administração cria uma conta de Gestor, atribui equipes e marca as equipes que ela gerencia.
9. Bloquear uma conta encerra as sessões dela; o próximo acesso é recusado.
10. Reativar uma conta permite novo login.
11. Sair encerra a sessão; atualizar a página não deve manter o acesso.
12. Crie uma atividade como admin e confirme-a ao entrar com uma conta de gestor em outro navegador ou janela. Ela deve aparecer para ambas as contas.
13. Um atendente só edita/exclui as próprias atividades; um gestor consegue alterar atividades das equipes que gerencia; admin altera qualquer atividade.

Todos os 13 itens foram validados no código (revisão linha a linha das rotas de auth, admin e tasks) e no primeiro deploy real.

## Arquitetura de produção

```text
Navegador (rede local)
    │ HTTP
Nginx (porta configurável — 80 por padrão, ou outra se já estiver em uso)
    ├── arquivos estáticos do front-end Vite (frontend/dist)
    └── /api → Next.js em 127.0.0.1:<porta do backend>
                   │
              PostgreSQL em 127.0.0.1:5432
                   │
       pg_dump diário → /var/backups/mx-diario (+ rsync opcional pra NAS externo)
```

O PostgreSQL e o Next.js não devem ser expostos diretamente na rede — só em `127.0.0.1`. O Nginx é a única porta que fica acessível pela rede. O Next.js recomenda usar proxy reverso em self-hosting, em vez de expor o servidor diretamente. [Documentação do Next.js](https://nextjs.org/docs/app/guides/self-hosting)

**Sobre HTTPS:** este runbook cobre deploy em rede local (LAN), sem certificado e sem domínio público. Se o servidor só for acessado dentro da rede da empresa/casa, isso é aceitável. Não exponha esse setup diretamente na internet sem adicionar HTTPS antes.

**Acesso fora da rede local:** por padrão, o app só responde dentro da LAN — não há redirecionamento de porta no roteador nem certificado. Para acessar de fora (de casa, em trânsito, etc.) sem expor o servidor à internet pública, a opção recomendada é uma VPN mesh como o [Tailscale](https://tailscale.com/), que dá acesso remoto seguro sem abrir nenhuma porta pro mundo. Configuração ainda não documentada aqui — pendente se/quando for necessária.

## Preparação do Ubuntu 24.04

Antes de executar comandos remotos, confirme acesso por console ou SSH e o IP/CIDR administrativo autorizado para SSH.

**Antes de tudo, confira se as portas padrão (80 e 3000) estão livres:**

```bash
sudo ss -tlnp | grep -E ':80 |:3000 '
```

Se aparecer algo (por exemplo, um NAS caseiro como CasaOS, que costuma ocupar exatamente essas duas portas), escolha portas alternativas para o Nginx e o backend antes de seguir — por exemplo, 8081 e 3005. Essas portas alternativas são usadas como exemplo no restante deste guia sempre que uma escolha for necessária; ajuste para as portas realmente livres no seu servidor.

Instale os pacotes base:

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y git nginx ufw fail2ban rsync postgresql postgresql-client curl openssl
```

Instale o Node.js 22 (LTS) via NodeSource — o repositório padrão do Ubuntu 24.04 traz uma versão antiga demais para o Next.js 16, que exige Node 20.9+:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version   # confirme v22.x ou superior
```

Crie a conta de sistema e as pastas da aplicação:

```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin mxdiario
sudo install -d -o mxdiario -g mxdiario /opt/mx-diario-de-bordo
sudo install -d -o mxdiario -g mxdiario -m 700 /etc/mx-diario
sudo install -d -o mxdiario -g mxdiario -m 700 /var/backups/mx-diario
```

## Banco de dados PostgreSQL

Conecte-se como o administrador PostgreSQL no próprio servidor e use senhas longas e exclusivas (ou gere com `openssl rand -base64 24`):

```sql
CREATE ROLE mx_diario_app LOGIN PASSWORD 'SENHA_DA_APLICACAO' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
CREATE ROLE mx_diario_backup LOGIN PASSWORD 'SENHA_DO_BACKUP' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
CREATE DATABASE mx_diario_prod OWNER mx_diario_app ENCODING 'UTF8';
GRANT CONNECT ON DATABASE mx_diario_prod TO mx_diario_backup;
\c mx_diario_prod
GRANT USAGE ON SCHEMA public TO mx_diario_backup;
GRANT pg_read_all_data TO mx_diario_backup;
```

Teste a conexão antes de seguir:

```bash
psql "postgresql://mx_diario_app:SENHA_DA_APLICACAO@127.0.0.1:5432/mx_diario_prod" -c "SELECT 1;"
```

O backup será feito com `pg_dump` em formato customizado (`-Fc`), que é comprimido e restaurável com `pg_restore`. [Documentação do PostgreSQL](https://www.postgresql.org/docs/current/app-pgdump.html)

## Variáveis de ambiente

```bash
sudo cp /opt/mx-diario-de-bordo/deploy/env/backend.env.example /etc/mx-diario/backend.env
sudo nano /etc/mx-diario/backend.env
```

Ajuste `DATABASE_URL` com a senha definida acima. Se a porta do backend precisar ser diferente de 3000 (ver seção de preparação), defina também `PORT=<porta escolhida>` neste arquivo.

```bash
sudo chown mxdiario:mxdiario /etc/mx-diario/backend.env
sudo chmod 600 /etc/mx-diario/backend.env
```

**Importante — armadilha real encontrada no primeiro deploy:** o projeto usa Prisma 7, cujo `backend/prisma7.config.ts` carrega a `DATABASE_URL` via `dotenv/config`, que só lê um arquivo `.env` dentro da própria pasta `backend/` — **não** o `/etc/mx-diario/backend.env`. Isso significa que rodar `npx prisma migrate deploy` (ou `generate`, `db seed`) manualmente, sem mais nada, falha com:

```
Error: The datasource.url property is required in your Prisma config file when using prisma migrate deploy.
```

O systemd resolve isso sozinho em produção (via `EnvironmentFile=`), mas **qualquer comando Prisma rodado manualmente no terminal precisa carregar essa variável primeiro**:

```bash
set -a && source /etc/mx-diario/backend.env && set +a
npx prisma migrate deploy
```

Todos os comandos Prisma abaixo neste documento já incluem esse passo.

## Primeiro deploy

1. Clone este repositório em `/opt/mx-diario-de-bordo` e dê posse a `mxdiario`:

```bash
cd /tmp
git clone https://github.com/pedrolubacheski/mx-diario-de-bordo.git
sudo cp -r mx-diario-de-bordo/. /opt/mx-diario-de-bordo/
sudo chown -R mxdiario:mxdiario /opt/mx-diario-de-bordo
```

(Repositório privado: gere um [Personal Access Token](https://github.com/settings/personal-access-tokens/new) com acesso _read-only_ de **Contents** só a este repositório, e use `https://SEU_TOKEN@github.com/...` na URL do clone. Revogue o token depois de usar.)

2. Confirme que `vite.config.js` (raiz do projeto) define o diretório de build:

```js
build: {
  outDir: 'frontend/dist',
},
```

Sem isso, o build do front-end vai parar em `dist/` na raiz em vez de `frontend/dist/`, e o Nginx (que aponta pra `frontend/dist`) não vai encontrar os arquivos.

3. Instale as dependências e gere o build do backend, como `mxdiario`:

```bash
sudo -u mxdiario -H bash -c "
cd /opt/mx-diario-de-bordo/backend &&
npm ci &&
set -a && source /etc/mx-diario/backend.env && set +a &&
npx prisma migrate deploy &&
npx prisma generate &&
npm run build
"
```

Use `migrate deploy`, nunca `migrate dev`, em produção. O primeiro aplica migrations pendentes sem resetar dados e não usa shadow database. [Documentação do Prisma](https://docs.prisma.io/docs/cli/migrate/deploy)

4. Gere o build do front-end, na raiz do projeto:

```bash
sudo -u mxdiario -H bash -c "
cd /opt/mx-diario-de-bordo &&
npm ci &&
npm run build
"
```

Confirme que `frontend/dist/index.html` existe antes de seguir.

5. Crie o administrador inicial. Em vez de gravar a senha em disco, passe as variáveis só para este comando:

```bash
sudo -u mxdiario -H bash -c "
cd /opt/mx-diario-de-bordo/backend &&
set -a && source /etc/mx-diario/backend.env && set +a &&
INITIAL_ADMIN_NAME='Administrador' INITIAL_ADMIN_USERNAME='admin' INITIAL_ADMIN_PASSWORD='DEFINA_UMA_SENHA_FORTE' npx prisma db seed
"
```

A senha exige no mínimo 14 caracteres (regra do próprio `seed.ts`).

6. Copie o serviço systemd. **Se a porta 3000 estiver em uso** (ver seção de preparação), edite `Environment=PORT=` no arquivo antes de instalar, ou defina `PORT=` em `/etc/mx-diario/backend.env` (o `EnvironmentFile` é lido depois de `Environment=` no arquivo do systemd, então o valor do `.env` vence em caso de conflito):

```bash
sudo cp /opt/mx-diario-de-bordo/deploy/systemd/mx-diario-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now mx-diario-api
sudo systemctl status mx-diario-api
```

7. Copie a configuração do Nginx. **Se a porta 80 estiver em uso**, edite as linhas `listen` no arquivo copiado (`listen 8081;` / `listen [::]:8081;`, por exemplo) e ajuste `proxy_pass` para a porta real do backend:

```bash
sudo cp /opt/mx-diario-de-bordo/deploy/nginx/mx-diario.conf /etc/nginx/sites-available/mx-diario
sudo ln -s /etc/nginx/sites-available/mx-diario /etc/nginx/sites-enabled/mx-diario
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
curl http://127.0.0.1:<porta do nginx>/api/health
```

8. Copie o serviço e timer de backup para `/etc/systemd/system/`. Copie os exemplos de `backup.env` e `pgpass` para `/etc/mx-diario/`, complete as senhas e aplique `chmod 600`. Em seguida:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mx-diario-backup.timer
sudo systemctl start mx-diario-backup.service
sudo systemctl list-timers mx-diario-backup.timer
ls -la /var/backups/mx-diario   # deve aparecer um .dump
```

9. Configuração de sincronização externa (ex.: `rsync` para um NAS) é opcional e ainda não foi feita neste deploy — fica pendente para quando houver um destino de backup externo disponível. Teste sempre uma restauração em uma base vazia antes de confiar totalmente em qualquer backup.

## Firewall

Antes de habilitar UFW, permita SSH exclusivamente da rede administrativa e mantenha um console alternativo aberto:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from REDE_ADMINISTRATIVA_CIDR to any port 22 proto tcp
sudo ufw allow from REDE_ADMINISTRATIVA_CIDR to any port <porta do nginx> proto tcp
sudo ufw enable
sudo ufw status verbose
```

Não libere no firewall a porta do backend nem a 5432 (PostgreSQL) — elas só devem responder em `127.0.0.1`. Como este é um deploy só de rede local (sem HTTPS), não há necessidade de liberar 443.

## Atualizando uma versão já publicada

Depois do primeiro deploy, atualizar o app com uma versão nova do código é bem mais simples — não repete instalação de pacotes, criação de usuário, banco, etc. **O banco de dados não é afetado por esse processo**: `git pull`, build e `systemctl restart` só tocam nos arquivos da aplicação, nunca nos dados. A única exceção é `prisma migrate deploy`, que aplica migrations pendentes (ex.: uma coluna nova) sem apagar dados existentes — é o comando seguro para produção, diferente de `migrate reset`.

### Passo 1 — Enviar as mudanças pro GitHub

No computador de desenvolvimento:

```powershell
git add .
git commit -m "Descreva a mudança aqui"
git push
```

### Passo 2 — Copiar o script de atualização pro servidor

Só precisa fazer isso uma vez (ou sempre que o script mudar):

```powershell
scp .\atualizar_mx_diario.sh usuario@IP_DO_SERVIDOR:~/
```

### Passo 3 — Rodar a atualização

Conectado via SSH no servidor:

```bash
chmod +x atualizar_mx_diario.sh
sudo ./atualizar_mx_diario.sh
```

### O que o script faz, por dentro

1. Confere se não há mudanças locais não commitadas em `/opt/mx-diario-de-bordo` (esse diretório deveria só receber `git pull`, nunca ser editado direto)
2. `git pull` — baixa a versão mais recente do `main`
3. Reinstala dependências do backend (`npm ci`), carrega a `DATABASE_URL`/demais variáveis de `/etc/mx-diario/backend.env` e roda `prisma migrate deploy` + `prisma generate` + `npm run build`
4. Reinstala dependências do front-end e roda `npm run build` (gera `frontend/dist`)
5. Reinicia o serviço `mx-diario-api` (systemd)
6. Recarrega o Nginx (`nginx -t` antes, pra não derrubar o site se a config tiver erro)
7. Testa `/api/health` direto no backend e através do Nginx

Se qualquer passo falhar, o script para na hora (`set -euo pipefail`) e mostra o erro exato — não deixa a aplicação num estado quebrado silenciosamente. As portas usadas pelo script devem ser ajustadas para as portas reais deste servidor (ver seção de referência abaixo).

```bash
#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/mx-diario-de-bordo"
ETC_DIR="/etc/mx-diario"
BACKEND_PORT="3000"   # ajuste para a porta real do backend
NGINX_PORT="80"       # ajuste para a porta real do nginx

echo "==> Verificando se há mudanças locais não commitadas no servidor"
if [ -n "$(sudo -u mxdiario git -C "$APP_DIR" status --short)" ]; then
  echo "ATENÇÃO: existem mudanças não commitadas em $APP_DIR:"
  sudo -u mxdiario git -C "$APP_DIR" status --short
  echo "Isso normalmente não deveria acontecer neste servidor (ele só recebe git pull)."
  echo "Cancele (Ctrl+C) e investigue, ou continue por sua conta e risco em 10s..."
  sleep 10
fi

echo "==> 1/6 Baixando as mudanças do GitHub"
sudo -u mxdiario git -C "$APP_DIR" pull

echo "==> 2/6 Atualizando dependências e build do backend"
sudo -u mxdiario -H bash -c "
cd '$APP_DIR/backend' &&
npm ci &&
set -a && source '$ETC_DIR/backend.env' && set +a &&
npx prisma migrate deploy &&
npx prisma generate &&
npm run build
"

echo "==> 3/6 Atualizando dependências e build do frontend"
sudo -u mxdiario -H bash -c "
cd '$APP_DIR' &&
npm ci &&
npm run build
"
if [ ! -f "$APP_DIR/frontend/dist/index.html" ]; then
  echo "ERRO: build do frontend não gerou $APP_DIR/frontend/dist/index.html" >&2
  exit 1
fi

echo "==> 4/6 Reiniciando o backend"
systemctl restart mx-diario-api
sleep 2
systemctl status mx-diario-api --no-pager -l | head -8

echo "==> 5/6 Recarregando o Nginx"
nginx -t
systemctl reload nginx

echo "==> 6/6 Testando"
curl -sf "http://127.0.0.1:${BACKEND_PORT}/api/health" && echo ""
curl -sf "http://127.0.0.1:${NGINX_PORT}/api/health" && echo ""

echo ""
echo "============================================================"
echo " ATUALIZAÇÃO CONCLUÍDA"
echo "============================================================"
```

### Se algo der errado

- **`git pull` reclama de conflito**: alguém (ou algum comando antigo) editou arquivos direto no servidor. Rode `sudo -u mxdiario git -C /opt/mx-diario-de-bordo status` pra ver o que mudou, decida se quer descartar (`git restore <arquivo>`) ou levar a mudança pro repositório manualmente.
- **`prisma migrate deploy` falha com `datasource.url property is required`**: esqueceu de `source` o `/etc/mx-diario/backend.env` antes do comando (ver seção "Variáveis de ambiente").
- **`prisma migrate deploy` falha com outro erro**: normalmente é uma migration que depende de uma mudança manual no banco. Não insista sozinho — revise a migration antes de rodar de novo.
- **O site não atualiza no navegador**: dá um Ctrl+Shift+R (hard refresh) — os arquivos JS/CSS têm hash no nome, então isso é raro, mas o navegador às vezes segura o cache do `index.html`.
- **`systemctl status mx-diario-api` mostra `failed`**: rode `sudo journalctl -u mx-diario-api -n 50 --no-pager` pra ver o erro completo. Erro comum: `EADDRINUSE` — outra coisa já está usando a porta configurada.

## Referência: exemplo de ambiente com portas alternativas

Em um servidor que já roda outro serviço nas portas padrão (por exemplo, um NAS caseiro como CasaOS, que ocupa 80 e 3000), um deploy real usou:

- Backend (Next.js / `mx-diario-api.service`): porta **3005**
- Nginx do Diário de Bordo: porta **8081**
- App acessível em `http://<IP_DO_SERVIDOR>:8081/`
- `PORT=3005` definido em `/etc/mx-diario/backend.env`
- `deploy/nginx/mx-diario.conf` com `listen 8081;` / `listen [::]:8081;` e `proxy_pass http://127.0.0.1:3005;`
- Firewall liberando apenas `22` e `8081` para a rede local (nunca `3005` nem `5432`)

Use este exemplo como referência ao adaptar as portas para o seu próprio servidor.
