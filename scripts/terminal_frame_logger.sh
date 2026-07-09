#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# TERMINAL FRAME LOGGER — Guarda cada letra escrita, incluso frames
# Catalyst Banking System — BELL 13450.50
# ═══════════════════════════════════════════════════════════════════
#
# Uso:
#   source scripts/terminal_frame_logger.sh
#   start_logging
#   ... hacer cosas en terminal ...
#   stop_logging
#
# O usar directamente:
#   bash scripts/terminal_frame_logger.sh
#
# Cada pulsación queda registrada con timestamp de nanosegundos.

LOGDIR="${HOME}/.catalyst/terminal_logs"
mkdir -p "$LOGDIR"

SESSION_ID="catalyst_$(date +%Y%m%d_%H%M%S)_$$"
LOGFILE="${LOGDIR}/${SESSION_ID}.log"
RAWLOG="${LOGDIR}/${SESSION_ID}.raw"
TIMING="${LOGDIR}/${SESSION_ID}.timing"
FRAMES="${LOGDIR}/${SESSION_ID}.frames"

# ═══════════════════════════════════════════════════════════════════
# Método 1: script (Unix) — graba cada byte incluyendo frames ANSI
# ═══════════════════════════════════════════════════════════════════
start_logging_script() {
    echo "[CATALYST LOGGER] Starting frame-level session: $SESSION_ID"
    echo "[CATALYST LOGGER] Log: $LOGFILE"
    # -t: timing file, -q: quiet, -f: flush every write
    script -t "$TIMING" -q -f "$LOGFILE" 2>"$RAWLOG"
}

replay_logging_script() {
    if [ -f "$TIMING" ] && [ -f "$LOGFILE" ]; then
        scriptreplay -t "$TIMING" "$LOGFILE"
    else
        echo "No log files found"
    fi
}

# ═══════════════════════════════════════════════════════════════════
# Método 2: tee + timestamp por linea (captura frames intermedios)
# ═══════════════════════════════════════════════════════════════════
start_logging_tee() {
    echo "[CATALYST LOGGER] Starting tee session: $SESSION_ID"
    # Ejecuta bash con logging de cada caracter
    SHELL=/bin/bash
    exec 1> >(while IFS= read -r -N1 char; do
        printf '%(%Y-%m-%dT%H:%M:%S.%N)T %s\n' -1 "$char" >> "$FRAMES"
        printf '%s' "$char"
    done)
    exec 2> >(while IFS= read -r -N1 char; do
        printf '%(%Y-%m-%dT%H:%M:%S.%N)T [ERR] %s\n' -1 "$char" >> "$FRAMES"
    done)
    echo "Frame-level logging active. Every character is being saved."
}

# ═══════════════════════════════════════════════════════════════════
# Método 3: asciinema (reproducción completa con frames)
# ═══════════════════════════════════════════════════════════════════
start_logging_asciinema() {
    if command -v asciinema &> /dev/null; then
        echo "[CATALYST LOGGER] Starting asciinema: $SESSION_ID"
        asciinema rec "${LOGDIR}/${SESSION_ID}.cast" \
            --title "Catalyst Bank Session ${SESSION_ID}" \
            --idle-time-limit 2
    else
        echo "[CATALYST LOGGER] asciinema not installed. Install:"
        echo "  pip install asciinema"
        echo "  or: brew install asciinema"
        start_logging_script
    fi
}

# ═══════════════════════════════════════════════════════════════════
# Método 4: Keylogger raw (cada tecla con timestamp nanosegundo)
# ═══════════════════════════════════════════════════════════════════
start_logging_rawkeys() {
    echo "[CATALYST LOGGER] Raw keystroke logging: $SESSION_ID"
    echo "[CATALYST LOGGER] Press Ctrl+C 3 times to stop"

    # Guardar cada tecla con timestamp absoluto
    stty -echo raw
    while IFS= read -r -N1 char; do
        ts=$(date +%s.%N)
        hex=$(printf '%02x' "'$char")
        echo "$ts | $hex | $char" >> "$RAWLOG"
        printf '%s' "$char"
    done
    stty echo -raw
}

# ═══════════════════════════════════════════════════════════════════
# Reporte de sesión
# ═══════════════════════════════════════════════════════════════════
session_report() {
    local file="$1"
    if [ ! -f "$file" ]; then
        file="$LOGFILE"
    fi

    echo "=== CATALYST SESSION REPORT ==="
    echo "Session:  $SESSION_ID"
    echo "File:     $file"
    echo "Size:     $(wc -c < "$file" 2>/dev/null || echo 0) bytes"
    echo "Lines:    $(wc -l < "$file" 2>/dev/null || echo 0)"
    echo "Duration: $(tail -1 "$TIMING" 2>/dev/null | awk '{print $1}' || echo 'N/A')"
    echo "SHA-256:  $(sha256sum "$file" 2>/dev/null | cut -d' ' -f1 || echo 'N/A')"
    echo "=============================="
}

# ═══════════════════════════════════════════════════════════════════
# PowerShell (Windows) — ejecutar en PS
# ═══════════════════════════════════════════════════════════════════
powershell_logger() {
    cat << 'PSEOF'
# PowerShell Terminal Logger — Ejecutar en PowerShell:
$sessionId = "catalyst_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
$logDir = "$env:USERPROFILE\.catalyst\terminal_logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

Start-Transcript -Path "$logDir\$sessionId.txt" -Append
Write-Host "[CATALYST LOGGER] Session: $sessionId"
Write-Host "[CATALYST LOGGER] Every keystroke is being saved."
Write-Host "[CATALYST LOGGER] Stop with: Stop-Transcript"

# Para frame-level adicional:
# Register-EngineEvent -SourceIdentifier PowerShell.OnIdle -Action {
#     $frame = [Console]::ReadKey($true)
#     Add-Content "$logDir\$sessionId.frames" "$(Get-Date -Format o) | $($frame.KeyChar)"
# }
PSEOF
}

# ═══════════════════════════════════════════════════════════════════
# Main — selección de método
# ═══════════════════════════════════════════════════════════════════
case "${1:-asciinema}" in
    script)
        start_logging_script
        ;;
    tee)
        start_logging_tee
        ;;
    asciinema)
        start_logging_asciinema
        ;;
    rawkeys)
        start_logging_rawkeys
        ;;
    replay)
        replay_logging_script
        ;;
    report)
        session_report "$2"
        ;;
    ps|powershell|win)
        powershell_logger
        ;;
    *)
        echo "Catalyst Terminal Frame Logger — BELL 13450.50"
        echo ""
        echo "Métodos:"
        echo "  script     — Unix 'script' command (todos los bytes + timing)"
        echo "  asciinema  — Grabación con reproducción visual (requiere pip install asciinema)"
        echo "  tee        — Frame-level con timestamp por caracter"
        echo "  rawkeys    — Cada tecla con timestamp nanosegundo + hex"
        echo "  replay     — Reproducir última sesión grabada"
        echo "  report     — Mostrar estadísticas de la sesión"
        echo "  ps         — Mostrar instrucciones PowerShell (Windows)"
        echo ""
        echo "Uso: source scripts/terminal_frame_logger.sh && start_logging_asciinema"
        ;;
esac
