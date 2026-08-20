markdown_content = """<div align="center">
  <h1>🎥 OBS Auto Chapters</h1>
  <p><b>Gerenciador de Capítulos Automático</b></p>
  <p>Um aplicativo multiplataforma (Windows, Mac, Linux) construído com <b>Electron</b> e <b>Node.js</b> para automatizar a marcação de capítulos em transmissões ao vivo.</p>
</div>

---

## 📖 Sobre o Projeto

Ele se integra nativamente ao **OBS Studio** (via WebSocket) e atualiza a descrição da sua live no **YouTube** em tempo real. Ideal para igrejas (integração inteligente com Holyrics), podcasts, aulas e qualquer transmissão que precise de uma minutagem (índice) precisa sem trabalho manual pós-live.

## ✨ Funcionalidades

- 🔴 **Integração com OBS Studio:** Inicia a contagem de tempo automaticamente assim que a transmissão começa.
- 📺 **Atualização Automática no YouTube:** Conecta via OAuth 2.0 com seu canal e injeta os capítulos na descrição da live em tempo real.
- 🎛️ **Painel Customizado no OBS (Dock):** Crie botões dinâmicos no Painel Admin e use-os embutidos na própria interface do OBS.
- ⌨️ **Teclado de Emojis Integrado:** Personalize a aparência dos seus botões diretamente no painel administrativo sem depender da internet.
- 🤖 **Leitura Automática do Holyrics (Scraping):** Conecta-se à URL do plugin do Holyrics para ler de forma autônoma o que está no telão (Músicas e Bíblia), sem precisar configurar variáveis complexas.
- 🪝 **Gatilhos Personalizados (Webhooks):** Recebe requisições HTTP em JSON para marcações manuais através de outros softwares (Stream Deck, Touch Portal, etc).
- ⚙️ **Painel Administrativo:** Interface gráfica para configurar IP/Senha do OBS, vincular conta do YouTube, configurar URL do Holyrics e criar botões manuais.
- 👻 **Autostart Silencioso:** Inclui um script Lua (`autostart_marcadores.lua`) para iniciar o aplicativo em background automaticamente ao abrir o OBS.

---

## 🚀 Pré-requisitos

Antes de começar, você precisará ter instalado em sua máquina:

- [Node.js](https://nodejs.org/) (versão 16 ou superior)
- [OBS Studio](https://obsproject.com/pt-br/download) (versão 28+ com WebSocket ativado)
- Credenciais da **YouTube Data API v3** (Google Cloud Console)

---

## 🔌 Integração com Holyrics (Webhooks)

O aplicativo levanta um servidor na porta `3000` e atua de duas formas para registrar os momentos da sua transmissão:

### Modo 1: Leitura Automática (Músicas e Bíblia)

Basta criar um gatilho de Requisição HTTP (`POST`) no Holyrics apontando para `http://localhost:3000/api/holyrics` **sem nenhum conteúdo no corpo (Body)**. O aplicativo fará a leitura do HTML do telão em tempo real e registrará a música ou versículo automaticamente. Exemplo de respostas internas:

```json
{
  "tipo": "musica"
}
JSON
{
  "tipo": "biblia"
}
Modo 2: Comandos Personalizados (JSON)
Para enviar comandos específicos que não estão no telão (ex: Pregação, Avisos, Oração), envie um gatilho HTTP POST para a mesma URL (http://localhost:3000/api/holyrics) com o seguinte corpo em JSON:

JSON
{
  "tipo": "custom",
  "titulo": "Pregação da Palavra",
  "icone": "🎤"
}
🛠️ Instalação e Execução Local
Clone o repositório:

Bash
git clone [https://github.com/seu-usuario/obs-auto-chapters.git](https://github.com/seu-usuario/obs-auto-chapters.git)
cd obs-auto-chapters
Instale as dependências:

Bash
npm install
Configure as Variáveis de Ambiente:

Renomeie o arquivo .env.example para .env.

Preencha com o Client ID e Client Secret do seu projeto no Google Cloud (Tipo de Aplicação: Desktop/Computador).

Inicie o aplicativo:

Bash
npm start
📦 Compilando para Produção (Executável)
Para gerar o instalador para distribuir o software, utilizamos o electron-builder. Rode o comando referente ao seu sistema operacional:

Bash
# Para Windows (.exe / nsis)
npm run build:win

# Para macOS (.dmg / .app)
npm run build:mac

# Para Linux (.AppImage / .deb)
npm run build:linux
"""

with open("README.md", "w", encoding="utf-8") as f:
f.write(markdown_content)

print("File generated successfully.")


