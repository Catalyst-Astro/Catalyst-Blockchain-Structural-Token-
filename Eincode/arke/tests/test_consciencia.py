import pytest

from arke.consciencia import percibir, autoconfig, AXIOMAS


@pytest.mark.asyncio
async def test_percibir_tokens() -> None:
    resultado = await percibir("Hola Mundo")
    assert resultado == {"tokens": ["hola", "mundo"], "longitud": 2}


@pytest.mark.asyncio
async def test_autoconfig_loads_laws() -> None:
    config = await autoconfig("universal_laws.json")
    assert "UNIDAD" in config

