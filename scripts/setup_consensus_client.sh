#!/usr/bin/env bash
# =============================================================================
# setup_consensus_client.sh — Instalador Nodo Ethereum (Geth + Lighthouse)
# =============================================================================
# Ejecutar:
#   chmod +x setup_consensus_client.sh
#   ./setup_consensus_client.sh
#
# Requisitos previos:
#   sudo apt update && sudo apt install curl jq unzip -y
# =============================================================================

set -euo pipefail

# ─── Colores ──────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log_ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
log_warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
log_err()  { echo -e "  ${RED}✗${NC} $1"; }
titulo()   { echo -e "\n${BOLD}${CYAN}━━━ $1 ━━━${NC}"; }
banner()   {
    echo -e "${BOLD}${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║   INSTALADOR — NODO ETHEREUM COMPLETO (Geth + Lighthouse)    ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# ─── Detectar SO y arquitectura ──────────────────────────────────────────
detectar_so() {
    if [[ "$(uname -s)" != "Linux" ]]; then
        log_err "Este script es solo para Linux. Para Windows usa setup_consensus_client.ps1"
        exit 1
    fi

    ARCH=$(uname -m)
    case "$ARCH" in
        x86_64)  LIGHTHOUSE_ARCH="x86_64" ;;
        aarch64) LIGHTHOUSE_ARCH="aarch64" ;;
        *)
            log_err "Arquitectura no soportada: $ARCH"
            exit 1
            ;;
    esac
    log_ok "Linux detectado — $ARCH"
}

# ─── Configuración ────────────────────────────────────────────────────────
configurar() {
    # Directorio de datos (primer argumento o valor por defecto)
    if [[ -n "${1:-}" ]]; then
        ETH_DATA="$1"
    else
        ETH_DATA="${HOME}/ethereum"
    fi

    GETH_DATA="${ETH_DATA}/geth"
    LIGHTHOUSE_DATA="${ETH_DATA}/lighthouse"
    JWT_SECRET="${ETH_DATA}/jwtsecret"
    BIN_DIR="${ETH_DATA}/bin"

    # Pedir confirmación del disco
    local disco libre
    disco=$(df -h "$(dirname "$ETH_DATA")" 2>/dev/null | tail -1 | awk '{print $4}')
    libre=$(df "$(dirname "$ETH_DATA")" 2>/dev/null | tail -1 | awk '{print $4}')

    echo ""
    echo -e "Directorio: ${BOLD}${ETH_DATA}${NC}"
    echo -e "Espacio libre: ${BOLD}${disco}${NC}"
    echo ""

    if [[ "$libre" -lt 500000000 ]]; then  # 500 GB en KB
        log_warn "Tienes menos de 500 GB libres. Ethereum mainnet necesita ~450-500 GB."
        log_warn "Considera usar un disco externo o liberar espacio."
        read -rp "        ¿Continuar de todos modos? (s/N): " continuar
        [[ "$continuar" =~ ^[Ss]$ ]] || exit 0
    fi
}

# ─── 1. Crear estructura de directorios ───────────────────────────────────
crear_directorios() {
    titulo "1/5  Creando estructura de directorios"

    for dir in "$ETH_DATA" "$GETH_DATA" "$LIGHTHOUSE_DATA" "$BIN_DIR"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            log_ok "Creado: $dir"
        else
            log_ok "Existe: $dir"
        fi
    done
}

# ─── 2. Generar JWT secret ────────────────────────────────────────────────
generar_jwt() {
    titulo "2/5  Configurando JWT secret"

    if [[ -f "$JWT_SECRET" ]]; then
        log_ok "JWT ya existe: $JWT_SECRET"
        return
    fi

    if command -v openssl &>/dev/null; then
        openssl rand -hex 32 > "$JWT_SECRET"
        log_ok "JWT generado con openssl: $JWT_SECRET"
    else
        # Fallback: /dev/urandom + xxd
        head -c 32 /dev/urandom | xxd -p -c 32 > "$JWT_SECRET"
        log_ok "JWT generado con /dev/urandom: $JWT_SECRET"
    fi

    chmod 600 "$JWT_SECRET"
}

