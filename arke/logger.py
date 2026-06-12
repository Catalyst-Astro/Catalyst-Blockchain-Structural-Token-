from __future__ import annotations

import logging
import sys
from contextvars import ContextVar

try:
    from loguru import logger as _loguru_logger
except ImportError:  # pragma: no cover
    _loguru_logger = None

from .settings import Settings

settings = Settings()

__all__ = ["log", "set_request_id", "get_request_id"]

_request_id_ctx: ContextVar[str | None] = ContextVar("request_id", default=None)


def get_request_id() -> str | None:
    return _request_id_ctx.get()


def set_request_id(request_id: str | None) -> None:
    _request_id_ctx.set(request_id)


def _patch_log(record):
    rid = get_request_id()
    record["extra"].setdefault("request_id", rid)


class _StdLoggerAdapter:
    def __init__(self) -> None:
        self._logger = logging.getLogger("arke")
        if not self._logger.handlers:
            handler = logging.StreamHandler(sys.stdout)
            handler.setFormatter(logging.Formatter("%(asctime)s|%(levelname)s|%(message)s"))
            self._logger.addHandler(handler)
        self._logger.setLevel(logging.DEBUG if settings.DEBUG else logging.INFO)

    def debug(self, message: str, extra: dict | None = None) -> None:
        self._logger.debug(message, extra=extra or {})

    def info(self, message: str, extra: dict | None = None) -> None:
        self._logger.info(message, extra=extra or {})

    def warning(self, message: str, extra: dict | None = None) -> None:
        self._logger.warning(message, extra=extra or {})

    def error(self, message: str, extra: dict | None = None) -> None:
        self._logger.error(message, extra=extra or {})

    def log(self, level: str, message: str) -> None:
        numeric = getattr(logging, level.upper(), logging.INFO)
        self._logger.log(numeric, message)


if _loguru_logger is not None:
    _loguru_logger.configure(
        handlers=[
            {
                "sink": sys.stdout,
                "serialize": True,
                "format": "{time:iso}|{level}|{message}",
                "level": "DEBUG" if settings.DEBUG else "INFO",
                "enqueue": True,
            }
        ]
    )
    log = _loguru_logger.patch(_patch_log)
else:
    log = _StdLoggerAdapter()


class _InterceptWriter:
    def __init__(self, level: str) -> None:
        self.level = level

    def write(self, message: str) -> None:
        message = message.strip()
        if message:
            log.log(self.level, message)

    def flush(self) -> None:  # pragma: no cover
        pass


sys.stdout = _InterceptWriter("INFO")
sys.stderr = _InterceptWriter("ERROR")
