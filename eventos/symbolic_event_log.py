"""Registro de eventos simbólicos para la blockchain.

Esta librería provee utilidades para guardar eventos en formato JSON y
registrar una narrativa asociada. Los eventos se persisten en el
subdirectorio ``events`` y se puede reutilizar este módulo desde otros
componentes del proyecto.
"""

from __future__ import annotations

import json
import hashlib
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import Optional

# Importar la función de hash fractal. Si no existe, se puede implementar
# un hash basado en SHA256.
try:
    from fractal_hash import fractal_hash
except Exception:  # pragma: no cover - fallback simple
    def fractal_hash(data: str) -> str:
        """Hash simplificado usado como respaldo."""
        return hashlib.sha256(data.encode()).hexdigest()


BASE_PATH = Path(__file__).resolve().parent
EVENTS_DIR = BASE_PATH / "events"
LOGS_DIR = BASE_PATH / "logs"

# Asegurar que los directorios existan
EVENTS_DIR.mkdir(parents=True, exist_ok=True)
LOGS_DIR.mkdir(parents=True, exist_ok=True)


@dataclass
class EventoSimbolico:
    """Representa un evento simbólico almacenado en la blockchain."""

    tipo: str
    dao: str
    principio: str
    arquetipo: str
    glifo: str
    timestamp: datetime
    firma_validador: Optional[str] = None
    hash_evento: Optional[str] = None  # Calculado al registrar


def registrar_evento(evento: EventoSimbolico) -> Path:
    """Validar y registrar un ``EventoSimbolico``.

    Se exporta un JSON persistente con el nombre
    ``YYYY-MM-DD_<tipo>_<principio>.json``. Además se agrega una entrada en
    el archivo ``logs/narrativa_eventos.md`` con un pequeño resumen
    narrativo.
    """

    # Validar campos obligatorios
    for field in ["tipo", "dao", "principio", "arquetipo", "glifo", "timestamp"]:
        if not getattr(evento, field):
            raise ValueError(f"Campo obligatorio faltante: {field}")

    # Calcular hash simbólico y almacenarlo en la instancia
    payload = json.dumps(
        {
            "tipo": evento.tipo,
            "dao": evento.dao,
            "principio": evento.principio,
            "arquetipo": evento.arquetipo,
            "glifo": evento.glifo,
            "timestamp": evento.timestamp.isoformat(),
        },
        sort_keys=True,
    )
    evento.hash_evento = fractal_hash(payload)

    # Guardar JSON
    filename = f"{evento.timestamp.date()}_{evento.tipo}_{evento.principio}.json"
    filepath = EVENTS_DIR / filename
    with filepath.open("w", encoding="utf-8") as f:
        json.dump(asdict(evento), f, ensure_ascii=False, indent=2, default=str)

    # Registrar narrativa sencilla en Markdown
    log_path = LOGS_DIR / "narrativa_eventos.md"
    with log_path.open("a", encoding="utf-8") as f:
        f.write(
            f"* {evento.timestamp.isoformat()} - {evento.tipo} en DAO"
            f" {evento.dao} siguiendo el principio '{evento.principio}'.\n"
        )

    return filepath


# Ejemplo de uso
if __name__ == "__main__":
    ejemplo = EventoSimbolico(
        tipo="inicioDAO",
        dao="DAO_Catalyst",
        principio="agua",
        arquetipo="custodio",
        glifo="ipfs://Qm...",
        timestamp=datetime.utcnow(),
    )
    ruta = registrar_evento(ejemplo)
    print(f"Evento registrado en {ruta}")
