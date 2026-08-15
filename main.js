const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { OBSWebSocket } = require('obs-websocket-js');
const { atualizarDescricaoYouTube, loginManualYouTube } = require('./youtube');

const expressApp = express();
const obs = new OBSWebSocket();

expressApp.use(express.json());
expressApp.use(cors());

// Estado global
let adminWindow = null;
let streamStartTime = null;
let capitulos = [];
let store;
let tray = null; // Ícone ao lado do relógio

// ---------------------------------------------------------
// 1. SERVIDOR EXPRESS (Dock e Holyrics)
// ---------------------------------------------------------
expressApp.post('/api/holyrics', async (req, res) => {
    try {
        const holyricsUrl = store.get('holyricsUrl', 'http://localhost:80/view/text');
        const response = await fetch(holyricsUrl);
        const html = await response.text();

        let tituloExtraido = "";
        let icone = "📌"; // Ícone padrão

        // 1. Busca por Música
        const matchMusicTitle = html.match(/<div id="music_title"[^>]*>(.*?)<\/div>/);
        const matchMusicArtist = html.match(/<div id="music_artist"[^>]*>(.*?)<\/div>/);
        
        // 2. Busca por Bíblia
        const matchBible = html.match(/<span class="header bible-header-custom"[^>]*>(.*?)<\/span>/);

        // 3. Lógica de decisão
        if (matchMusicTitle && matchMusicTitle[1].trim() !== '') {
            const title = matchMusicTitle[1].trim();
            const artist = (matchMusicArtist && matchMusicArtist[1].trim() !== '') 
                ? ` - ${matchMusicArtist[1].trim()}` 
                : '';
            tituloExtraido = title + artist;
            icone = "🎵";
        } 
        else if (matchBible && matchBible[1].trim() !== '') {
            tituloExtraido = matchBible[1].trim();
            icone = "📖";
        } 
        else if (html.includes('empty_slide')) {
            // Se a tela estiver limpa/vazia, ignoramos silenciosamente
            return res.json({ success: true, message: "Tela vazia ignorada." });
        } 
        else {
            return res.json({ success: false, message: "Nenhum dado reconhecido no HTML." });
        }

        // Registra o capítulo no sistema
        registrarCapitulo(icone, tituloExtraido);
        res.json({ success: true, titulo: tituloExtraido });

    } catch (error) {
        console.error("❌ Erro ao buscar dados no HTML do Holyrics:", error.message);
        res.status(500).json({ success: false, error: "Não foi possível conectar ao plugin do Holyrics." });
    }
});

expressApp.post('/api/manual', (req, res) => {
    const { icone, titulo } = req.body;
    registrarCapitulo(icone, titulo);
    res.json({ success: true });
});

expressApp.get('/api/botoes', (req, res) => {
    if (!store) return res.json([]);
    res.json(store.get('botoes') || []);
});

// Nova rota: O Dock do OBS vai chamar isso para abrir a janela Admin
expressApp.get('/api/abrir-admin', (req, res) => {
    abrirJanelaAdmin();
    res.json({ success: true });
});

expressApp.use('/dock', express.static(path.join(__dirname, 'dock')));

// ---------------------------------------------------------
// 2. LÓGICA DE MINUTAGEM E CONEXÃO COM O OBS
// ---------------------------------------------------------
function registrarCapitulo(icone, titulo) {
    if (!streamStartTime) {
        console.log("Aviso: Tentativa de registrar capítulo, mas a live não iniciou.");
        return;
    }

    const agora = new Date();
    const diffMs = agora - streamStartTime;

    const horas = Math.floor(diffMs / 3600000).toString().padStart(2, '0');
    const minutos = Math.floor((diffMs % 3600000) / 60000).toString().padStart(2, '0');
    const segundos = Math.floor((diffMs % 60000) / 1000).toString().padStart(2, '0');
    const timestamp = `${horas}:${minutos}:${segundos}`;

    const linhaLog = `${timestamp} - ${icone} ${titulo}`;
    capitulos.push(linhaLog);

    if (adminWindow) adminWindow.webContents.send('novo-log', linhaLog);

    atualizarDescricaoYouTube(capitulos);
}


