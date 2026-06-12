#!/usr/bin/env bash
# =============================================================================
# monitoreo_geth.sh — Script de diagnóstico y monitoreo para nodos Ethereum Geth
# =============================================================================
# Uso:
#   ./monitoreo_geth.sh                  # Revisión rápida (modo local por defecto)
#   ./monitoreo_geth.sh --json           # Salida en formato JSON
#   ./monitoreo_geth.sh --remoto IP:PORT # Conecta a un nodo remoto vía IPC/HTTP
#   ./monitoreo_geth.sh --watch N        # Monitoreo continuo cada N segundos
#   ./monitoreo_geth.sh --alertas        # Solo muestra problemas (modo alerta)
#
# Requisitos:
#   - geth instalado y en el PATH (o configurar GETH_BIN abajo)
#   - jq instalado (apt install jq)
#   - bc instalado (apt install bc)
# =============================================================================

set -euo pipefail

# ─── Configuración ───────────────────────────────────────────────────────────
GETH_BIN="${GETH_BIN:-geth}"
IPC_PATH="${IPC_PATH:-$HOME/.ethereum/geth.ipc}"
HTTP_ENDPOINT="${HTTP_ENDPOINT:-http://127.0.0.1:8545}"
REMOTO=""
MODO_JSON=false
MODO_WATCH=0
SOLO_ALERTAS=false

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ─── Funciones auxiliares ────────────────────────────────────────────────────

