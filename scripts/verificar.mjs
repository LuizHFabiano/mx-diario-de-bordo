// Verificação obrigatória antes de qualquer commit/PR.
// Uso (na raiz do repositório):  npm run verificar
import { execSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const raiz = process.cwd();
const erros = [];
const avisos = [];
const ok = (msg) => console.log(`  ✔ ${msg}`);

function arquivos(dir, exts, ignorar = ["node_modules", "generated", ".next", "dist"]) {
  const lista = [];
  if (!existsSync(dir)) return lista;
  for (const nome of readdirSync(dir)) {
    if (ignorar.includes(nome)) continue;
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) lista.push(...arquivos(caminho, exts, ignorar));
    else if (exts.some((e) => nome.endsWith(e))) lista.push(caminho);
  }
  return lista;
}

function git(cmd) {
  try {
    return execSync(`git ${cmd}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

console.log("\n1) Encoding dos arquivos");
const codigo = [
  ...arquivos("src", [".js", ".jsx", ".ts", ".tsx", ".css"]),
  ...arquivos("backend/src", [".js", ".ts", ".tsx"]),
  ...arquivos("backend/prisma", [".ts", ".js", ".prisma", ".sql"]),
];
const mojibake = /Ã[\u0080-¿]|Â[ -¿]|â€/;
let encodingOk = true;
for (const f of codigo) {
  const bytes = readFileSync(f);
  const texto = bytes.toString("utf8");
  const linhas = texto.split("\n");
  linhas.forEach((l, i) => {
    if (mojibake.test(l)) {
      encodingOk = false;
      erros.push(`${relative(raiz, f)}:${i + 1} acentuação quebrada (arquivo salvo com encoding errado): ${l.trim().slice(0, 80)}`);
    }
  });
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    avisos.push(`${relative(raiz, f)} tem BOM no início; salve como "UTF-8" (sem BOM).`);
  }
}
if (encodingOk) ok("nenhuma acentuação quebrada");

console.log("\n2) URL da API");
let urlOk = true;
for (const f of arquivos("src", [".js", ".jsx", ".ts", ".tsx"])) {
  readFileSync(f, "utf8").split("\n").forEach((l, i) => {
    if (/https?:\/\/(localhost|127\.0\.0\.1)/.test(l)) {
      urlOk = false;
      erros.push(`${relative(raiz, f)}:${i + 1} URL fixa de localhost no frontend. Use o caminho relativo /api/...`);
    }
  });
}
if (urlOk) ok("frontend usa /api relativo");

console.log("\n3) vite.config.js");
const vite = readFileSync("vite.config.js", "utf8");
if (/outDir:\s*["']frontend\/dist["']/.test(vite)) ok("outDir = frontend/dist");
else erros.push("vite.config.js precisa ter build.outDir = 'frontend/dist' (é a pasta que o Nginx serve).");

console.log("\n4) Banco de dados: schema x migrations");
const base = git("merge-base HEAD origin/main");
if (!base) {
  avisos.push("Não achei origin/main; rode 'git fetch' para a checagem de migrations funcionar.");
} else {
  const mudados = new Set(
    [git(`diff --name-only ${base}`), git("ls-files --others --exclude-standard")]
      .filter(Boolean).join("\n").split("\n").filter(Boolean)
  );
  const schemaMudou = mudados.has("backend/prisma/schema.prisma");
  const migrationsNovas = [...mudados].filter(
    (f) => /^backend\/prisma\/migrations\/[^/]+\/migration\.sql$/.test(f) && git(`cat-file -e ${base}:${f}`) === null
  );
  const migrationsAlteradas = [...mudados].filter(
    (f) => /^backend\/prisma\/migrations\/[^/]+\/migration\.sql$/.test(f) && git(`cat-file -e ${base}:${f}`) !== null
  );
  for (const f of migrationsAlteradas) {
    erros.push(`${f} é uma migration ANTIGA e foi alterada. Nunca edite migrations já publicadas; crie uma nova.`);
  }
  if (schemaMudou && migrationsNovas.length === 0) {
    erros.push("schema.prisma mudou mas não tem migration nova. Rode em backend/: npx prisma migrate dev --name descreva_a_mudanca");
  } else if (schemaMudou) {
    ok(`schema mudou e veio com migration: ${migrationsNovas.join(", ")}`);
  } else {
    ok("schema.prisma não mudou");
  }
  for (const f of migrationsNovas) {
    const sql = readFileSync(f, "utf8");
    if (/\bDROP\s+(TABLE|COLUMN)\b|\bALTER\s+COLUMN\b[^;]*\bTYPE\b|\bRENAME\b/i.test(sql)) {
      avisos.push(`${f} tem DROP/RENAME/ALTER TYPE: isso APAGA ou altera dados em produção. Confirme com o responsável antes.`);
    }
  }
}

console.log("\n5) Build do backend (TypeScript + Next.js)");
try {
  execSync("npm run build", { cwd: "backend", stdio: "inherit" });
  ok("build do backend passou");
} catch {
  erros.push("build do backend falhou (veja o erro acima).");
}

console.log("\n6) Build do frontend (Vite)");
try {
  const antes = Date.now();
  execSync("npm run build", { stdio: "inherit" });
  const index = "frontend/dist/index.html";
  if (existsSync(index) && statSync(index).mtimeMs >= antes - 1000) ok("build do frontend gerou frontend/dist/index.html");
  else erros.push("o build do frontend não atualizou frontend/dist/index.html.");
} catch {
  erros.push("build do frontend falhou (veja o erro acima).");
}

console.log("\n==============================================");
for (const a of avisos) console.log(`  ⚠ AVISO: ${a}`);
if (erros.length) {
  for (const e of erros) console.log(`  ✘ ERRO: ${e}`);
  console.log(`\nREPROVADO: ${erros.length} erro(s). NÃO faça commit/PR até corrigir.\n`);
  process.exit(1);
}
console.log("\nAPROVADO: pode commitar e abrir o PR (depois de testar o login no navegador).\n");
