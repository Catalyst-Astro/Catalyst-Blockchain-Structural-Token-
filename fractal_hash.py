"""Fractal hashing utilities using SHA-3 (Keccak).

This module provides a symbolic-resonant hashing algorithm built on
Python's standard :mod:`hashlib.sha3_512`.  The goal is to combine
semantic fields—``evento``, ``fecha``, ``principio`` and ``origen``—
into a normalized string, hash it and optionally export the result in
JSON format.  The structure is intentionally simple and left open for
future extensions such as elliptic curve markers or graphical glyphs.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from hashlib import sha3_512
from datetime import datetime
import json
from typing import Optional


def _normalize(value: str) -> str:
    """Return a lowercase, trimmed version of ``value``."""
    return value.strip().lower()


def _normalize_fecha(fecha: str) -> str:
    """Normalize ``fecha`` attempting ISO formatting if possible."""
    fecha = fecha.strip()
    try:
        return datetime.fromisoformat(fecha).isoformat()
    except ValueError:
        return fecha.lower()


def _semantic_chain(evento: str, fecha: str, principio: str, origen: str) -> str:
    """Join the fields into a single semantic string."""
    parts = (_normalize(evento), _normalize_fecha(fecha), _normalize(principio), _normalize(origen))
    return "|".join(parts)


@dataclass
class FractalHashResult:
    """Container for the resulting hash and the semantic summary."""

    hash_final: str
    semantica_resumida: str

    def to_json(self) -> str:
        """Return the result as a formatted JSON string."""
        return json.dumps(asdict(self), ensure_ascii=False, indent=2)


def compute_fractal_hash(
    evento: str,
    fecha: str,
    principio: str,
    origen: str,
    export_json_path: Optional[str] = None,
) -> FractalHashResult:
    """Compute the symbolic-resonant hash for the given fields.

    Parameters
    ----------
    evento:
        Tipo de acción o evento (``"consagración"``, ``"iniciación"``, etc.).
    fecha:
        Timestamp ISO o fecha ritual en texto.
    principio:
        Palabra clave representando un principio (``"equilibrio"``, ``"agua"``...).
    origen:
        Dirección de wallet, nombre de DAO o nodo territorial.
    export_json_path:
        Si se proporciona, se exportará un JSON con ``hash_final`` y
        ``semantica_resumida`` al archivo indicado.

    Returns
    -------
    FractalHashResult
        Objeto con el hash hexadecimal de 512 bits y la cadena semántica
        empleada.
    """
    semantica = _semantic_chain(evento, fecha, principio, origen)
    digest = sha3_512(semantica.encode("utf-8")).hexdigest()
    result = FractalHashResult(digest, semantica)

    if export_json_path:
        with open(export_json_path, "w", encoding="utf-8") as fh:
            fh.write(result.to_json())

    return result