let isReconnecting = false;
async function conectarOBS() {
    if (!store) return; // Aguarda o store iniciar

    const ip = store.get('obsIp', '127.0.0.1');
    const portaObs = store.get('obsPort', '4455');
    const senha = store.get('obsPassword', '');
    const url = `ws://${ip}:${portaObs}`;

    try {
        await obs.connect(url, senha);
        console.log(`✅ Conectado ao OBS em ${url}`);

        // Evita duplicar listeners se reconectar
        obs.removeAllListeners('StreamStateChanged');
        obs.removeAllListeners('ConnectionClosed');

        obs.on('StreamStateChanged', data => {
            if (data.outputActive) {
                streamStartTime = new Date();
                capitulos = [];
                registrarCapitulo('▶️', 'Início da Transmissão');
            } else {
                streamStartTime = null;
            }
        });

        obs.on('ConnectionClosed', () => {
            if (isReconnecting) {
                console.log("🔄 Reiniciando conexão com as novas configurações...");
                isReconnecting = false;
                conectarOBS();
            } else {
                console.log("OBS fechado. Encerrando o aplicativo marcador...");
                app.quit();
            }
        });

    } catch (error) {
        console.error(`❌ OBS não encontrado em ${url} ou senha errada. Tentando em 5s...`);
        // Tenta novamente em 5 segundos, lendo os dados atualizados
        setTimeout(conectarOBS, 5000);
    }
}

// ---------------------------------------------------------
// 3. CICLO DE VIDA DO ELECTRON
// ---------------------------------------------------------
// Bloqueia múltiplas instâncias
if (!app.requestSingleInstanceLock()) {
    app.quit();
    process.exit(0);
}

function abrirJanelaAdmin() {
    if (adminWindow) {
        if (adminWindow.isMinimized()) adminWindow.restore();
        adminWindow.focus();
        return;
    }

    adminWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    adminWindow.loadFile('admin.html');
    adminWindow.on('closed', () => { adminWindow = null; });
}

app.whenReady().then(async () => {
    const StoreModule = await import('electron-store');
    store = new StoreModule.default();

    if (!store.has('botoes')) {
        store.set('botoes', [
            { id: 'btn_inicio', label: '▶️ Início', titulo: 'Início da Transmissão', icone: '▶️' },
            { id: 'btn_oracao', label: '🙏 Oração', titulo: 'Momento de Oração', icone: '🙏' }
        ]);
    }

    const PORT = store.get('appPort', 3000);
    expressApp.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

    // Inicia a conexão (que agora fica tentando até achar o OBS)
    conectarOBS();

    // Cria o ícone na bandeja (System Tray) para rodar invisível
    // Certifique-se de ter um arquivo 'icon.png' na sua pasta!
    try {
        tray = new Tray(path.join(__dirname, 'icon.png')); // ADICIONE UM ÍCONE 16x16
        const contextMenu = Menu.buildFromTemplate([
            { label: 'Abrir Painel Admin', click: abrirJanelaAdmin },
            { type: 'separator' },
            { label: 'Sair', click: () => app.quit() }
        ]);
        tray.setToolTip('Marcador de Capítulos OBS');
        tray.setContextMenu(contextMenu);
    } catch (e) {
        console.log("Sem ícone de bandeja configurado.");
    }

    // Não chamamos 'abrirJanelaAdmin()' aqui. O app inicia silenciosamente.
});

app.on('window-all-closed', () => {
    // Sobrescreve o padrão do Electron para NÃO FECHAR o app se a janela Admin fechar
    // O app continua rodando no Tray.
});

// Comunicação com a interface Admin
ipcMain.on('salvar-botoes', (event, novosBotoes) => {
    if (store) {
        store.set('botoes', novosBotoes);
        console.log(`[Banco de Dados] ${novosBotoes.length} botão(ões) salvo(s).`);
    }
});

// Disparado pelo botão no admin.html
ipcMain.on('vincular-youtube', async (event) => {
    try {
        await loginManualYouTube();
        event.reply('youtube-status', { success: true, message: "YouTube vinculado com sucesso!" });
    } catch (error) {
        event.reply('youtube-status', { success: false, message: error.message });
    }
});
// Retorna os dados para o painel quando ele abre
ipcMain.handle('obter-dados-store', () => {
    if (!store) return {};
    return {
        obsIp: store.get('obsIp', '127.0.0.1'),
        obsPort: store.get('obsPort', '4455'),
        obsUser: store.get('obsUser', ''),
        obsPassword: store.get('obsPassword', ''),
        appPort: store.get('appPort', '3000'),
        botoes: store.get('botoes', []),
        holyricsUrl: store.get('holyricsUrl', 'http://localhost:80/view/text'),
    };
});

// Salva as configurações e reconecta o OBS
ipcMain.on('salvar-configuracoes', (event, config) => {
    if (!store) return;
    
    store.set('obsIp', config.obsIp);
    store.set('obsPort', config.obsPort);
    store.set('obsUser', config.obsUser);
    store.set('obsPassword', config.obsPassword);
    store.set('appPort', config.appPort);
    store.set('holyricsUrl', config.holyricsUrl);
    
    console.log("Configurações atualizadas via painel Admin.");
    isReconnecting = true;
    
    try {
        obs.disconnect(); // Força a desconexão para aplicar a nova senha
    } catch (e) { }
});