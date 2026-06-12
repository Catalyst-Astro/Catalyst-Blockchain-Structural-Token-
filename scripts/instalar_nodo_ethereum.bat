@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title Instalador — Nodo Ethereum desde Cero

:: =============================================================================
:: instalar_nodo_ethereum.bat — Setup completo Geth + Lighthouse en Windows
:: =============================================================================
:: Doble clic para ejecutar. Requiere permisos de administrador la primera vez.

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║   INSTALADOR NODO ETHEREUM — Geth + Lighthouse (Mainnet)     ║
echo ║   Desde cero — Todo en disco N:                              ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

:: ─── 1. Verificar que existe disco N: ──────────────────────────────────
if not exist "N:\" (
    echo [ERROR] El disco N: no existe.
    echo Conecta tu disco externo o cambia la ruta en este script.
    pause
    exit /b 1
)

echo [1/6] Verificando disco N:...
for /f "tokens=3" %%a in ('dir N:\ 2^>nul ^| find "bytes libres"') do set ESPACIO=%%a
echo        OK - Disco N: encontrado

:: ─── 2. Crear estructura de directorios ─────────────────────────────────
echo.
echo [2/6] Creando estructura de directorios...

set ETH_DATA=N:\Ethereum
set GETH_DATA=%ETH_DATA%\geth
set LIGHTHOUSE_DATA=%ETH_DATA%\lighthouse
set JWT_SECRET=%ETH_DATA%\jwtsecret
set BIN_DIR=%ETH_DATA%\bin

mkdir "%ETH_DATA%"     2>nul
mkdir "%GETH_DATA%"    2>nul
mkdir "%LIGHTHOUSE_DATA%" 2>nul
mkdir "%BIN_DIR%"      2>nul

echo        OK - Carpetas listas en %ETH_DATA%

:: ─── 3. Detener Geth anterior si está corriendo ────────────────────────
echo.
echo [3/6] Deteniendo procesos anteriores...

taskkill /f /im geth.exe 2>nul
taskkill /f /im lighthouse.exe 2>nul
timeout /t 2 /nobreak >nul
echo        OK - Procesos detenidos

:: ─── 4. Generar JWT secret ──────────────────────────────────────────────
echo.
echo [4/6] Configurando JWT secret...

if not exist "%JWT_SECRET%" (
    powershell -Command "$jwt=(1..32|ForEach-Object{'{(0:x2)}'-f(Get-Random-Maximum 256)});[System.IO.File]::WriteAllText('%JWT_SECRET%',(-join$jwt))"
    echo        OK - JWT generado: %JWT_SECRET%
) else (
    echo        OK - JWT ya existe: %JWT_SECRET%
)

:: ─── 5. Descargar Lighthouse ─────────────────────────────────────────────
echo.
echo [5/6] Descargando Lighthouse (consensus client)...

if exist "%BIN_DIR%\lighthouse.exe" (
    echo        Lighthouse ya está descargado. Omitiendo descarga.
    goto :crear_scripts
)

echo        Buscando ultima version de Lighthouse...
echo        Esto puede tomar unos minutos...

:: Usar PowerShell para la descarga
powershell -Command "
    try {
        Write-Host '        Conectando a GitHub...'
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $release = Invoke-RestMethod -Uri 'https://api.github.com/repos/sigp/lighthouse/releases/latest'
        $version = $release.tag_name
        Write-Host \"        Version encontrada: $version\"
        $url = \"https://github.com/sigp/lighthouse/releases/download/$version/lighthouse-$version-x86_64-windows-portable.zip\"
        $zip = '%BIN_DIR%\lighthouse.zip'
        Write-Host '        Descargando Lighthouse...'
        Invoke-WebRequest -Uri $url -OutFile $zip
        Write-Host '        Extrayendo...'
        Expand-Archive -Path $zip -DestinationPath '%BIN_DIR%' -Force
        Remove-Item $zip
        Write-Host '        Lighthouse instalado correctamente.'
    } catch {
        Write-Host '        ERROR descargando Lighthouse.'
        Write-Host '        Descargalo manual de: https://github.com/sigp/lighthouse/releases'
        Write-Host '        Pone lighthouse.exe en: %BIN_DIR%'
    }
"

if exist "%BIN_DIR%\lighthouse.exe" (
    echo        OK - Lighthouse instalado
) else (
    echo        ADVERTENCIA - Lighthouse no se descargo. El nodo NO sincronizara sin el.
    echo        Continua manualmente despues.
)

:: ─── 6. Crear scripts de arranque ───────────────────────────────────────
:crear_scripts
echo.
echo [6/6] Creando scripts de arranque...

:: --- iniciar_geth.bat ---
(
echo @echo off
echo title Geth — Execution Client
echo echo ═══════════════════════════════════════════════
echo echo   GETH — Execution Client ^(Mainnet^)
echo echo ═══════════════════════════════════════════════
echo echo.
echo echo Data:   %GETH_DATA%
echo echo JWT:    %JWT_SECRET%
echo echo RPC:    http://127.0.0.1:8545
echo echo WS:     ws://127.0.0.1:8546
echo echo.
echo echo Iniciando Geth...
echo echo.
echo geth --datadir="%GETH_DATA%" --syncmode=snap --cache=4096 --http --http.api=eth,net,web3,admin,personal --http.addr=0.0.0.0 --http.corsdomain="*" --ws --ws.api=eth,net,web3 --ws.addr=0.0.0.0 --authrpc.jwtsecret="%JWT_SECRET%" --authrpc.addr=127.0.0.1 --authrpc.port=8551 --metrics --metrics.addr=0.0.0.0 --maxpeers=50
) > "%ETH_DATA%\iniciar_geth.bat"
echo        OK - iniciar_geth.bat

