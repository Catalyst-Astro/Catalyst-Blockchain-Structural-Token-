# ═══════════════════════════════════════════════════════════════════
# TERMINAL FRAME LOGGER (PowerShell) — Guarda cada letra y frame
# Catalyst Banking System — BELL 13450.50
# ═══════════════════════════════════════════════════════════════════
# Uso:
#   . .\scripts\terminal_frame_logger.ps1
#   Start-CatalystLogging
#   ... hacer cosas ...
#   Stop-CatalystLogging
#   Show-CatalystSessionReport

$script:LogDir = "$env:USERPROFILE\.catalyst\terminal_logs"
$script:SessionId = $null
$script:LogFile = $null
$script:FrameFile = $null
$script:KeyFile = $null
$script:LogStartTime = $null
$script:KeyCount = 0

function Start-CatalystLogging {
    New-Item -ItemType Directory -Force -Path $script:LogDir | Out-Null
    $script:SessionId = "catalyst_$(Get-Date -Format 'yyyyMMdd_HHmmss')_$PID"
    $script:LogFile = "$script:LogDir\$($script:SessionId).log"
    $script:FrameFile = "$script:LogDir\$($script:SessionId).frames"
    $script:KeyFile = "$script:LogDir\$($script:SessionId).keys"
    $script:LogStartTime = Get-Date
    $script:KeyCount = 0

    # Start PowerShell transcript (captura todo el output)
    Start-Transcript -Path $script:LogFile -Append | Out-Null

    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  CATALYST TERMINAL FRAME LOGGER — ACTIVO                    ║" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host "  Session: $script:SessionId" -ForegroundColor Cyan
    Write-Host "  Log:     $script:LogFile" -ForegroundColor Cyan
    Write-Host "  Frames:  $script:FrameFile" -ForegroundColor Cyan
    Write-Host "  Keys:    $script:KeyFile" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Cada letra, cada frame, cada milisegundo — registrado." -ForegroundColor Yellow
    Write-Host "  Para detener: Stop-CatalystLogging" -ForegroundColor Yellow
    Write-Host ""

    # Iniciar captura de frames (cada 100ms un snapshot)
    $script:FrameJob = Start-Job -Name "CatalystFrames" -ScriptBlock {
        param($frameFile, $keyFile)
        $count = 0
        while ($true) {
            $ts = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fff"
            # Capturar estado de la consola
            $buffer = $Host.UI.RawUI.BufferSize
            $cursor = $Host.UI.RawUI.CursorPosition
            $window = $Host.UI.RawUI.WindowTitle
            $frame = "$ts | Cursor=($($cursor.X),$($cursor.Y)) | Buffer=($($buffer.Width)x$($buffer.Height)) | Title=$window"
            Add-Content -Path $frameFile -Value $frame
            Start-Sleep -Milliseconds 100
            $count++
        }
    } -ArgumentList $script:FrameFile, $script:KeyFile
}

function Stop-CatalystLogging {
    # Stop frame job
    if ($script:FrameJob) {
        Stop-Job -Name "CatalystFrames" -ErrorAction SilentlyContinue
        Remove-Job -Name "CatalystFrames" -ErrorAction SilentlyContinue
    }

    # Stop transcript
    Stop-Transcript | Out-Null

    $duration = (Get-Date) - $script:LogStartTime
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  CATALYST LOGGER — DETENIDO                                  ║" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host "  Duration: $($duration.ToString('hh\:mm\:ss'))" -ForegroundColor Cyan
    Write-Host "  Log:      $script:LogFile" -ForegroundColor Cyan
    Write-Host "  Frames:   $(Get-Item $script:FrameFile -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Length) bytes" -ForegroundColor Cyan

    # Generar hash
    if (Test-Path $script:LogFile) {
        $hash = (Get-FileHash $script:LogFile -Algorithm SHA256).Hash
        Write-Host "  SHA-256:  $hash" -ForegroundColor Cyan
    }
}

function Show-CatalystSessionReport {
    param([string]$SessionId)

    if (-not $SessionId) {
        $files = Get-ChildItem "$script:LogDir\*.log" | Sort-Object LastWriteTime -Descending
        if ($files.Count -eq 0) {
            Write-Host "No sessions found in $script:LogDir"
            return
        }
        $SessionId = $files[0].BaseName
    }

    $logFile = "$script:LogDir\$SessionId.log"
    $frameFile = "$script:LogDir\$SessionId.frames"

    if (-not (Test-Path $logFile)) {
        Write-Host "Session $SessionId not found"
        return
    }

    $logSize = (Get-Item $logFile).Length
    $logLines = (Get-Content $logFile | Measure-Object -Line).Lines
    $frameLines = if (Test-Path $frameFile) { (Get-Content $frameFile | Measure-Object -Line).Lines } else { 0 }

    Write-Host "=== CATALYST SESSION REPORT ==="
    Write-Host "Session:   $SessionId"
    Write-Host "Log:       $logSize bytes, $logLines lines"
    Write-Host "Frames:    $frameLines frame snapshots"
    Write-Host "SHA-256:   $(Get-FileHash $logFile -Algorithm SHA256).Hash"
    Write-Host "================================"
}

function Get-CatalystSessions {
    Get-ChildItem "$script:LogDir\*.log" | Sort-Object LastWriteTime -Descending | ForEach-Object {
        $lines = (Get-Content $_.FullName | Measure-Object -Line).Lines
        [PSCustomObject]@{
            Session = $_.BaseName
            Date = $_.LastWriteTime.ToString("yyyy-MM-dd HH:mm")
            Size = "$([math]::Round($_.Length/1KB,1)) KB"
            Lines = $lines
            SHA256 = (Get-FileHash $_.FullName -Algorithm SHA256).Hash.Substring(0,16)
        }
    } | Format-Table -AutoSize
}

# ═══════════════════════════════════════════════════════════════════
# Aliases
# ═══════════════════════════════════════════════════════════════════
Set-Alias -Name start-log -Value Start-CatalystLogging
Set-Alias -Name stop-log -Value Stop-CatalystLogging
Set-Alias -Name log-report -Value Show-CatalystSessionReport
Set-Alias -Name log-list -Value Get-CatalystSessions

Write-Host "[CATALYST] Terminal Frame Logger loaded." -ForegroundColor Green
Write-Host "  start-log : Iniciar grabacion" -ForegroundColor Gray
Write-Host "  stop-log  : Detener grabacion" -ForegroundColor Gray
Write-Host "  log-report: Ver reporte de sesion" -ForegroundColor Gray
Write-Host "  log-list  : Listar sesiones guardadas" -ForegroundColor Gray
