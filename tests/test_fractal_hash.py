import json
from fractal_hash import compute_fractal_hash


def test_fractal_hash_basic():
    result = compute_fractal_hash(
        "consagracion",
        "2024-01-01T00:00:00",
        "equilibrio",
        "dao1",
    )
    assert len(result.hash_final) == 128
    assert "consagracion" in result.semantica_resumida


def test_fractal_hash_json_export(tmp_path):
    path = tmp_path / "record.json"
    result = compute_fractal_hash(
        "votoDAO",
        "2024-05-05T12:00:00",
        "energia",
        "wallet123",
        export_json_path=str(path),
    )
    with open(path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    assert data["hash_final"] == result.hash_final
    assert data["semantica_resumida"] == result.semantica_resumida