log_ok()    { [[ "$SOLO_ALERTAS" == false ]] && echo -e "  ${GREEN}✓${NC} $1"; }
log_warn()  { echo -e "  ${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "  ${RED}✗${NC} $1"; }
log_info()  { [[ "$SOLO_ALERTAS" == false ]] && echo -e "  ${BLUE}ℹ${NC} $1"; }
titulo()    { [[ "$SOLO_ALERTAS" == false ]] && echo -e "\n${BOLD}${CYAN}━━━ $1 ━━━${NC}"; }

ejecutar_rpc() {
    # Ejecuta una llamada JSON-RPC contra el nodo
    local method="$1"
    local params="${2:-[]}"
    local resultado

    if [[ -n "$REMOTO" ]]; then
        resultado=$(curl -s -m 5 -X POST \
            -H "Content-Type: application/json" \
            --data "{\"jsonrpc\":\"2.0\",\"method\":\"$method\",\"params\":$params,\"id\":1}" \
            "$REMOTO" 2>/dev/null)
    elif [[ -S "$IPC_PATH" ]]; then
        resultado=$(echo "{\"jsonrpc\":\"2.0\",\"method\":\"$method\",\"params\":$params,\"id\":1}" \
            | nc -U "$IPC_PATH" -w 5 2>/dev/null)
    else
        resultado=$(curl -s -m 5 -X POST \
            -H "Content-Type: application/json" \
            --data "{\"jsonrpc\":\"2.0\",\"method\":\"$method\",\"params\":$params,\"id\":1}" \
            "$HTTP_ENDPOINT" 2>/dev/null)
    fi

    echo "$resultado"
}

rpc_result() {
    # Extrae el campo "result" de una respuesta JSON-RPC
    local json="$1"
    echo "$json" | jq -r '.result // "N/A"' 2>/dev/null
}

# ─── Funciones de diagnóstico ────────────────────────────────────────────────

diagnostico_conexion() {
    titulo "CONEXIÓN AL NODO"

    # Verificar si geth está instalado
    if command -v "$GETH_BIN" &>/dev/null; then
        local version
        version=$("$GETH_BIN" version 2>/dev/null | head -1)
        log_ok "Geth detectado: $version"
    else
        log_error "Geth no encontrado en el PATH (buscado: $GETH_BIN)"
        return 1
    fi

    # Verificar si el proceso geth está corriendo
    if pgrep -f "geth" >/dev/null 2>&1; then
        local pid
        pid=$(pgrep -f "geth" | head -1)
        log_ok "Proceso geth corriendo (PID: $pid)"
    else
        log_error "No se detecta proceso geth en ejecución"
        return 1
    fi

    # Probar conexión JSON-RPC (net_version)
    local respuesta
    respuesta=$(ejecutar_rpc "net_version")
    if echo "$respuesta" | jq -e '.result' >/dev/null 2>&1; then
        local chain_id
        chain_id=$(rpc_result "$respuesta")
        log_ok "Conexión JSON-RPC activa — Chain ID: $chain_id"
    else
        log_error "No se puede conectar vía JSON-RPC"
        if [[ -S "$IPC_PATH" ]]; then
            log_info "El socket IPC existe: $IPC_PATH"
        else
            log_warn "El socket IPC no existe: $IPC_PATH"
        fi
        log_info "Probado HTTP: $HTTP_ENDPOINT"
    fi
}

diagnostico_sincronizacion() {
    titulo "ESTADO DE SINCRONIZACIÓN"

    local syncing
    syncing=$(ejecutar_rpc "eth_syncing")
    local sync_status
    sync_status=$(rpc_result "$syncing")

    if [[ "$sync_status" == "false" ]]; then
        log_ok "Nodo completamente sincronizado"
    elif echo "$sync_status" | jq -e '.currentBlock' >/dev/null 2>&1; then
        local current
        current=$(echo "$sync_status" | jq -r '.currentBlock' 2>/dev/null)
        local highest
        highest=$(echo "$sync_status" | jq -r '.highestBlock' 2>/dev/null)
        local pulled
        pulled=$(echo "$sync_status" | jq -r '.pulledStates // "N/A"' 2>/dev/null)
        local known
        known=$(echo "$sync_status" | jq -r '.knownStates // "N/A"' 2>/dev/null)

        log_warn "Sincronizando..."
        log_info "Bloque actual:     $(printf "%'d" "$current")"
        log_info "Bloque más alto:   $(printf "%'d" "$highest")"
        log_info "Estados extraídos: $pulled / $known"

        # Calcular progreso
        if [[ "$current" =~ ^[0-9]+$ ]] && [[ "$highest" =~ ^[0-9]+$ ]] && [[ "$highest" -gt 0 ]]; then
            local pct
            pct=$(echo "scale=2; $current * 100 / $highest" | bc)
            log_info "Progreso:          ${pct}%"
        fi
    else
        log_error "No se pudo obtener el estado de sincronización"
    fi
}

diagnostico_bloques() {
    titulo "INFORMACIÓN DE BLOQUES"

    local ultimo_bloque
    ultimo_bloque=$(ejecutar_rpc "eth_blockNumber")
    local bloque_hex
    bloque_hex=$(rpc_result "$ultimo_bloque" | tr -d '"')
    local numero_bloque=0

    if [[ "$bloque_hex" =~ ^0x[0-9a-fA-F]+$ ]]; then
        numero_bloque=$((bloque_hex))
        log_ok "Último bloque local: $(printf "%'d" "$numero_bloque")"
    else
        log_error "No se pudo obtener el número de bloque"
        return
    fi

    # Obtener info del último bloque
    local bloque_info
    bloque_info=$(ejecutar_rpc "eth_getBlockByNumber" "[\"$bloque_hex\", false]")
    if echo "$bloque_info" | jq -e '.result' >/dev/null 2>&1; then
        local timestamp_hex
        timestamp_hex=$(echo "$bloque_info" | jq -r '.result.timestamp' 2>/dev/null)
        local tx_count
        tx_count=$(echo "$bloque_info" | jq -r '.result.transactions | length' 2>/dev/null)
        local gas_used
        gas_used=$(echo "$bloque_info" | jq -r '.result.gasUsed' 2>/dev/null)
        local gas_limit
        gas_limit=$(echo "$bloque_info" | jq -r '.result.gasLimit' 2>/dev/null)

        if [[ "$timestamp_hex" =~ ^0x[0-9a-fA-F]+$ ]]; then
            local ts
            ts=$((timestamp_hex))
            local fecha
            fecha=$(date -d "@$ts" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || date -r "$ts" '+%Y-%m-%d %H:%M:%S' 2>/dev/null)
            log_info "Timestamp:   $fecha"
        fi
        if [[ "$gas_used" =~ ^0x[0-9a-fA-F]+$ ]] && [[ "$gas_limit" =~ ^0x[0-9a-fA-F]+$ ]]; then
            local gas_pct
            gas_pct=$(echo "scale=1; $((gas_used)) * 100 / $((gas_limit))" | bc)
            log_info "Gas usado:   $(printf "%'d" $((gas_used))) / $(printf "%'d" $((gas_limit))) (${gas_pct}%)"
        fi
        log_info "Transacciones en el bloque: $tx_count"
    fi
}

diagnostico_pares() {
    titulo "PEERS (NODOS CONECTADOS)"

    local peer_count_hex
    peer_count_hex=$(rpc_result "$(ejecutar_rpc 'net_peerCount')" | tr -d '"')
    local num_pares=0

    if [[ "$peer_count_hex" =~ ^0x[0-9a-fA-F]+$ ]]; then
        num_pares=$((peer_count_hex))
    fi

    if [[ "$num_pares" -eq 0 ]]; then
        log_error "0 peers conectados — el nodo está aislado"
    elif [[ "$num_pares" -lt 5 ]]; then
        log_warn "Solo $num_pares peers — conectividad baja (mínimo recomendado: 25+)"
    elif [[ "$num_pares" -lt 25 ]]; then
        log_ok "$num_pares peers conectados — aceptable"
    else
        log_ok "$num_pares peers conectados — buena conectividad"
    fi

    # Mostrar algunos peers si hay conectividad
    if [[ "$num_pares" -gt 0 ]]; then
        local peers
        peers=$(ejecutar_rpc "admin_peers" "[]")
        if echo "$peers" | jq -e '.result' >/dev/null 2>&1; then
            local total
            total=$(echo "$peers" | jq '.result | length' 2>/dev/null)
            [[ "$SOLO_ALERTAS" == false ]] && echo ""
            echo "$peers" | jq -r '
                .result[:5][] |
                "  \(.name // "desconocido") | \(.network.remoteAddress // "?") | \(.protocols.eth.version // "?")" ' 2>/dev/null | while read -r linea; do
                [[ "$SOLO_ALERTAS" == false ]] && echo -e "  ${BLUE}▸${NC} $linea"
            done
            if [[ "${total:-0}" -gt 5 ]]; then
                [[ "$SOLO_ALERTAS" == false ]] && log_info "... y $((total - 5)) peers más"
            fi
        fi
    fi
}

diagnostico_disco() {
    titulo "USO DE DISCO"

    local data_dir="${DATA_DIR:-$HOME/.ethereum}"

    if [[ -d "$data_dir" ]]; then
        local uso
        uso=$(du -sh "$data_dir" 2>/dev/null | cut -f1)

        # Tamaño del directorio chaindata (base de datos de estado)
        local chaindata_size="N/A"
        if [[ -d "$data_dir/geth/chaindata" ]]; then
            chaindata_size=$(du -sh "$data_dir/geth/chaindata" 2>/dev/null | cut -f1)
        fi

        # Tamaño de los ancient data (estado antiguo)
        local ancient_size="N/A"
        if [[ -d "$data_dir/geth/chaindata/ancient" ]]; then
            ancient_size=$(du -sh "$data_dir/geth/chaindata/ancient" 2>/dev/null | cut -f1)
        fi

        log_info "Directorio de datos: $data_dir"
        log_info "Tamaño total:       $uso"
        log_info "Chaindata:          $chaindata_size"
        log_info "Ancient data:       $ancient_size"

        # Espacio libre en disco
        local disco
        disco=$(df -h "$data_dir" 2>/dev/null | tail -1 | awk '{print $4, "(" $5 " usado)"}')
        log_info "Espacio libre:      $disco"

        # Alerta si disco > 85%
        local pct_uso
        pct_uso=$(df "$data_dir" 2>/dev/null | tail -1 | awk '{print $5}' | tr -d '%')
        if [[ "$pct_uso" =~ ^[0-9]+$ ]] && [[ "$pct_uso" -gt 85 ]]; then
            log_error "¡DISCO CASI LLENO! ($pct_uso% usado) — El nodo puede detenerse"
        fi
    else
        log_error "Directorio de datos no encontrado: $data_dir"
    fi
}

diagnostico_memoria() {
    titulo "USO DE RECURSOS DEL SISTEMA"

    # Uso de RAM por el proceso geth
    local pid
    pid=$(pgrep -f "geth" | head -1)
    if [[ -n "$pid" ]]; then
        if [[ -f "/proc/$pid/status" ]]; then
            local vm_size
            vm_size=$(awk '/VmSize/ {printf "%.1f GB", $2/1048576}' "/proc/$pid/status" 2>/dev/null)
            local vm_rss
            vm_rss=$(awk '/VmRSS/ {printf "%.1f GB", $2/1048576}' "/proc/$pid/status" 2>/dev/null)
            local uptime_seg
            uptime_seg=$(awk '{print int($1)}' "/proc/$pid/stat" 2>/dev/null)
            local uptime_humano
            uptime_humano=$(printf '%dd %dh %dm' $((uptime_seg/86400)) $((uptime_seg%86400/3600)) $((uptime_seg%3600/60)))

            log_ok "RAM virtual (VmSize): $vm_size"
            log_ok "RAM residente (RSS):  $vm_rss"
            log_info "Uptime del proceso:   $uptime_humano"
        fi

        # CPU
        local cpu
        cpu=$(ps -p "$pid" -o %cpu --no-headers 2>/dev/null | tr -d ' ')
        if [[ -n "$cpu" ]]; then
            if (( $(echo "$cpu > 80" | bc -l 2>/dev/null) )); then
                log_warn "CPU: ${cpu}% — uso elevado"
            else
                log_info "CPU: ${cpu}%"
            fi
        fi
    fi

    # RAM total del sistema
    if command -v free &>/dev/null; then
        local ram_total ram_usada ram_pct
        ram_total=$(free -h | awk '/^Mem:/ {print $2}')
        ram_usada=$(free -h | awk '/^Mem:/ {print $3}')
        ram_pct=$(free | awk '/^Mem:/ {printf "%.0f", $3/$2 * 100}')
        log_info "RAM sistema: $ram_usada / $ram_total ($ram_pct%)"
    fi
}

diagnostico_red() {
    titulo "TRÁFICO DE RED"

    local pid
    pid=$(pgrep -f "geth" | head -1)
    if [[ -z "$pid" ]]; then
        log_error "No se puede medir tráfico — proceso geth no encontrado"
        return
    fi

    # Leer tráfico desde /proc/net/dev (menos preciso pero portable)
    local interfaz
    interfaz=$(ip route get 8.8.8.8 2>/dev/null | awk '{print $5; exit}' || echo "eth0")

    if [[ -f "/proc/net/dev" ]]; then
        local rx tx
        rx=$(awk -v iface="$interfaz" '$0 ~ iface {print $2}' /proc/net/dev 2>/dev/null)
        tx=$(awk -v iface="$interfaz" '$0 ~ iface {print $10}' /proc/net/dev 2>/dev/null)
        if [[ -n "$rx" ]]; then
            local rx_mb tx_mb
            rx_mb=$(echo "scale=2; $rx / 1048576" | bc)
            tx_mb=$(echo "scale=2; $tx / 1048576" | bc)
            log_info "Interfaz: $interfaz"
            log_info "Descargado: ${rx_mb} MB | Subido: ${tx_mb} MB"
        fi
    fi

    # Puerto de escucha
    local puerto_p2p
    puerto_p2p=$(ss -tlnp 2>/dev/null | grep "$pid" | awk '{print $4}' | grep -oP ':\K\d+' | head -1 || true)
    if [[ -n "$puerto_p2p" ]]; then
        log_info "Puerto P2P (TCP): $puerto_p2p"
    fi
    local puerto_rpc
    puerto_rpc=$(ss -tlnp 2>/dev/null | grep "$pid" | awk '{print $4}' | grep -oP ':\K\d+' | tail -1 || true)
    if [[ -n "$puerto_rpc" ]] && [[ "$puerto_rpc" != "$puerto_p2p" ]]; then
        log_info "Puerto JSON-RPC:   $puerto_rpc"
    fi
}

diagnostico_cuenta() {
    titulo "CUENTAS Y BALANCE"

    # Listar cuentas
    local cuentas
    cuentas=$(ejecutar_rpc "eth_accounts")
    local lista
    lista=$(echo "$cuentas" | jq -r '.result[]?' 2>/dev/null)

    if [[ -z "$lista" ]]; then
        log_info "No hay cuentas desbloqueadas en el nodo"
    else
        local count=0
        echo "$lista" | while read -r addr; do
            count=$((count + 1))
            local balance
            balance=$(ejecutar_rpc "eth_getBalance" "[\"$addr\", \"latest\"]")
            local balance_wei
            balance_wei=$(rpc_result "$balance" | tr -d '"')
            if [[ "$balance_wei" =~ ^0x[0-9a-fA-F]+$ ]]; then
                local eth
                eth=$(echo "scale=6; $((balance_wei)) / 1000000000000000000" | bc)
                log_ok "Cuenta: ${addr:0:10}...${addr: -6} — Balance: ${eth} ETH"
            else
                log_ok "Cuenta: ${addr:0:10}...${addr: -6}"
            fi
        done
    fi
}

diagnostico_logs() {
    titulo "ÚLTIMOS ERRORES EN LOG (si existen)"

    local log_journal=""
    local log_archivo="${LOG_FILE:-$HOME/.ethereum/geth.log}"

    # Intentar journalctl primero
    if command -v journalctl &>/dev/null; then
        log_journal=$(journalctl -u geth --since "30 min ago" -p err 2>/dev/null | tail -20 || true)
    fi

    if [[ -n "$log_journal" ]]; then
        echo "$log_journal" | while IFS= read -r linea; do
            log_warn "$linea"
        done
    elif [[ -f "$log_archivo" ]]; then
        local errores
        errores=$(grep -iE "error|fatal|panic|critical" "$log_archivo" 2>/dev/null | tail -10 || true)
        if [[ -n "$errores" ]]; then
            echo "$errores" | while IFS= read -r linea; do
                log_warn "$linea"
            done
        else
            log_ok "Sin errores recientes en el archivo de log"
        fi
    else
        log_info "No se encontraron logs (ni journalctl ni $log_archivo)"
    fi
}

diagnostico_red_ethereum() {
    titulo "INFORMACIÓN DE LA RED ETHEREUM"

    local client
    client=$(ejecutar_rpc "web3_clientVersion")
    local version_cliente
    version_cliente=$(rpc_result "$client" | tr -d '"')
    log_info "Cliente: $version_cliente"

    local gas_price
    gas_price=$(ejecutar_rpc "eth_gasPrice")
    local gas_wei
    gas_wei=$(rpc_result "$gas_price" | tr -d '"')
    if [[ "$gas_wei" =~ ^0x[0-9a-fA-F]+$ ]]; then
        local gas_gwei
        gas_gwei=$(echo "scale=2; $((gas_wei)) / 1000000000" | bc)
        log_info "Precio del gas: ${gas_gwei} Gwei"
    fi

    local hash_rate
    hash_rate=$(ejecutar_rpc "eth_hashrate")
    local hr_hex
    hr_hex=$(rpc_result "$hash_rate" | tr -d '"')
    if [[ "$hr_hex" =~ ^0x[0-9a-fA-F]+$ ]] && [[ "$((hr_hex))" -gt 0 ]]; then
        local hr_mh
        hr_mh=$(echo "scale=2; $((hr_hex)) / 1000000" | bc)
        log_info "Hashrate: ${hr_mh} MH/s"
    fi
}

# ─── Salida JSON ─────────────────────────────────────────────────────────────

modo_json() {
    local syncing peer_count block_num
    syncing=$(rpc_result "$(ejecutar_rpc "eth_syncing")")
    peer_count=$(rpc_result "$(ejecutar_rpc "net_peerCount")" | tr -d '"')
    block_num_hex=$(rpc_result "$(ejecutar_rpc "eth_blockNumber")" | tr -d '"')

    local syncing_bool="false"
    local current_block="null" highest_block="null" progress_pct="null"
    if [[ "$syncing" != "false" ]] && echo "$syncing" | jq -e '.currentBlock' >/dev/null 2>&1; then
        syncing_bool="true"
        current_block=$(echo "$syncing" | jq '.currentBlock')
        highest_block=$(echo "$syncing" | jq '.highestBlock')
        if [[ "$current_block" =~ ^[0-9]+$ ]] && [[ "$highest_block" =~ ^[0-9]+$ ]]; then
            progress_pct=$(echo "scale=2; $current_block * 100 / $highest_block" | bc)
        fi
    fi

    local block_num=0
    [[ "$block_num_hex" =~ ^0x[0-9a-fA-F]+$ ]] && block_num=$((block_num_hex))

    local peer_num=0
    [[ "$peer_count" =~ ^0x[0-9a-fA-F]+$ ]] && peer_num=$((peer_count))

    # Espacio en disco
    local data_dir="${DATA_DIR:-$HOME/.ethereum}"
    local disk_used="N/A" disk_free="N/A" disk_pct="N/A"
    if [[ -d "$data_dir" ]]; then
        disk_used=$(du -sh "$data_dir" 2>/dev/null | cut -f1)
        disk_free=$(df -h "$data_dir" 2>/dev/null | tail -1 | awk '{print $4}')
        disk_pct=$(df "$data_dir" 2>/dev/null | tail -1 | awk '{print $5}')
    fi

    # RAM
    local pid=""
    pid=$(pgrep -f "geth" | head -1)
    local ram_rss="N/A" uptime_proc="N/A"
    if [[ -n "$pid" ]] && [[ -f "/proc/$pid/status" ]]; then
        ram_rss=$(awk '/VmRSS/ {printf "%.1f GB", $2/1048576}' "/proc/$pid/status" 2>/dev/null)
        local up_sec
        up_sec=$(awk '{print int($1)}' "/proc/$pid/stat" 2>/dev/null)
        uptime_proc=$(printf '%dd %dh %dm' $((up_sec/86400)) $((up_sec%86400/3600)) $((up_sec%3600/60)))
    fi

    jq -n \
        --argjson syncing "$syncing_bool" \
        --argjson current_block "$current_block" \
        --argjson highest_block "$highest_block" \
        --argjson progress_pct "$progress_pct" \
        --argjson block_number "$block_num" \
        --argjson peers "$peer_num" \
        --arg disk_used "$disk_used" \
        --arg disk_free "$disk_free" \
        --arg disk_pct "$disk_pct" \
        --arg ram_rss "$ram_rss" \
        --arg uptime "$uptime_proc" \
        '{
            timestamp: now | strftime("%Y-%m-%dT%H:%M:%SZ"),
            sync: {
                syncing: $syncing,
                current_block: $current_block,
                highest_block: $highest_block,
                progress_percent: $progress_pct
            },
            block: {
                number: $block_number
            },
            network: {
                peers: $peers
            },
            resources: {
                disk_used: $disk_used,
                disk_free: $disk_free,
                disk_percent: $disk_pct,
                ram_rss: $ram_rss,
                uptime: $uptime
            }
        }'
}

