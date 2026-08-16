const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const { app, shell } = require('electron'); // Importamos o app do electron para pegar os caminhos do sistema
require('dotenv').config();
let authServer = null; 

const SCOPES = ['https://www.googleapis.com/auth/youtube.force-ssl'];

// O credentials.json é empacotado junto com o app (leitura)
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

// O token.json DEVE ser salvo na pasta de dados de usuário do SO (gravação)
// Windows: %APPDATA%\obs-chapter-marker\token.json
// Mac: ~/Library/Application Support/obs-chapter-marker/token.json
const TOKEN_PATH = path.join(app.getPath('userData'), 'token.json');

/**
 * Autentica e retorna o cliente da API do YouTube
 */

/**
 * Autentica e retorna o cliente da API do YouTube
 */
async function getAuthenticatedClient() {
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    const redirectUri = process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3333';

    if (!clientId || !clientSecret) {
        throw new Error("Credenciais do YouTube (CLIENT_ID e CLIENT_SECRET) não configuradas no ambiente.");
    }

    const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    if (fs.existsSync(TOKEN_PATH)) {
        const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
        oAuth2Client.setCredentials(token);
        return oAuth2Client;
    }

    return new Promise((resolve, reject) => {
        // Se já existir um servidor aguardando login, fecha ele primeiro
        if (authServer) {
            try { authServer.close(); } catch (e) {}
        }

        authServer = http.createServer(async (req, res) => {
            try {
                if (req.url.startsWith('/')) {
                    const qs = new url.URL(req.url, redirectUri).searchParams;
                    const code = qs.get('code');
                    
                    res.end('<h1>Autenticacao concluida!</h1><p>Pode fechar esta janela e voltar ao aplicativo.</p>');
                    
                    if (authServer) authServer.close(); // Fecha o servidor com sucesso

                    if (code) {
                        const { tokens } = await oAuth2Client.getToken(code);
                        oAuth2Client.setCredentials(tokens);
                        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
                        resolve(oAuth2Client);
                    } else {
                        reject(new Error("Código de autorização não recebido."));
                    }
                }
            } catch (e) {
                reject(e);
            }
        });

        // Captura o erro da porta 3333 ocupada
        authServer.on('error', (e) => {
            if (e.code === 'EADDRINUSE') {
                reject(new Error("O navegador já está aguardando o login. Verifique as abas abertas e tente logar por lá."));
            } else {
                reject(e);
            }
        });

        authServer.listen(3333, () => {
            const authUrl = oAuth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: SCOPES,
                prompt: 'consent'
            });
            console.log("Abrindo navegador para permissão do YouTube...");
            shell.openExternal(authUrl);
        });
    });
}

/**
 * Atualiza a descrição da live ativa injetando os capítulos
 */
async function atualizarDescricaoYouTube(capitulosArray) {
    try {
        const auth = await getAuthenticatedClient();
        const youtube = google.youtube({ version: 'v3', auth });

        const response = await youtube.liveBroadcasts.list({
            part: 'id,snippet',
            broadcastStatus: 'active',
            broadcastType: 'all'
        });

        const items = response.data.items;
        if (!items || items.length === 0) {
            console.log("[YouTube] Nenhuma transmissão ativa encontrada.");
            return false;
        }

        const broadcast = items[0];
        const snippet = broadcast.snippet;

        const descricaoAtual = snippet.description || '';
        const marcador = "--- Capítulos da Transmissão ---";
        
        // Busca apenas o texto do marcador, sem depender de quebras de linha
        let descricaoBase = descricaoAtual;
        if (descricaoAtual.includes(marcador)) {
            // Pega o texto ANTES do marcador e limpa quebras de linha sobrando no final
            descricaoBase = descricaoAtual.split(marcador)[0].trim();
        } else {
            // Se for a primeira vez, apenas limpa a descrição original
            descricaoBase = descricaoAtual.trim();
        }

        const novosCapitulosTexto = capitulosArray.join('\n');
        
        // Remonta a descrição forçando a formatação correta
        snippet.description = `${descricaoBase}\n\n${marcador}\n${novosCapitulosTexto}`;

        await youtube.liveBroadcasts.update({
            part: 'snippet',
            requestBody: {
                id: broadcast.id,
                snippet: snippet
            }
        });

        console.log("[YouTube] Descrição e capítulos atualizados com sucesso!");
        return true;
    } catch (error) {
        console.error("[YouTube] Erro ao atualizar descrição:", error.message);
        return false;
    }
}

async function loginManualYouTube() {
    try {
        await getAuthenticatedClient();
        return true;
    } catch (error) {
        throw new Error("Falha ao vincular: " + error.message);
    }
}

module.exports = { atualizarDescricaoYouTube, loginManualYouTube };