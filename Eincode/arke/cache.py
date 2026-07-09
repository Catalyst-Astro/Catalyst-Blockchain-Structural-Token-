from aiocache import Cache, caches

from .settings import Settings

settings = Settings()


def _build_cache_config() -> dict:
    # Permite correr en local sin Redis si no esta habilitado.
    use_redis = settings.REDIS_HOST not in {"", "none", "disabled"}
    if use_redis:
        return {
            "default": {
                "cache": "aiocache.RedisCache",
                "endpoint": settings.REDIS_HOST,
                "port": settings.REDIS_PORT,
                "ttl": 300,
            }
        }
    return {"default": {"cache": "aiocache.SimpleMemoryCache", "ttl": 300}}


caches.set_config(_build_cache_config())


def get_cache() -> Cache:
    return caches.get("default")