# ─── 3. Descargar Lighthouse ──────────────────────────────────────────────
descargar_lighthouse() {
    titulo "3/5  Descargando Lighthouse (consensus client)"

    if [[ -x "${BIN_DIR}/lighthouse" ]]; then
        local ver
        ver=$("${BIN_DIR}/lighthouse" --version 2>/dev/null | head -1 || echo "desconocida")
        log_ok "Lighthouse ya instalado: $ver"
        return
    fi

    # Obtener última versión
    echo "  Detectando última versión de Lighthouse..."
    local latest_version url
    latest_version=$(curl -s https://api.github.com/repos/sigp/lighthouse/releases/latest \
        | jq -r '.tag_name' 2>/dev/null || echo "")

    if [[ -z "$latest_version" || "$latest_version" == "null" ]]; then
        log_warn "No se pudo detectar la última versión. Usando v7.0.0"
        latest_version="v7.0.0"
    fi
    echo "  Última versión: $latest_version"

    url="https://github.com/sigp/lighthouse/releases/download/${latest_version}/lighthouse-${latest_version}-${LIGHTHOUSE_ARCH}-unknown-linux-gnu-portable.tar.gz"

    echo "  Descargando: $url"
    local tmp_file="${BIN_DIR}/lighthouse.tar.gz"

    if curl -L --progress-bar -o "$tmp_file" "$url"; then
        log_ok "Descarga completada"
    else
        log_err "Error descargando Lighthouse"
        echo ""
        echo "  Descárgalo manualmente de: https://github.com/sigp/lighthouse/releases"
        echo "  Extrae el binario a: ${BIN_DIR}/lighthouse"
        exit 1
    fi

    echo "  Extrayendo..."
    tar -xzf "$tmp_file" -C "$BIN_DIR"
    rm -f "$tmp_file"

    chmod +x "${BIN_DIR}/lighthouse"

    if [[ -x "${BIN_DIR}/lighthouse" ]]; then
        local ver
        ver=$("${BIN_DIR}/lighthouse" --version 2>/dev/null | head -1)
        log_ok "Lighthouse instalado: $ver"
    else
        log_err "No se encontró el binario después de extraer"
        log_warn "Revisa el contenido de: $BIN_DIR"
        ls -la "$BIN_DIR"
        exit 1
    fi
}

# ─── 4. Verificar/Instalar Geth ───────────────────────────────────────────
verificar_geth() {
    titulo "4/5  Verificando Geth"

    if command -v geth &>/dev/null; then
        local ver
        ver=$(geth version 2>/dev/null | head -1)
        log_ok "Geth encontrado: $ver"
        return
    fi

    log_warn "Geth no está instalado. Intentando instalarlo..."

    if command -v apt &>/dev/null; then
        # Ubuntu/Debian
        sudo add-apt-repository -y ppa:ethereum/ethereum 2>/dev/null || true
        sudo apt update
        sudo apt install -y ethereum
    elif command -v dnf &>/dev/null; then
        # Fedora
        sudo dnf install -y geth
    elif command -v pacman &>/dev/null; then
        # Arch
        sudo pacman -S --noconfirm geth
    else
        log_warn "No se pudo instalar Geth automáticamente."
        echo "  Instálalo manualmente: https://geth.ethereum.org/downloads"
    fi

    if command -v geth &>/dev/null; then
        log_ok "Geth instalado correctamente"
    fi
}

