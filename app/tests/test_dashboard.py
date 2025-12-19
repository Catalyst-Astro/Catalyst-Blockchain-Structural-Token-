from fastapi.testclient import TestClient

from app.api.main import app


def test_dashboard_returns_html() -> None:
    client = TestClient(app)
    response = client.get("/dashboard")
    assert response.status_code == 200
    assert "Catalyst Blockchain Core" in response.text
