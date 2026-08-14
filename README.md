# 📙 MX Diário de Bordo 🚧 *(Em Construção)*

> Sistema web em desenvolvimento para gestão de tempo, rotina diária e registro de atividades de trabalho para a **MX Soluções**.

---

## 🚧 Status do Projeto

> **Nota:** Este projeto está atualmente em fase de desenvolvimento/prototipagem (SPA). O código será versionado e atualizado conforme novas arquiteturas e funcionalidades forem implementadas.

---

## 📌 Funcionalidades Atuais

- **🔐 Autenticação local:**
  - Cadastro de usuário e login com persistência simples no navegador.
- **📅 Linha do Tempo Diária:**
  - Exibição visual de tarefas por horário.
  - Indicador do horário atual (*Now Line*).
  - Organização automática de blocos com sobreposição de horários.
  - Cores dinâmicas para identificação dos blocos.
- **🔒 Trava de Histórico:**
  - Opção de encerrar o diário do dia (bloqueando edições).
  - Bloqueio de alteração em diários de dias anteriores.
- **📜 Consulta de Diários Passados:**
  - Visualização em modo de leitura dos dias já encerrados.
- **📄 Exportação de Relatório:**
  - Geração e download de relatório em PDF (`jsPDF`).
- **⚙️ Configurações:**
  - Definição do intervalo do expediente exibido na tela.
  - Alteração de senha.
  - Simulador de data/hora para testes de virada de dia.

---

## 🛠️ Tecnologias Utilizadas (Versão Atual)

- **Interface:** HTML5 & CSS3 (Custom Properties, Flexbox)
- **Lógica:** JavaScript Vanilla (ES6+)
- **Bibliotecas:** `jsPDF` (para geração dos arquivos PDF)
- **Armazenamento:** `localStorage`

---

## 🔒 Licença & Privacidade

Repositório privado para uso interno da **MX Soluções**. Todos os direitos reservados.