# ─── Parsear argumentos ──────────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
    case "$1" in
        --json)       MODO_JSON=true; shift ;;
        --remoto)     REMOTO="$2"; shift 2 ;;
        --watch)      MODO_WATCH="$2"; shift 2 ;;
        --alertas)    SOLO_ALERTAS=true; shift ;;
        --ipc)        IPC_PATH="$2"; shift 2 ;;
        --http)       HTTP_ENDPOINT="$2"; shift 2 ;;
        --data-dir)   DATA_DIR="$2"; shift 2 ;;
        --log-file)   LOG_FILE="$2"; shift 2 ;;
        -h|--help)
            echo "Uso: $0 [OPCIONES]"
            echo ""
            echo "Opciones:"
            echo "  --json            Salida en formato JSON (para scripts/alertas externas)"
            echo "  --remoto URL      Conectar a nodo remoto vía HTTP (ej: http://192.168.1.100:8545)"
            echo "  --watch N         Monitoreo continuo cada N segundos"
            echo "  --alertas         Solo muestra advertencias y errores"
            echo "  --ipc PATH        Ruta al socket IPC (defecto: ~/.ethereum/geth.ipc)"
            echo "  --http URL        Endpoint HTTP local (defecto: http://127.0.0.1:8545)"
            echo "  --data-dir PATH   Directorio de datos del nodo"
            echo "  --log-file PATH   Archivo de log de Geth"
            echo "  -h, --help        Esta ayuda"
            echo ""
            echo "Ejemplos:"
            echo "  $0                          # Diagnóstico completo local"
            echo "  $0 --json                   # Salida JSON para monitoreo automatizado"
            echo "  $0 --remoto 10.0.1.5:8545   # Revisar nodo remoto"
            echo "  $0 --watch 60 --alertas     # Monitoreo continuo cada minuto (solo alertas)"
            exit 0
            ;;
        *) echo "Opción desconocida: $1"; exit 1 ;;
    esac
