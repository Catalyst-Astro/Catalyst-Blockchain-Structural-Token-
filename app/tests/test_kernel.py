from app.core.config import Settings, DEFAULT_MODULES
from app.core.kernel import Kernel
from app.core.storage import InMemoryStorage


def test_kernel_loads_modules() -> None:
    settings = Settings(
        app_env="test",
        log_level="INFO",
        data_backend="memory",
        events_limit=10,
        modules=DEFAULT_MODULES,
    )
    storage = InMemoryStorage(max_events=10)
    kernel = Kernel(settings=settings, storage=storage)
    kernel.load_modules()

    assert len(kernel.modules) == len(DEFAULT_MODULES)
    statuses = kernel.get_statuses()
    policies = kernel.get_policies()

    assert statuses
    assert policies
