# 🎥 OBS Auto Chapters (Gerenciador de Capítulos)

Um aplicativo multiplataforma (Windows, Mac, Linux) construído com **Electron** e **Node.js** para automatizar a marcação de capítulos em transmissões ao vivo. Ele se integra nativamente ao **OBS Studio** (via WebSocket) e atualiza a descrição da sua live no **YouTube** em tempo real.

Ideal para igrejas (integração com Holyrics), podcasts, aulas e qualquer transmissão que precise de uma minutagem (índice) precisa sem trabalho manual pós-live.

---

## ✨ Funcionalidades

* **Integração com OBS Studio:** Inicia a contagem de tempo automaticamente assim que a transmissão começa.
* **Atualização Automática no YouTube:** Conecta via OAuth 2.0 com seu canal e injeta os capítulos na descrição da live em tempo real.
* **Painel Customizado no OBS (Dock):** Crie botões dinâmicos no Painel Admin e use-os embutidos na própria interface do OBS.
* **Integração com Holyrics (Webhooks):** Recebe requisições HTTP para marcar automaticamente a minutagem de louvores e textos bíblicos.
* **Painel Administrativo:** Interface gráfica para configurar IP/Senha do OBS, vincular conta do YouTube e criar botões manuais.
* **Autostart Silencioso:** Inclui um script Lua (`autostart_marcadores.lua`) para iniciar o aplicativo em background automaticamente ao abrir o OBS.

---

## 🚀 Pré-requisitos

Antes de começar, você precisará ter instalado em sua máquina:
* [Node.js](https://nodejs.org/) (versão 16 ou superior)
* [OBS Studio](https://obsproject.com/pt-br/download) (versão 28+ com WebSocket ativado)
* Credenciais da **YouTube Data API v3** (Google Cloud Console)

---

## 🛠️ Instalação e Execução Local

1. **Clone o repositório:**
   ```bash
   git clone [https://github.com/seu-usuario/obs-auto-chapters.git](https://github.com/seu-usuario/obs-auto-chapters.git)
   cd obs-auto-chapters

```

2. **Instale as dependências:**
```bash
npm install

```


3. **Configure as Variáveis de Ambiente:**
* Renomeie o arquivo `.env.example` para `.env`.
* Preencha com o `Client ID` e `Client Secret` do seu projeto no Google Cloud (Tipo de Aplicação: Desktop/Computador).


4. **Inicie o aplicativo:**
```bash
npm start

```



---

## ⚙️ Configurando no OBS Studio

### 1. Conectando o Painel de Botões (Dock)

1. Com o app rodando, abra o OBS Studio.
2. Vá no menu superior: **Painéis** > **Painéis de Navegador Personalizados**.
3. Adicione um novo painel:
* **Nome:** Marcadores
* **URL:** `http://localhost:3000/dock`


4. Clique em **Aplicar**. Você pode arrastar este painel e acoplá-lo em qualquer lugar da sua tela do OBS.

### 2. Configurando o Autostart (Script Lua)

Para que o aplicativo abra sozinho (invisível) sempre que o OBS for iniciado:

1. Vá em **Ferramentas** > **Scripts**.
2. Clique no botão **+** e selecione o arquivo `autostart_marcadores.lua` localizado na pasta deste projeto.

*Nota:* O script identifica automaticamente se você está usando Windows, Mac ou Linux.

---

## 🔌 Integração com Holyrics (Webhooks)

O aplicativo levanta um servidor na porta `3000`. Para registrar momentos automaticamente através de outros softwares (como Holyrics, Stream Deck, Touch Portal), faça uma requisição **POST**:

* **URL:** `http://localhost:3000/api/holyrics`
* **Headers:** `Content-Type: application/json`
* **Body:**
```json
{
  "tipo": "musica",
  "titulo": "{song_title} - {song_artist}"
}

```



*(Tipos suportados por padrão: musica, biblia, pregacao, oracao, avisos, manual)*

---

## 📦 Compilando para Produção (Executável)

Para gerar o instalador para distribuir o software, utilizamos o `electron-builder`.

1. Certifique-se de ter configurado o bloco `"build"` no `package.json`.
2. Rode o comando referente ao seu sistema operacional:

```bash
# Para Windows (.exe / nsis)
npm run build:win

# Para macOS (.dmg / .app)
npm run build:mac

# Para Linux (.AppImage / .deb)
npm run build:linux

```

```

```