# ─── 5. Crear scripts de arranque ─────────────────────────────────────────
crear_scripts() {
    titulo "5/5  Creando scripts de arranque"

    # --- iniciar_geth.sh ---
    cat > "${ETH_DATA}/iniciar_geth.sh" << 'GETHSCRIPT'
#!/usr/bin/env bash
set -euo pipefail

ETH_DATA="ETH_DATA_PLACEHOLDER"
GETH_DATA="${ETH_DATA}/geth"
JWT_SECRET="${ETH_DATA}/jwtsecret"

echo "════════════════════════════════════════════════════════════"
echo "  INICIANDO GETH (Execution Client) — Ethereum Mainnet"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "  Data dir: ${GETH_DATA}"
echo "  JWT:      ${JWT_SECRET}"
echo ""

# Ajusta --cache según tu RAM:
#   --cache 4096  → 4 GB (si tienes 16+ GB RAM)
#   --cache 2048  → 2 GB (si tienes 8 GB RAM)

exec geth \
  --datadir="${GETH_DATA}" \
  --syncmode=snap \
  --cache=4096 \
  --http \
  --http.api=eth,net,web3,admin,personal \
  --http.addr=0.0.0.0 \
  --http.corsdomain="*" \
  --ws \
  --ws.api=eth,net,web3 \
  --ws.addr=0.0.0.0 \
  --authrpc.jwtsecret="${JWT_SECRET}" \
  --authrpc.addr=127.0.0.1 \
  --authrpc.port=8551 \
  --metrics \
  --metrics.addr=0.0.0.0 \
  --metrics.port=6060 \
  --maxpeers=50
GETHSCRIPT

    # Reemplazar placeholder
    sed -i "s|ETH_DATA_PLACEHOLDER|${ETH_DATA}|g" "${ETH_DATA}/iniciar_geth.sh"
    chmod +x "${ETH_DATA}/iniciar_geth.sh"
    log_ok "Creado: ${ETH_DATA}/iniciar_geth.sh"

    # --- iniciar_lighthouse.sh ---
    cat > "${ETH_DATA}/iniciar_lighthouse.sh" << 'LIGHTHOUSESCRIPT'
#!/usr/bin/env bash
set -euo pipefail

ETH_DATA="ETH_DATA_PLACEHOLDER"
LIGHTHOUSE_DATA="${ETH_DATA}/lighthouse"
JWT_SECRET="${ETH_DATA}/jwtsecret"
BIN_DIR="${ETH_DATA}/bin"

echo "════════════════════════════════════════════════════════════"
echo "  INICIANDO LIGHTHOUSE (Consensus Client) — Mainnet"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "  Data dir: ${LIGHTHOUSE_DATA}"
echo "  JWT:      ${JWT_SECRET}"
echo ""

exec "${BIN_DIR}/lighthouse" beacon_node \
  --network mainnet \
  --datadir="${LIGHTHOUSE_DATA}" \
  --execution-endpoint http://127.0.0.1:8551 \
  --execution-jwt "${JWT_SECRET}" \
  --checkpoint-sync-url "https://mainnet.checkpoint.sigp.io" \
  --http \
  --http-address 0.0.0.0 \
  --http-port 5052 \
  --metrics \
  --metrics-address 0.0.0.0 \
  --metrics-port 5054 \
  --port 9000 \
  --discovery-port 9000 \
  --target-peers 50
LIGHTHOUSESCRIPT

    sed -i "s|ETH_DATA_PLACEHOLDER|${ETH_DATA}|g" "${ETH_DATA}/iniciar_lighthouse.sh"
    chmod +x "${ETH_DATA}/iniciar_lighthouse.sh"
    log_ok "Creado: ${ETH_DATA}/iniciar_lighthouse.sh"

    # --- arrancar_todo.sh ---
    cat > "${ETH_DATA}/arrancar_todo.sh" << 'TODOSCRIPT'
#!/usr/bin/env bash
set -euo pipefail

ETH_DATA="ETH_DATA_PLACEHOLDER"

echo "════════════════════════════════════════════════════════════"
echo "  ARRANCANDO NODO ETHEREUM COMPLETO"
echo "  Geth + Lighthouse — Mainnet"
echo "════════════════════════════════════════════════════════════"
echo ""

# Verificar dependencias
if ! command -v geth &>/dev/null; then
    echo "ERROR: Geth no encontrado. Instálalo primero."
    exit 1
fi

if [[ ! -x "${ETH_DATA}/bin/lighthouse" ]]; then
    echo "ERROR: Lighthouse no encontrado en ${ETH_DATA}/bin/lighthouse"
    exit 1
fi

echo "Iniciando Geth en segundo plano..."
"${ETH_DATA}/iniciar_geth.sh" &
GETH_PID=$!

echo "PID Geth: $GETH_PID"
echo "Esperando 30 segundos para que Geth inicialice..."
sleep 30

# Verificar que Geth siga vivo
if ! kill -0 $GETH_PID 2>/dev/null; then
    echo "ERROR: Geth se detuvo inesperadamente. Revisa el log."
    exit 1
fi

echo "Iniciando Lighthouse en segundo plano..."
"${ETH_DATA}/iniciar_lighthouse.sh" &
LIGHTHOUSE_PID=$!

echo "PID Lighthouse: $LIGHTHOUSE_PID"
echo ""
echo "════════════════════════════════════════════════════════════"
echo "  AMBOS CLIENTES INICIADOS"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "  Geth RPC:      http://127.0.0.1:8545"
echo "  Geth WebSocket: ws://127.0.0.1:8546"
echo "  Lighthouse API: http://127.0.0.1:5052"
echo "  Métricas Geth:  http://127.0.0.1:6060"
echo "  Métricas LH:    http://127.0.0.1:5054"
echo ""
echo "  PIDs: Geth=$GETH_PID  Lighthouse=$LIGHTHOUSE_PID"
echo ""
echo "  La sincronización completa puede tomar 6-12 horas."
echo "  Para detener: kill $GETH_PID $LIGHTHOUSE_PID"
echo ""

# Esperar a que cualquiera de los dos termine
wait -n $GETH_PID $LIGHTHOUSE_PID 2>/dev/null || true
echo ""
echo "Uno de los procesos terminó. Deteniendo el otro..."
kill $GETH_PID $LIGHTHOUSE_PID 2>/dev/null || true
wait 2>/dev/null || true
TODOSCRIPT

    sed -i "s|ETH_DATA_PLACEHOLDER|${ETH_DATA}|g" "${ETH_DATA}/arrancar_todo.sh"
    chmod +x "${ETH_DATA}/arrancar_todo.sh"
    log_ok "Creado: ${ETH_DATA}/arrancar_todo.sh"

    # --- systemd service (opcional) ---
    crear_services_systemd
}

