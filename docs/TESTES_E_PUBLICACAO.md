# Testes e publicação — MX Diário de Bordo

## Situação atual

O backend possui autenticação, sessões, administração de equipes e usuários no PostgreSQL. O front-end já consome essas APIs para login, troca de senha e área de administração.

Categorias, dias e tarefas também estão no PostgreSQL. Um registro criado por uma conta é carregado pelas demais contas autenticadas. O `localStorage` deixou de ser usado para os dados operacionais do Diário.

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

## Arquitetura de produção

```text
Navegador
    │ HTTPS
Nginx (porta 443)
    ├── arquivos estáticos do front-end Vite
    └── /api → Next.js em 127.0.0.1:3000
                   │
              PostgreSQL em 127.0.0.1:5432
                   │
       dump diário → TrueNAS busca via rsync
```

O PostgreSQL e o Next.js não devem ser expostos diretamente na rede. O Nginx é a única porta pública da aplicação. O Next.js recomenda usar proxy reverso em self-hosting, em vez de expor o servidor diretamente. [Documentação do Next.js](https://nextjs.org/docs/app/guides/self-hosting)

## Preparação do Ubuntu 24.04

Antes de executar comandos remotos, confirme acesso por console ou SSH e o IP/CIDR administrativo autorizado para SSH. No servidor:

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y git nginx ufw fail2ban rsync postgresql postgresql-client
```

Instale Node.js 20.9 ou superior; Next.js 16 exige no mínimo essa versão. [Requisito oficial do Next.js](https://nextjs.org/docs/app/getting-started/installation) Antes de continuar, confirme com `node --version` e `npm --version`. Use a mesma versão principal do desenvolvimento (Node 24) sempre que possível.

Crie a conta de sistema e as pastas da aplicação:

```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin mxdiario
sudo install -d -o mxdiario -g mxdiario /opt/mx-diario-de-bordo
sudo install -d -o mxdiario -g mxdiario -m 700 /etc/mx-diario
sudo install -d -o mxdiario -g mxdiario -m 700 /var/backups/mx-diario
```

## Banco de produção

Conecte-se como o administrador PostgreSQL no próprio servidor e use senhas longas e exclusivas:

```sql
CREATE ROLE mx_diario_app LOGIN PASSWORD 'SENHA_DA_APLICACAO' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
CREATE ROLE mx_diario_backup LOGIN PASSWORD 'SENHA_DO_BACKUP' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
CREATE DATABASE mx_diario_prod OWNER mx_diario_app ENCODING 'UTF8';
GRANT CONNECT ON DATABASE mx_diario_prod TO mx_diario_backup;
\c mx_diario_prod
GRANT USAGE ON SCHEMA public TO mx_diario_backup;
GRANT pg_read_all_data TO mx_diario_backup;
```

O backup será feito com `pg_dump` em formato customizado (`-Fc`), que é comprimido e restaurável com `pg_restore`. [Documentação do PostgreSQL](https://www.postgresql.org/docs/current/app-pgdump.html)

## Primeiro deploy

1. Copie ou clone este repositório em `/opt/mx-diario-de-bordo` e dê posse a `mxdiario`.
2. Como `mxdiario`, instale dependências com `npm ci` na raiz e em `backend/`.
3. Copie `deploy/env/backend.env.example` para `/etc/mx-diario/backend.env`, ajuste a senha e aplique `chmod 600`.
4. Em `backend/`, execute:

```bash
npx prisma migrate deploy
npx prisma generate
npm run build
```

Use `migrate deploy`, nunca `migrate dev`, em produção. O primeiro aplica migrations pendentes sem resetar dados e não usa shadow database. [Documentação do Prisma](https://docs.prisma.io/docs/cli/migrate/deploy)

No primeiro deploy, crie o administrador e os dados-base adicionando temporariamente estas variáveis a `/etc/mx-diario/backend.env`, executando `npx prisma db seed` dentro de `backend/` e removendo as três linhas logo após o sucesso:

```env
INITIAL_ADMIN_NAME="admin"
INITIAL_ADMIN_USERNAME="admin"
INITIAL_ADMIN_PASSWORD="DEFINA_UMA_SENHA_FORTE_E_EXCLUSIVA"
```

5. Na raiz, execute `npm run build` para gerar `frontend/dist`.
6. Copie `deploy/systemd/mx-diario-api.service` para `/etc/systemd/system/`, então execute:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mx-diario-api
sudo systemctl status mx-diario-api
```

7. Copie `deploy/nginx/mx-diario.conf` para `/etc/nginx/sites-available/mx-diario`, crie o link em `sites-enabled`, remova o site default se ainda estiver ativo e valide:

```bash
sudo nginx -t
sudo systemctl reload nginx
curl http://127.0.0.1/api/health
```

8. Copie o serviço e timer de backup para `/etc/systemd/system/`. Copie os exemplos de `backup.env` e `pgpass` para `/etc/mx-diario/`, complete as senhas e aplique `chmod 600`. Em seguida:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mx-diario-backup.timer
sudo systemctl start mx-diario-backup.service
sudo systemctl list-timers mx-diario-backup.timer
```

9. Só então configure a coleta via `rsync` do TrueNAS. Faça um teste de restauração em uma base vazia antes de confiar no backup.

## Firewall

Antes de habilitar UFW, permita SSH exclusivamente da rede administrativa e mantenha um console alternativo aberto:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from REDE_ADMINISTRATIVA_CIDR to any port 22 proto tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

Não libere as portas 3000 ou 5432 no firewall.
