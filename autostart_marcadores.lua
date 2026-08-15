obslua = require("obslua")

-- Função auxiliar para descobrir qual o sistema operacional
function get_os()
    -- No Windows, a string de configuração do Lua usa '\' como separador de caminho
    local separador = package.config:sub(1,1)
    if separador == '\\' then
        return "windows"
    else
        -- Se for '/' (Unix), usamos um comando de terminal para distinguir Mac de Linux
        local f = io.popen("uname -s")
        local uname = f:read("*a")
        f:close()
        
        if uname:match("Darwin") then
            return "mac"
        else
            return "linux"
        end
    end
end

function script_load(settings)
    local os_type = get_os()
    local cmd = ""
    local app_name = "obs-chapter-marker" -- Nome do executável configurado no electron-builder
    
    if os_type == "windows" then
        -- Lógica do Windows (AppData)
        local local_appdata = os.getenv("LOCALAPPDATA")
        local app_path = local_appdata .. "\\Programs\\" .. app_name .. "\\" .. app_name .. ".exe"
        cmd = 'start "" "' .. app_path .. '"'
        
    elseif os_type == "mac" then
        -- Lógica do MacOS (Usa o comando 'open' para executar aplicativos da pasta Applications)
        cmd = 'open -a "' .. app_name .. '"'
        
    elseif os_type == "linux" then
        -- Lógica do Linux (Se instalado via .deb/.AppImage, geralmente entra no PATH global)
        -- O '&' no final garante que o OBS não fique travado esperando o app fechar
        cmd = app_name .. ' &' 
    end
    
    -- Executa o comando no sistema operacional
    if cmd ~= "" then
        os.execute(cmd)
        obslua.script_log(obslua.LOG_INFO, "Aplicativo de Marcadores iniciado em segundo plano (SO: " .. os_type .. ")")
    end
end

function script_description()
    return "Detecta o sistema operacional (Windows/Mac/Linux) e inicia automaticamente o painel de Capítulos em segundo plano."
end