from fastapi.testclient import TestClient

from app.models.auth import GitHubTokenSession
from app.services.token_store import token_store
from main import app


client = TestClient(app)


def test_health_check() -> None:
    response = client.get('/')
    assert response.status_code == 200
    assert response.json()['status'] == 'ok'


def test_repos_requires_auth() -> None:
    response = client.get('/github/repos')
    assert response.status_code == 401


def test_scan_result_requires_auth() -> None:
    response = client.get('/scanner/result/unknown')
    assert response.status_code == 401


def test_scan_result_not_found_when_authenticated() -> None:
    session_id = token_store.create_session(
        GitHubTokenSession(access_token='test-token', token_type='bearer')
    )
    response = client.get('/scanner/result/missing-id', cookies={'repox_session': session_id})
    assert response.status_code == 404
