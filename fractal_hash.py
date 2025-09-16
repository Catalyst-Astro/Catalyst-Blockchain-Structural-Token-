"""Módulo simple para calcular un hash simbólico."""

from __future__ import annotations

import hashlib


def fractal_hash(data: str) -> str:
    """Devuelve un hash hexadecimal basado en SHA256.

    La función simula un "hash fractal" aplicado sobre la representación de
    cadena recibida.
    """
    return hashlib.sha256(data.encode()).hexdigest()