```text?code_stdout&code_event_index=1
File generated successfully.

O seu arquivo Markdown formatado está pronto. Ajustei o estilo visualizando uma melhor apresentação como um README, organizei o espaçamento, limpei a sintaxe de listas e alinhei o título do projeto.  
MD

Ícone do app MD
README
 MD 
Aberto
posso colocar no git?

Com certeza! O arquivo está formatado perfeitamente para ser exibido no GitHub (ou GitLab/Bitbucket).  
MD

Para enviar o arquivo atualizado para o seu repositório, basta rodar os seguintes comandos no terminal do seu projeto:

Bash
git add README.md
git commit -m "docs: atualiza e formata o README"
git push
Quer ajuda com mais alguma parte da documentação ou do código desse projeto?




O Gemini é uma IA e pode cometer erros.

Answering the Inquiry
<div align="center">
  <h1>🎥 OBS Auto Chapters</h1>
  <p><b>Gerenciador de Capítulos Automático</b></p>
  <p>Um aplicativo multiplataforma (Windows, Mac, Linux) construído com <b>Electron</b> e <b>Node.js</b> para automatizar a marcação de capítulos em transmissões ao vivo.</p>
</div>

---

## 📖 Sobre o Projeto

Ele se integra nativamente ao **OBS Studio** (via WebSocket) e atualiza a descrição da sua live no **YouTube** em tempo real. Ideal para igrejas (integração inteligente com Holyrics), podcasts, aulas e qualquer transmissão que precise de uma minutagem (índice) precisa sem trabalho manual pós-live.

## ✨ Funcionalidades

- 🔴 **Integração com OBS Studio:** Inicia a contagem de tempo automaticamente assim que a transmissão começa.
- 📺 **Atualização Automática no YouTube:** Conecta via OAuth 2.0 com seu canal e injeta os capítulos na descrição da live em tempo real.
- 🎛️ **Painel Customizado no OBS (Dock):** Crie botões dinâmicos no Painel Admin e use-os embutidos na própria interface do OBS.
- ⌨️ **Teclado de Emojis Integrado:** Personalize a aparência dos seus botões diretamente no painel administrativo sem depender da internet.
- 🤖 **Leitura Automática do Holyrics (Scraping):** Conecta-se à URL do plugin do Holyrics para ler de forma autônoma o que está no telão (Músicas e Bíblia), sem precisar configurar variáveis complexas.
- 🪝 **Gatilhos Personalizados (Webhooks):** Recebe requisições HTTP em JSON para marcações manuais através de outros softwares (Stream Deck, Touch Portal, etc).
- ⚙️ **Painel Administrativo:** Interface gráfica para configurar IP/Senha do OBS, vincular conta do YouTube, configurar URL do Holyrics e criar botões manuais.
- 👻 **Autostart Silencioso:** Inclui um script Lua (`autostart_marcadores.lua`) para iniciar o aplicativo em background automaticamente ao abrir o OBS.

---

## 🚀 Pré-requisitos

Antes de começar, você precisará ter instalado em sua máquina:

- [Node.js](https://nodejs.org/) (versão 16 ou superior)
- [OBS Studio](https://obsproject.com/pt-br/download) (versão 28+ com WebSocket ativado)
- Credenciais da **YouTube Data API v3** (Google Cloud Console)

---

## 🔌 Integração com Holyrics (Webhooks)

O aplicativo levanta um servidor na porta `3000` e atua de duas formas para registrar os momentos da sua transmissão:

### Modo 1: Leitura Automática (Músicas e Bíblia)

Basta criar um gatilho de Requisição HTTP (`POST`) no Holyrics apontando para `http://localhost:3000/api/holyrics` **sem nenhum conteúdo no corpo (Body)**. O aplicativo fará a leitura do HTML do telão em tempo real e registrará a música ou versículo automaticamente. Exemplo de respostas internas:

```json
{
  "tipo": "musica"
}
```

```json
{
  "tipo": "biblia"
}
```

### Modo 2: Comandos Personalizados (JSON)

Para enviar comandos específicos que não estão no telão (ex: Pregação, Avisos, Oração), envie um gatilho HTTP `POST` para a mesma URL (`http://localhost:3000/api/holyrics`) com o seguinte corpo em JSON:

```json
{
  "tipo": "custom",
  "titulo": "Pregação da Palavra",
  "icone": "🎤"
}
```

---

## 🛠️ Instalação e Execução Local

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/obs-auto-chapters.git
   cd obs-auto-chapters
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as Variáveis de Ambiente:**
   - Renomeie o arquivo `.env.example` para `.env`.
   - Preencha com o `Client ID` e `Client Secret` do seu projeto no Google Cloud (Tipo de Aplicação: Desktop/Computador).

4. **Inicie o aplicativo:**
   ```bash
   npm start
   ```

---

## 📦 Compilando para Produção (Executável)

Para gerar o instalador para distribuir o software, utilizamos o `electron-builder`. Rode o comando referente ao seu sistema operacional:

```bash
# Para Windows (.exe / nsis)
npm run build:win

# Para macOS (.dmg / .app)
npm run build:mac

# Para Linux (.AppImage / .deb)
npm run build:linux
```
README.md
Exibindo README.md.