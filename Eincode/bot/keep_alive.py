#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════
CATALYST KEEP-ALIVE WATCHDOG — 24/7 Service Monitor
═══════════════════════════════════════════════════════════════════════════
BELL 13450.50 | Pentetraktys 4D | OSHIRO ERC-26+

Mantiene vivos TODOS los servicios Catalyst:
  ◆ localhost:3000 — Catalyst Chat (Next.js)
  ◆ localhost:8000 — Catalyst Bot API (FastAPI)
  ◆ localhost:9000 — Orchestrator (FastAPI)

Features:
  - Health check cada 30s
  - Auto-restart si se cae (máx 10 reinicios/hora)
  - Log rotativo de eventos
  - Notificación si algo falla
  - Compatible con Tailscale Funnel

Uso:
  python keep_alive.py           # Inicia el watchdog
  python keep_alive.py --daemon  # Modo demonio (background)
  python keep_alive.py --status  # Ver estado de servicios
═══════════════════════════════════════════════════════════════════════════
"""

import asyncio, sys, os, io, json, time, signal, socket, logging
import subprocess
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass, field

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [WATCHDOG] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(
            os.path.join(os.path.dirname(os.path.abspath(__file__)), "keep_alive.log")
        ),
    ],
)
log = logging.getLogger("watchdog")

# ═══════════════════════════════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════════════════════════════

CHECK_INTERVAL = 30  # segundos entre health checks
MAX_RESTARTS_PER_HOUR = 10
STARTUP_TIMEOUT = 15  # segundos para que arranque un servicio

SERVICES = {
    "catalyst-chat": {
        "port": 3000,
        "host": "127.0.0.1",
        "dir": "../../apps/catalyst-chat",
        "cmd": ["npx", "next", "dev", "-p", "3000", "-H", "0.0.0.0"],
        "description": "Catalyst Chat — Next.js PWA",
        "url": "http://localhost:3000",
    },
    "catalyst-bot": {
        "port": 8000,
        "host": "127.0.0.1",
        "dir": ".",
        "cmd": [sys.executable, "api_server.py"],
        "description": "Catalyst Bot API — FastAPI + Threema",
        "url": "http://localhost:8000",
    },
    "catalyst-orchestrator": {
        "port": 9000,
        "host": "127.0.0.1",
        "dir": ".",
        "cmd": [sys.executable, "-c",
                "from orchestrator import create_orchestrator_app; "
                "import uvicorn; "
                "app, _ = create_orchestrator_app(); "
                "uvicorn.run(app, host='0.0.0.0', port=9000)"],
        "description": "Catalyst Orchestrator — Token Manager + Ling Games",
        "url": "http://localhost:9000",
    },
}

# ═══════════════════════════════════════════════════════════════
# WATCHDOG
# ═══════════════════════════════════════════════════════════════

@dataclass
class ServiceStatus:
    name: str
    port: int
    process: Optional[subprocess.Popen] = None
    healthy: bool = False
    last_check: datetime = field(default_factory=datetime.now)
    last_restart: Optional[datetime] = None
    restart_count: int = 0
    restart_window: List[datetime] = field(default_factory=list)
    consecutive_failures: int = 0

    def can_restart(self) -> bool:
        """Verifica si no se ha excedido el límite de reinicios por hora."""
        now = datetime.now()
        self.restart_window = [t for t in self.restart_window if now - t < timedelta(hours=1)]
        return len(self.restart_window) < MAX_RESTARTS_PER_HOUR

    def record_restart(self):
        self.restart_window.append(datetime.now())
        self.restart_count += 1
        self.last_restart = datetime.now()


class KeepAliveWatchdog:
    """Mantiene vivos los servicios Catalyst 24/7."""

    def __init__(self):
        self.services: Dict[str, ServiceStatus] = {}
        for name, cfg in SERVICES.items():
            self.services[name] = ServiceStatus(name=name, port=cfg["port"])
        self.running = False
        self.start_time = datetime.now()
        log.info("◆ Catalyst Keep-Alive Watchdog inicializado")
        log.info(f"  Monitoreando {len(self.services)} servicios")

    async def check_port(self, host: str, port: int) -> bool:
        """Verifica si un puerto TCP está escuchando."""
        try:
            _, writer = await asyncio.wait_for(
                asyncio.open_connection(host, port),
                timeout=5.0
            )
            writer.close()
            await writer.wait_closed()
            return True
        except:
            return False

    def start_service(self, name: str) -> bool:
        """Inicia un servicio."""
        cfg = SERVICES[name]
        svc = self.services[name]

        log.info(f"[{name}] Iniciando: {' '.join(cfg['cmd'][:3])}...")

        try:
            cwd = os.path.join(os.path.dirname(os.path.abspath(__file__)), cfg["dir"])
            cwd = os.path.normpath(cwd)

            proc = subprocess.Popen(
                cfg["cmd"],
                cwd=cwd,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
            )
            svc.process = proc
            svc.record_restart()
            log.info(f"[{name}] PID {proc.pid} iniciado")
            return True
        except Exception as e:
            log.error(f"[{name}] Error al iniciar: {e}")
            return False

    def stop_service(self, name: str):
        """Detiene un servicio."""
        svc = self.services[name]
        if svc.process:
            try:
                svc.process.terminate()
                svc.process.wait(timeout=5)
            except:
                try:
                    svc.process.kill()
                except:
                    pass
            svc.process = None

    async def monitor_loop(self):
        """Loop principal de monitoreo 24/7."""
        self.running = True
        log.info(f"[Watchdog] Monitor iniciado (intervalo: {CHECK_INTERVAL}s)")
        log.info(f"[Watchdog] Máx reinicios/hora: {MAX_RESTARTS_PER_HOUR}")

        # Startup: iniciar todos los servicios
        for name in self.services:
            if not await self.check_port("127.0.0.1", SERVICES[name]["port"]):
                log.info(f"[{name}] No está corriendo — iniciando...")
                self.start_service(name)
                await asyncio.sleep(3)

        while self.running:
            for name, svc in self.services.items():
                cfg = SERVICES[name]
                healthy = await self.check_port(cfg["host"], cfg["port"])
                svc.last_check = datetime.now()

                if healthy and not svc.healthy:
                    log.info(f"[{name}] ✅ Recuperado — {cfg['url']}")
                    svc.consecutive_failures = 0
                elif not healthy and svc.healthy:
                    log.warning(f"[{name}] ❌ CAÍDO — {cfg['url']}")
                    svc.consecutive_failures += 1
                elif not healthy and not svc.healthy:
                    svc.consecutive_failures += 1

                svc.healthy = healthy

                # Auto-restart si lleva 3+ fallos consecutivos
                if not healthy and svc.consecutive_failures >= 3:
                    if svc.can_restart():
                        log.warning(f"[{name}] Reiniciando (fallo {svc.consecutive_failures})...")
                        self.stop_service(name)
                        await asyncio.sleep(2)
                        self.start_service(name)
                        svc.consecutive_failures = 0
                    else:
                        log.error(f"[{name}] 🚨 LÍMITE DE REINICIOS ALCANZADO")

            await asyncio.sleep(CHECK_INTERVAL)

    def status(self) -> Dict:
        """Estado actual de todos los servicios."""
        now = datetime.now()
        uptime = now - self.start_time
        return {
            "watchdog": {
                "running": self.running,
                "uptime": str(uptime).split(".")[0],
                "services_monitored": len(self.services),
            },
            "services": {
                name: {
                    "port": cfg["port"],
                    "url": cfg["url"],
                    "description": cfg["description"],
                    "healthy": svc.healthy,
                    "last_check": svc.last_check.isoformat(),
                    "consecutive_failures": svc.consecutive_failures,
                    "restart_count": svc.restart_count,
                    "restarts_this_hour": len(svc.restart_window),
                }
                for name, svc in self.services.items()
                for cfg in [SERVICES[name]]
            },
        }

    def stop(self):
        """Detiene el watchdog y todos los servicios."""
        self.running = False
        for name in self.services:
            log.info(f"[{name}] Deteniendo...")
            self.stop_service(name)
        log.info("[Watchdog] Detenido")


# ═══════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════

async def main():
    wd = KeepAliveWatchdog()

    if "--status" in sys.argv:
        # Solo verificar estado
        for name, cfg in SERVICES.items():
            healthy = await wd.check_port(cfg["host"], cfg["port"])
            icon = "✅" if healthy else "❌"
            print(f"  {icon} {name} ({cfg['url']}) — {'OK' if healthy else 'CAÍDO'}")
        return

    print(f"""
╔══════════════════════════════════════════════════════════════╗
║  ◆ CATALYST KEEP-ALIVE WATCHDOG                            ║
║  BELL 13450.50 | 24/7 Service Monitor                      ║
╠══════════════════════════════════════════════════════════════╣
║  Monitoreando:                                              ║
║    ◆ Catalyst Chat      — localhost:3000                    ║
║    ◆ Catalyst Bot API   — localhost:8000                    ║
║    ◆ Orchestrator       — localhost:9000                    ║
║  Intervalo: {CHECK_INTERVAL}s | Máx reinicios/h: {MAX_RESTARTS_PER_HOUR}               ║
╚══════════════════════════════════════════════════════════════╝
""")

    try:
        await wd.monitor_loop()
    except KeyboardInterrupt:
        print("\n\nDeteniendo watchdog...")
    finally:
        wd.stop()


if __name__ == "__main__":
    asyncio.run(main())