done

# ─── Ejecución principal ─────────────────────────────────────────────────────

if [[ "$MODO_JSON" == true ]]; then
    modo_json
    exit 0
fi

if [[ "$MODO_WATCH" -gt 0 ]]; then
    echo -e "${BOLD}${CYAN}Monitoreo continuo cada ${MODO_WATCH}s — Ctrl+C para salir${NC}"
    while true; do
        clear
        echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
        echo -e "${BOLD}${CYAN}║   MONITOREO GETH — $(date '+%Y-%m-%d %H:%M:%S')                          ║${NC}"
        echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
        diagnostico_conexion
        diagnostico_sincronizacion
        diagnostico_bloques
        diagnostico_pares
        diagnostico_disco
        diagnostico_memoria
        sleep "$MODO_WATCH"
    done
else
    echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${CYAN}║   DIAGNÓSTICO DE NODO ETHEREUM (GETH)                   ║${NC}"
    echo -e "${BOLD}${CYAN}║   $(date '+%Y-%m-%d %H:%M:%S')                                  ║${NC}"
    echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"

    diagnostico_conexion
    diagnostico_sincronizacion
    diagnostico_bloques
    diagnostico_red_ethereum
    diagnostico_pares
    diagnostico_disco
    diagnostico_memoria
    diagnostico_red
    diagnostico_cuenta
    diagnostico_logs

    echo ""
    echo -e "${BOLD}${CYAN}Diagnóstico completado.${NC}"
    echo ""
fi
