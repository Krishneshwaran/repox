from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def test_health_check() -> None:
    response = client.get('/')
    assert response.status_code == 200
    assert response.json()['status'] == 'ok'


def test_repos_requires_auth() -> None:
    response = client.get('/github/repos')
    assert response.status_code == 401
