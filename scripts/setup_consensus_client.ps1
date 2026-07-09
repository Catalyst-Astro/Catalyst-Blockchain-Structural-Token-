# =============================================================================
# setup_consensus_client.ps1 — Instalador del Consensus Client (Lighthouse)
# =============================================================================
# Ejecutar en PowerShell como Administrador:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\setup_consensus_client.ps1
# =============================================================================

$ErrorActionPreference = "Stop"

# ─── Configuración ────────────────────────────────────────────────────────
$ETH_DATA = "N:\Ethereum"
$GETH_DATA = "$ETH_DATA\geth"
$LIGHTHOUSE_DATA = "$ETH_DATA\lighthouse"
$JWT_SECRET = "$ETH_DATA\jwtsecret"

$LIGHTHOUSE_VERSION = "7.0.0"
$LIGHTHOUSE_URL = "https://github.com/sigp/lighthouse/releases/download/v${LIGHTHOUSE_VERSION}/lighthouse-v${LIGHTHOUSE_VERSION}-x86_64-windows-portable.zip"
$LIGHTHOUSE_DIR = "$ETH_DATA\bin"

Write-Host @"
╔═══════════════════════════════════════════════════════════════╗
║   INSTALADOR — NODO ETHEREUM COMPLETO (Geth + Lighthouse)    ║
╚═══════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

# ─── 1. Crear estructura de directorios ───────────────────────────────────
Write-Host "`n[1/5] Creando estructura en N:\Ethereum..." -ForegroundColor Yellow
foreach ($dir in @($ETH_DATA, $GETH_DATA, $LIGHTHOUSE_DATA, $LIGHTHOUSE_DIR)) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  ✓ Creado: $dir" -ForegroundColor Green
    } else {
        Write-Host "  ✓ Existe: $dir" -ForegroundColor Green
    }
}

# ─── 2. Generar JWT secret ────────────────────────────────────────────────
Write-Host "`n[2/5] Configurando JWT secret..." -ForegroundColor Yellow
if (-not (Test-Path $JWT_SECRET)) {
    Write-Host "  Generando nuevo JWT secret..."
    # Usar openssl si está disponible, si no usar .NET
    try {
        $jwtBytes = New-Object byte[] 32
        [System.Security.Cryptography.RandomNumberGenerator]::Fill($jwtBytes)
        $jwtHex = -join ($jwtBytes | ForEach-Object { $_.ToString("x2") })
        Set-Content -Path $JWT_SECRET -Value $jwtHex -NoNewline -Encoding ASCII
        Write-Host "  ✓ JWT generado: $JWT_SECRET" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ Error generando JWT: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  ✓ JWT ya existe: $JWT_SECRET" -ForegroundColor Green
}

# ─── 3. Descargar Lighthouse ──────────────────────────────────────────────
Write-Host "`n[3/5] Descargando Lighthouse (consensus client)..." -ForegroundColor Yellow
$zipFile = "$LIGHTHOUSE_DIR\lighthouse.zip"

# Buscar la última versión de Lighthouse
Write-Host "  Detectando última versión de Lighthouse..."
try {
    $releases = Invoke-RestMethod -Uri "https://api.github.com/repos/sigp/lighthouse/releases/latest" -TimeoutSec 10
    $latestVersion = $releases.tag_name
    Write-Host "  Última versión: $latestVersion" -ForegroundColor Green
    $LIGHTHOUSE_URL = "https://github.com/sigp/lighthouse/releases/download/${latestVersion}/lighthouse-${latestVersion}-x86_64-windows-portable.zip"
} catch {
    Write-Host "  No se pudo detectar última versión. Usando v${LIGHTHOUSE_VERSION}" -ForegroundColor Yellow
}

if (Test-Path "$LIGHTHOUSE_DIR\lighthouse.exe") {
    Write-Host "  ✓ Lighthouse ya está instalado: $LIGHTHOUSE_DIR\lighthouse.exe" -ForegroundColor Green
} else {
    Write-Host "  Descargando desde: $LIGHTHOUSE_URL"
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $LIGHTHOUSE_URL -OutFile $zipFile -TimeoutSec 300
        Write-Host "  ✓ Descarga completada" -ForegroundColor Green

        Write-Host "  Extrayendo..."
        Expand-Archive -Path $zipFile -DestinationPath $LIGHTHOUSE_DIR -Force
        Remove-Item $zipFile
        Write-Host "  ✓ Lighthouse instalado" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ Error descargando Lighthouse: $_" -ForegroundColor Red
        Write-Host "`n  Descárgalo manualmente de: https://github.com/sigp/lighthouse/releases" -ForegroundColor Yellow
        Write-Host "  Guarda lighthouse.exe en: $LIGHTHOUSE_DIR" -ForegroundColor Yellow
    }
}

# ─── 4. Crear scripts de arranque ─────────────────────────────────────────
Write-Host "`n[4/5] Creando scripts de arranque..." -ForegroundColor Yellow

# --- Script: iniciar_geth.bat ---
$gethBat = @"
@echo off
title Geth - Execution Client (Mainnet)
echo ============================================================
echo   INICIANDO GETH (Execution Client) - Ethereum Mainnet
echo ============================================================
echo.
echo Data dir:  $GETH_DATA
echo JWT:        $JWT_SECRET
echo.

REM Ajusta el cache segun tu RAM:
REM   --cache 4096  → 4 GB (recomendado si tienes 16+ GB RAM)
REM   --cache 2048  → 2 GB (recomendado si tienes 8 GB RAM)