# ─── 6. Crear servicios systemd (Linux) ───────────────────────────────────
crear_services_systemd() {
    titulo "BONUS  Creando servicios systemd (arranque automático)"

    if [[ ! -d /etc/systemd/system ]]; then
        log_info "systemd no detectado. Omite los servicios."
        return
    fi

    local SERV_DIR="${ETH_DATA}/systemd"
    mkdir -p "$SERV_DIR"

    # Service: geth
    cat > "${SERV_DIR}/geth.service" << SERVGETH
[Unit]
Description=Geth Execution Client (Ethereum Mainnet)
After=network-online.target
Wants=network-online.target

[Service]
User=${USER}
Type=simple
ExecStart=${ETH_DATA}/iniciar_geth.sh
Restart=on-failure
RestartSec=30
StandardOutput=journal
StandardError=journal
SyslogIdentifier=geth

# Seguridad
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=${GETH_DATA}
ReadOnlyPaths=${JWT_SECRET}

[Install]
WantedBy=multi-user.target
SERVGETH
    log_ok "Creado: ${SERV_DIR}/geth.service"

    # Service: lighthouse
    cat > "${SERV_DIR}/lighthouse.service" << SERVLH
[Unit]
Description=Lighthouse Consensus Client (Ethereum Mainnet)
After=network-online.target geth.service
Wants=network-online.target geth.service

[Service]
User=${USER}
Type=simple
ExecStart=${ETH_DATA}/iniciar_lighthouse.sh
Restart=on-failure
RestartSec=30
StandardOutput=journal
StandardError=journal
SyslogIdentifier=lighthouse

# Seguridad
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=${LIGHTHOUSE_DATA}
ReadOnlyPaths=${JWT_SECRET}

[Install]
WantedBy=multi-user.target
SERVLH
    log_ok "Creado: ${SERV_DIR}/lighthouse.service"

    echo ""
    echo -e "  ${BOLD}Para instalar los servicios systemd:${NC}"
    echo ""
    echo "    sudo cp ${SERV_DIR}/geth.service /etc/systemd/system/"
    echo "    sudo cp ${SERV_DIR}/lighthouse.service /etc/systemd/system/"
    echo "    sudo systemctl daemon-reload"
    echo "    sudo systemctl enable geth lighthouse"
    echo "    sudo systemctl start geth lighthouse"
    echo ""
    echo -e "  ${BOLD}Comandos útiles:${NC}"
    echo "    sudo systemctl status geth        # Estado del execution client"
    echo "    sudo systemctl status lighthouse  # Estado del consensus client"
    echo "    sudo journalctl -u geth -f        # Logs en tiempo real de Geth"
    echo "    sudo journalctl -u lighthouse -f  # Logs en tiempo real de Lighthouse"
    echo ""
}

