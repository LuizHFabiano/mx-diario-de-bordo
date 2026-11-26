# CLAUDE.md — regras para IA neste projeto

Você está trabalhando no **MX Diário de Bordo**, um sistema **que está em produção** e é usado todo dia pela empresa.
Um erro aqui derruba o login de todo mundo. Já aconteceu, mais de uma vez, por código gerado por IA sem teste.
Leia o `README.md` para entender o projeto. As regras abaixo são **obrigatórias**.

## Como o projeto é montado

- **Frontend:** React + Vite, na raiz (`src/`). O build vai para `frontend/dist`, que é a pasta que o Nginx serve.
- **Backend:** Next.js (só rotas de API) + Prisma 7 + PostgreSQL, em `backend/`.
- Em produção, o Nginx serve o front e repassa `/api/...` para o backend. Em desenvolvimento, o proxy do Vite faz isso.
- O deploy é automático a partir da branch `main`: **o que for para o GitHub vai para produção como está.**

## Regras que você NUNCA pode quebrar

1. **Mudou `backend/prisma/schema.prisma`? Crie a migration no mesmo commit.**
   Rode em `backend/`: `npx prisma migrate dev --name descreva_a_mudanca` (banco LOCAL) e inclua a pasta nova de `backend/prisma/migrations/`.
   Sem migration, o código procura colunas que não existem em produção e o login quebra.
2. **Nunca edite uma migration que já existe.** Sempre crie uma nova.
3. **Migration com `DROP`, `RENAME` ou `ALTER COLUMN ... TYPE` apaga ou altera dados de produção.** Não faça sem o humano confirmar explicitamente.
4. **O frontend chama a API sempre pelo caminho relativo `/api/...`.** Nunca escreva `http://localhost:3000` (nem outro host) no código de `src/`. Use o `src/data/apiClient.js`.
5. **Não mexa** no `build.outDir` do `vite.config.js` (`frontend/dist`), nem em `deploy/`, Nginx, systemd ou no script de deploy, a não ser que o humano peça.
6. **Arquivos sempre em UTF-8 sem BOM, com quebra de linha LF.** Nunca use `Get-Content`/`Set-Content`/`Out-File` do PowerShell para editar código: isso já quebrou a acentuação de uma tela inteira (`Horário` virou `HorÃ¡rio`).
7. **Não crie arquivos duplicados** (`.js` e `.ts` do mesmo arquivo, cópias de telas em outras pastas). Edite o arquivo que já existe.
8. **Não suba segredos:** `.env`, senhas, tokens ou senhas padrão escritas no código.
9. **Nunca rode contra o banco de produção:** `prisma migrate reset`, `prisma db push`, `prisma db seed` (o seed sobrescreve a senha do admin).

## Antes de dizer que terminou (OBRIGATÓRIO)

Você **não pode** dizer que a tarefa está pronta, fazer commit, push ou sugerir abrir PR sem antes:

1. Rodar, na raiz do repositório:
   ```
   npm run verificar
   ```
   Esse script confere encoding, URL da API, `outDir` do Vite, schema x migrations, e roda o build do backend (TypeScript) e do frontend.
   **Ele precisa terminar com `APROVADO`.** Se terminar com `REPROVADO`, corrija e rode de novo. Não pule, não desative e não edite o script para ele passar.
2. Se mexeu em banco, rotas da API ou login: subir o backend (`cd backend && npm run dev`) e o front (`npm run dev`) e testar no navegador, em `http://localhost:5173`:
   - login com o admin funciona;
   - a tela que você mexeu abre sem erro no console (F12);
   - criar/editar o que você mexeu funciona e aparece depois de recarregar a página.
   Se você não consegue abrir o navegador, diga isso claramente e peça para o humano fazer esse teste. **Não afirme que testou o que não testou.**
3. Mostrar ao humano um resumo curto: o que mudou, quais arquivos, se tem migration nova (e o SQL dela), e a saída final do `npm run verificar`.

## Estilo de código

- Siga o padrão do arquivo que você está editando; não reformate arquivos inteiros.
- Mensagens e textos da interface em português, com acentuação correta.
- Mudanças pequenas e focadas no que foi pedido. Não "melhore" partes não relacionadas.