geth ^
  --datadir="$GETH_DATA" ^
  --syncmode=snap ^
  --cache=4096 ^
  --http ^
  --http.api=eth,net,web3,personal ^
  --http.addr=0.0.0.0 ^
  --ws ^
  --ws.api=eth,net,web3 ^
  --authrpc.jwtsecret="$JWT_SECRET" ^
  --authrpc.addr=127.0.0.1 ^
  --authrpc.port=8551 ^
  --metrics ^
  --metrics.addr=0.0.0.0

pause
"@
$gethBatPath = "$ETH_DATA\iniciar_geth.bat"
Set-Content -Path $gethBatPath -Value $gethBat -Encoding ASCII
Write-Host "  ✓ $gethBatPath" -ForegroundColor Green

# --- Script: iniciar_lighthouse.bat ---
$lighthouseBat = @"
@echo off
title Lighthouse - Consensus Client (Mainnet)
echo ============================================================
echo   INICIANDO LIGHTHOUSE (Consensus Client) - Mainnet
echo ============================================================
echo.
echo Data dir:  $LIGHTHOUSE_DATA
echo JWT:        $JWT_SECRET
echo.

REM Checkpoint sync: descarga el estado mas reciente y sincroniza
REM en horas en lugar de dias. Se necesita un endpoint publico.
REM Si falla, Lighthouse usara sync normal (mas lento).

"$LIGHTHOUSE_DIR\lighthouse.exe" beacon_node ^
  --network mainnet ^
  --datadir="$LIGHTHOUSE_DATA" ^
  --execution-endpoint http://127.0.0.1:8551 ^
  --execution-jwt "$JWT_SECRET" ^
  --checkpoint-sync-url "https://mainnet.checkpoint.sigp.io" ^
  --http ^
  --http-address 0.0.0.0 ^
  --metrics ^
  --metrics-address 0.0.0.0 ^
  --port 9000 ^
  --discovery-port 9000 ^
  --target-peers 50

pause
"@
$lighthouseBatPath = "$ETH_DATA\iniciar_lighthouse.bat"
Set-Content -Path $lighthouseBatPath -Value $lighthouseBat -Encoding ASCII
Write-Host "  ✓ $lighthouseBatPath" -ForegroundColor Green

# --- Script: TODO_JUNTO.bat ---
$todoBat = @"
@echo off
echo ============================================================
echo   ARRANCANDO NODO ETHEREUM COMPLETO
echo   Geth + Lighthouse — Mainnet
echo ============================================================
echo.
echo Abriendo Geth en una ventana...
start "Geth-Execution" cmd /c "$ETH_DATA\iniciar_geth.bat"

echo Esperando 30 segundos para que Geth inicialice...
timeout /t 30 /nobreak >nul

echo Abriendo Lighthouse en otra ventana...
start "Lighthouse-Consensus" cmd /c "$ETH_DATA\iniciar_lighthouse.bat"

echo.
echo ============================================================
echo   AMBOS CLIENTES INICIADOS
echo ============================================================
echo.
echo   Geth:        http://127.0.0.1:8545  (RPC)
echo   Lighthouse:  http://127.0.0.1:5052  (API consenso)
echo.
echo   Revisa las ventanas individuales para ver el progreso.
echo   La sincronizacion completa puede tomar 6-12 horas
echo   (con checkpoint sync + snap sync en SSD).
echo.
pause
"@
$todoBatPath = "$ETH_DATA\arrancar_todo.bat"
Set-Content -Path $todoBatPath -Value $todoBat -Encoding ASCII
Write-Host "  ✓ $todoBatPath" -ForegroundColor Green

# ─── 5. Resumen final ─────────────────────────────────────────────────────
Write-Host "`n[5/5] Instalación completada!" -ForegroundColor Yellow

Write-Host @"

╔═══════════════════════════════════════════════════════════════╗
║                 RESUMEN DE LA INSTALACIÓN                     ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Datos:      N:\Ethereum\                                     ║
║  JWT:        $JWT_SECRET
║                                                               ║
║  Scripts creados:                                             ║
║    $(Split-Path $gethBatPath -Leaf)            — Solo Geth          ║
║    $(Split-Path $lighthouseBatPath -Leaf)      — Solo Lighthouse    ║
║    $(Split-Path $todoBatPath -Leaf)          — Los dos juntos     ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║  ORDEN CORRECTO PARA INICIAR:                                 ║
║    1. Ejecuta $(Split-Path $gethBatPath -Leaf)                      ║
║    2. Espera a que Geth diga "HTTP server started"            ║
║    3. Ejecuta $(Split-Path $lighthouseBatPath -Leaf)                ║
║                                                               ║
║    O simplemente ejecuta:                                     ║
║    $(Split-Path $todoBatPath -Leaf)                                 ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║  TIEMPO ESTIMADO DE SINCRONIZACION (en SSD NVMe):             ║
║    Geth (snap sync):        4-8 horas                        ║
║    Lighthouse (checkpoint): 1-3 horas                        ║
║                                                               ║
║  ESPACIO REQUERIDO (aprox):                                   ║
║    Geth:         ~300 GB                                      ║
║    Lighthouse:   ~150 GB                                      ║
║    Total:        ~450 GB  (tienes 745 GB libres en N:)       ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

IMPORTANTE: Ethereum es Proof of Stake desde 2022.
- Para VALIDAR (ganar ETH): necesitas 32 ETH + correr lighthouse validator
- Sin 32 ETH: el nodo solo sirve para consultas, desarrollo y privacidad
- NO se genera ETH por tener el programa abierto.

"@ -ForegroundColor Cyan
