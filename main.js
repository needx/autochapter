const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const express = require('express');
const cors = require('cors');
const cheerio = require('cheerio');
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

// ==========================================
// INTERCEPTADOR DE LOGS DO SISTEMA
// ==========================================
const logHistory = [];
const MAX_LOGS = 200; // Guarda as últimas 200 linhas

const originalConsoleLog = console.log;
const originalConsoleError = console.error;

function broadcastLog(level, ...args) {
    // Transforma os argumentos em texto (para objetos e strings)
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');

    // Adiciona timestamp
    const time = new Date().toLocaleTimeString('pt-BR');
    const prefix = level === 'error' ? '❌' : 'ℹ️';
    const logLine = `[${time}] ${prefix} ${msg}`;

    // Salva no histórico
    logHistory.push({ type: level, text: logLine });
    if (logHistory.length > MAX_LOGS) logHistory.shift();

    // Envia para todas as janelas abertas
    BrowserWindow.getAllWindows().forEach(win => {
        try {
            win.webContents.send('system-log', { type: level, text: logLine });
        } catch (e) { }
    });
}

// Substitui o console original
console.log = function (...args) {
    originalConsoleLog.apply(console, args);
    broadcastLog('info', ...args);
};

console.error = function (...args) {
    originalConsoleError.apply(console, args);
    broadcastLog('error', ...args);
};

// ---------------------------------------------------------
// 1. SERVIDOR EXPRESS (Dock e Holyrics)
// ---------------------------------------------------------
expressApp.post('/api/holyrics', async (req, res) => {
    try {
        // 1. VERIFICA SE VEIO UM COMANDO PERSONALIZADO VIA JSON
        const { tipo, titulo, icone } = req.body;

        if (tipo === 'custom' && titulo) {
            const iconeFinal = icone || '📌';
            registrarCapitulo(iconeFinal, titulo);
            return res.json({ success: true, titulo: titulo, origem: 'json_custom' });
        }

        // 2. MONTAGEM INTELIGENTE DA URL DO JSON
        const configUrl = store.get('holyricsUrl', 'http://localhost:8080');
        let jsonUrl = '';
        
        try {
            // Extrai apenas a base (http://ip:porta) não importa o que o usuário digitou no painel
            const parsedUrl = new URL(configUrl);
            jsonUrl = `${parsedUrl.protocol}//${parsedUrl.host}/view/text.json`;
        } catch (e) {
            jsonUrl = 'http://localhost:8080/view/text.json';
        }

        console.log(`🔍 [Holyrics] Buscando dados invisíveis em: ${jsonUrl}`);

        const response = await fetch(jsonUrl);
        const textResponse = await response.text(); // Pega como texto primeiro para evitar quebra

        let data;
        try {
            // Tenta converter para JSON. Se for HTML (erro), ele cai no catch
            data = JSON.parse(textResponse);
        } catch (err) {
            console.error(`❌ [Holyrics] A página acessada não é um JSON. Verifique se o plugin está rodando na porta correta.`);
            return res.status(400).json({ success: false, message: "A URL não retornou os dados esperados." });
        }

        // 3. EXTRAÇÃO DOS DADOS
        // O Holyrics "embrulha" as variáveis dentro de um objeto chamado "map"
        const holyricsMap = data.map || {};

        const type = holyricsMap['type'] || 'empty';
        const musicTitle = holyricsMap['$system_var_music_title'] || '';
        const musicArtist = holyricsMap['$system_var_music_artist'] || '';
        const bibleHeader = holyricsMap['header'] || '';

        let tituloExtraido = "";
        let iconeHtml = "📌"; 

        if (type === 'MUSIC' && musicTitle !== '') {
            const artist = musicArtist !== '' ? ` - ${musicArtist}` : '';
            tituloExtraido = musicTitle + artist;
            iconeHtml = "🎵";
        } 
        else if (type === 'BIBLE' && bibleHeader !== '') {
            // O header às vezes vem com <span>, removemos as tags HTML para limpar o texto
            tituloExtraido = bibleHeader.replace(/<[^>]*>?/gm, '').trim();
            iconeHtml = "📖";
        } 
        else if (type === 'empty' || type === null || type === '') {
            return res.json({ success: true, message: "Tela vazia ignorada." });
        } 
        else {
            return res.json({ success: false, message: `Tipo de tela '${type}' não mapeado ou ignorado.` });
        }

        // 4. REGISTRA O CAPÍTULO
        registrarCapitulo(iconeHtml, tituloExtraido);
        res.json({ success: true, titulo: tituloExtraido, origem: 'json_scraper' });

    } catch (error) {
        console.error("❌ Erro de conexão com o Holyrics:", error.message);
        res.status(500).json({ success: false, error: "Não foi possível acessar a API do Holyrics." });
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

        // ==========================================
        // VERIFICA SE A LIVE JÁ ESTÁ RODANDO 
        // ==========================================
        try {
            const status = await obs.call('GetStreamStatus');
            if (status.outputActive) {
                if (!streamStartTime) {
                    // Calcula a hora exata que a live começou (Agora - Duração da live)
                    streamStartTime = new Date(Date.now() - status.outputDuration);
                    console.log(`▶️ OBS já estava transmitindo! Tempo recuperado com sucesso.`);
                }
            } else {
                streamStartTime = null;
            }
        } catch (err) {
            console.error("Aviso: Não foi possível checar o status atual do OBS.");
        }

        // Evita duplicar listeners se reconectar
        obs.removeAllListeners('StreamStateChanged');
        obs.removeAllListeners('ConnectionClosed');

        obs.on('StreamStateChanged', data => {
            if (data.outputActive) {
                streamStartTime = new Date();
                capitulos = [];
                console.log("▶️ Transmissão iniciada no OBS.");
                registrarCapitulo('▶️', 'Início da Transmissão');
            } else {
                streamStartTime = null;
                console.log("⏹️ Transmissão encerrada no OBS.");
            }
        });

        obs.on('ConnectionClosed', () => {
            if (isReconnecting) {
                console.log("🔄 Reiniciando conexão com as novas configurações...");
                isReconnecting = false;
                conectarOBS();
            } else {
                console.error("❌ OBS fechado ou conexão perdida. Tentando reconectar em 5s...");
                setTimeout(conectarOBS, 5000);
            }
        });

    } catch (error) {
        console.error(`❌ OBS não encontrado em ${url} ou senha errada. Tentando em 5s...`);
        // Tenta novamente em 5 segundos
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

ipcMain.on('abrir-janela-logs', () => {
    const logsWindow = new BrowserWindow({
        width: 700,
        height: 500,
        title: "Console do Sistema",
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    
    logsWindow.loadFile('logs.html');

    // Quando a janela terminar de carregar, envia o histórico de logs
    logsWindow.webContents.on('did-finish-load', () => {
        logsWindow.webContents.send('log-history', logHistory);
    });
});