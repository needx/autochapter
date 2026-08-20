obslua = require("obslua")

-- Variável para guardar o caminho escolhido pelo usuário
local custom_exe_path = ""

-- Função auxiliar para descobrir qual o sistema operacional
function get_os()
    local separador = package.config:sub(1,1)
    if separador == '\\' then return "windows" end
    local f = io.popen("uname -s")
    local uname = f:read("*a")
    f:close()
    if uname:match("Darwin") then return "mac" else return "linux" end
end

function file_exists(name)
    local f = io.open(name, "r")
    if f ~= nil then io.close(f) return true else return false end
end

-- ==========================================
-- INTERFACE DE USUÁRIO (UI) NO OBS
-- ==========================================
function script_properties()
    local props = obslua.obs_properties_create()
    
    -- Campo de Seleção de Arquivo
    obslua.obs_properties_add_path(
        props, 
        "exe_path", 
        "Caminho do Aplicativo:", 
        obslua.OBS_PATH_FILE, 
        "Executáveis (*.exe *.app *.AppImage);;Todos os arquivos (*.*)", 
        nil
    )
    
    -- Botão de Teste Manual
    obslua.obs_properties_add_button(props, "btn_testar", "▶️ Iniciar Aplicativo Agora", function()
        iniciar_aplicativo()
        return true
    end)

    return props
end

-- Salva a configuração sempre que o usuário escolhe um novo arquivo
function script_update(settings)
    custom_exe_path = obslua.obs_data_get_string(settings, "exe_path")
end

-- ==========================================
-- LÓGICA DE INICIALIZAÇÃO
-- ==========================================
function iniciar_aplicativo()
    local os_type = get_os()
    local cmd = ""
    local app_path = ""

    -- 1. Prioriza o caminho escolhido pelo usuário na UI
    if custom_exe_path ~= nil and custom_exe_path ~= "" and file_exists(custom_exe_path) then
        app_path = custom_exe_path
    end

    -- 2. Se a UI estiver vazia, tenta achar automaticamente
    if app_path == "" and os_type == "windows" then
        local local_appdata = os.getenv("LOCALAPPDATA")
        local program_files = os.getenv("PROGRAMFILES")
        local paths_to_try = {
            local_appdata .. "\\Programs\\obs-chapter-marker\\OBS Chapter Marker.exe",
            local_appdata .. "\\Programs\\obs-chapter-marker\\obs-chapter-marker.exe",
            program_files .. "\\obs-chapter-marker\\OBS Chapter Marker.exe"
        }
        for _, path in ipairs(paths_to_try) do
            if file_exists(path) then
                app_path = path
                break
            end
        end
    end

    -- 3. Executa o comando
    if app_path ~= "" then
        if os_type == "windows" then
            cmd = 'start "" "' .. app_path .. '"'
        elseif os_type == "mac" then
            cmd = 'open -a "' .. app_path .. '"'
        else
            cmd = '"' .. app_path .. '" &' 
        end
    else
        -- Fallback genérico para Mac/Linux se não tiver caminho absoluto
        if os_type == "mac" then cmd = 'open -a "OBS Chapter Marker"'
        elseif os_type == "linux" then cmd = 'obs-chapter-marker &' end
    end

    if cmd ~= "" then
        os.execute(cmd)
        obslua.script_log(obslua.LOG_INFO, "✅ Comando enviado para iniciar o aplicativo.")
    else
        obslua.script_log(obslua.LOG_WARNING, "❌ Executável não encontrado. Clique em 'Procurar' e selecione o arquivo .exe.")
    end
end

-- Chamado automaticamente quando o OBS inicia
function script_load(settings)
    custom_exe_path = obslua.obs_data_get_string(settings, "exe_path")
    iniciar_aplicativo()
end

function script_description()
    return "Inicia o painel de Capítulos automaticamente junto com o OBS.\n\nSe ele não iniciar sozinho, clique em 'Procurar' abaixo e aponte para o arquivo do aplicativo."
end