# ─── Resumen ───────────────────────────────────────────────────────────────
mostrar_resumen() {
    echo ""
    echo -e "${BOLD}${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                 RESUMEN DE LA INSTALACIÓN                     ║"
    echo "╠═══════════════════════════════════════════════════════════════╣"
    echo "║  Datos:      ${ETH_DATA}"
    echo "║  JWT:        ${JWT_SECRET}"
    echo "║"
    echo "║  Scripts creados:"
    echo "║    iniciar_geth.sh        — Solo Geth"
    echo "║    iniciar_lighthouse.sh  — Solo Lighthouse"
    echo "║    arrancar_todo.sh       — Los dos juntos"
    echo "║"
    echo "╠═══════════════════════════════════════════════════════════════╣"
    echo "║  PARA INICIAR (en 3 terminales o con tmux):                  ║"
    echo "║                                                               ║"
    echo "║    # Terminal 1 — Geth primero                                ║"
    echo "║    ${ETH_DATA}/iniciar_geth.sh                                 ║"
    echo "║                                                               ║"
    echo "║    # Espera "HTTP server started"                            ║"
    echo "║                                                               ║"
    echo "║    # Terminal 2 — Lighthouse después                          ║"
    echo "║    ${ETH_DATA}/iniciar_lighthouse.sh                           ║"
    echo "║                                                               ║"
    echo "║    # O todo junto:                                            ║"
    echo "║    ${ETH_DATA}/arrancar_todo.sh                                ║"
    echo "║                                                               ║"
    echo "╠═══════════════════════════════════════════════════════════════╣"
    echo "║  TIEMPO DE SINCRONIZACIÓN (SSD NVMe):                        ║"
    echo "║    Geth (snap sync):        4-8 horas                        ║"
    echo "║    Lighthouse (checkpoint): 1-3 horas                        ║"
    echo "║                                                               ║"
    echo "║  ESPACIO REQUERIDO (aprox):                                  ║"
    echo "║    Geth:         ~300 GB                                      ║"
    echo "║    Lighthouse:   ~150 GB                                      ║"
    echo "║    Total:        ~450 GB                                      ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    echo -e "${YELLOW}${BOLD}IMPORTANTE:${NC}"
    echo "  • Ethereum es Proof of Stake desde septiembre 2022."
    echo "  • Para VALIDAR (ganar ETH): necesitas 32 ETH stakeados."
    echo "  • Sin 32 ETH: el nodo te sirve para transacciones privadas,"
    echo "    desarrollo de dApps, o consultas sin depender de terceros."
    echo "  • NO se genera ETH por tener el programa abierto."
    echo ""
}

# ─── Main ──────────────────────────────────────────────────────────────────

banner

# Verificar dependencias básicas
for cmd in curl jq; do
    if ! command -v $cmd &>/dev/null; then
        echo -e "${RED}Falta dependencia: $cmd${NC}"
        echo "  Instálala con: sudo apt install $cmd -y"
        exit 1
    fi
done

detectar_so
configurar "$@"
crear_directorios
generar_jwt
descargar_lighthouse
verificar_geth
crear_scripts
mostrar_resumen