:: --- iniciar_lighthouse.bat ---
(
echo @echo off
echo title Lighthouse — Consensus Client
echo echo ═══════════════════════════════════════════════
echo echo   LIGHTHOUSE — Consensus Client ^(Mainnet^)
echo echo ═══════════════════════════════════════════════
echo echo.
echo echo Data:   %LIGHTHOUSE_DATA%
echo echo JWT:    %JWT_SECRET%
echo echo.
echo echo Iniciando Lighthouse...
echo echo SI FALLA LA DESCARGA AUTOMATICA DEL CHECKPOINT:
echo echo Lighthouse hara sync normal ^(mas lento^). Es normal.
echo echo.
echo "%BIN_DIR%\lighthouse.exe" beacon_node --network mainnet --datadir="%LIGHTHOUSE_DATA%" --execution-endpoint http://127.0.0.1:8551 --execution-jwt "%JWT_SECRET%" --checkpoint-sync-url "https://mainnet.checkpoint.sigp.io" --http --http-address 0.0.0.0 --http-port 5052 --metrics --metrics-address 0.0.0.0 --port 9000 --discovery-port 9000 --target-peers 50
) > "%ETH_DATA%\iniciar_lighthouse.bat"
echo        OK - iniciar_lighthouse.bat

:: --- ARRANCAR TODO (script maestro) ---
(
echo @echo off
echo title ═══ NODO ETHEREUM COMPLETO ═══
echo chcp 65001 ^>nul
echo.
echo echo.
echo echo ╔═══════════════════════════════════════════════════════════════╗
echo echo ║          ARRANCANDO NODO ETHEREUM COMPLETO                    ║
echo echo ║          Geth ^(execution^) ^+ Lighthouse ^(consensus^)             ║
echo echo ╚═══════════════════════════════════════════════════════════════╝
echo echo.
echo.
echo :: Verificar que los binarios existen
echo if not exist "%BIN_DIR%\lighthouse.exe" ^(
echo     echo [ERROR] Lighthouse no encontrado en %BIN_DIR%
echo     echo Ejecuta primero: instalar_nodo_ethereum.bat
echo     pause
echo     exit /b 1
echo ^)
echo.
echo where geth ^>nul 2^>^&1
echo if %%errorlevel%% neq 0 ^(
echo     echo [ERROR] Geth no encontrado en el PATH
echo     echo Instala Geth de: https://geth.ethereum.org/downloads
echo     pause
echo     exit /b 1
echo ^)
echo.
echo echo [1/2] Iniciando Geth ^(execution client^)...
echo start "Geth-Execution" cmd /c "%ETH_DATA%\iniciar_geth.bat"
echo.
echo echo        Esperando 30 segundos para que Geth inicialice...
echo timeout /t 30 /nobreak ^>nul
echo.
echo echo [2/2] Iniciando Lighthouse ^(consensus client^)...
echo start "Lighthouse-Consensus" cmd /c "%ETH_DATA%\iniciar_lighthouse.bat"
echo.
echo echo.
echo echo ═══════════════════════════════════════════════════════════════
echo echo   NODO INICIADO - Abajo las URLs para monitorear:
echo echo ═══════════════════════════════════════════════════════════════
echo echo.
echo echo   Geth RPC:       http://127.0.0.1:8545
echo echo   Geth WebSocket:  ws://127.0.0.1:8546
echo echo   Lighthouse API:  http://127.0.0.1:5052
echo echo.
echo echo   Metricas Geth:     http://127.0.0.1:6060/debug/metrics
echo echo   Lighthouse syncing: http://127.0.0.1:5052/eth/v1/node/syncing
echo echo.
echo echo   Las ventanas de Geth y Lighthouse se abrieron por separado.
echo echo   Revisalas para ver el progreso de sincronizacion.
echo echo.
echo echo   Tiempo estimado: 6-12 horas para sincronizacion completa.
echo echo.
echo pause
) > "%ETH_DATA%\arrancar_todo.bat"
echo        OK - arrancar_todo.bat

:: ─── Resumen ─────────────────────────────────────────────────────────────
echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║                   ¡INSTALACION COMPLETA!                      ║
echo ╠═══════════════════════════════════════════════════════════════╣
echo ║                                                               ║
echo ║  Datos:     %ETH_DATA%
echo ║                                                               ║
echo ║  Scripts creados:                                             ║
echo ║    iniciar_geth.bat        — Solo Geth                       ║
echo ║    iniciar_lighthouse.bat  — Solo Lighthouse                 ║
echo ║    arrancar_todo.bat       — Los dos juntos (RECOMENDADO)    ║
echo ║                                                               ║
echo ║                                                               ║
echo ╠═══════════════════════════════════════════════════════════════╣
echo ║  PARA INICIAR:                                                ║
echo ║    Doble clic en:                                             ║
echo ║    %ETH_DATA%\arrancar_todo.bat                               ║
echo ║                                                               ║
echo ║  O desde terminal:                                            ║
echo ║    %ETH_DATA%\arrancar_todo.bat                               ║
echo ║                                                               ║
echo ╠═══════════════════════════════════════════════════════════════╣
echo ║                                                               ║
echo ║  RPC disponible en:     http://127.0.0.1:8545                ║
echo ║  Sincronizacion total:  ~6-12 horas                          ║
echo ║                                                               ║
echo ║  IMPORTANTE: Ethereum NO se mina desde 2022.                 ║
echo ║  Para ganar ETH validando necesitas 32 ETH stakeados.        ║
echo ║  El nodo te sirve para consultas, privacidad y dApps.        ║
echo ║                                                               ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.
echo Presiona cualquier tecla para abrir la carpeta...
pause >nul
explorer "%ETH_DATA%"
