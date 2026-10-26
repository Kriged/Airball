"""
Tests for security hardening: headers, CORS, input validation, rate limiting, and safe error handling.
"""
import pytest
from backend.app import app
from backend.core.security import limiter, sanitize_string, validate_request_inputs
from backend.core.config import get_allowed_cors_origins


@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


def test_security_headers_present(client):
    res = client.get('/api/health')
    assert res.status_code == 200
    headers = res.headers
    assert headers.get('X-Content-Type-Options') == 'nosniff'
    assert headers.get('X-Frame-Options') == 'DENY'
    assert 'max-age=31536000' in headers.get('Strict-Transport-Security', '')
    assert headers.get('Referrer-Policy') == 'strict-origin-when-cross-origin'
    assert 'default-src \'self\'' in headers.get('Content-Security-Policy', '')
    assert 'frame-ancestors \'none\'' in headers.get('Content-Security-Policy', '')


def test_error_responses_safe_and_no_store(client):
    res = client.get('/api/non-existent-endpoint-404')
    assert res.status_code == 404
    data = res.get_json()
    assert data == {"error": "Resource not found", "status": 404}
    assert res.headers.get('Cache-Control') == 'no-store'
    # Ensure no stack trace or python traceback in response
    assert 'traceback' not in str(res.data).lower()
    assert 'exception' not in str(res.data).lower()


def test_input_validation_path_traversal(client):
    res = client.get('/api/nba/games/today?search=../../../etc/passwd')
    assert res.status_code == 400
    data = res.get_json()
    assert data.get('error') == 'Invalid request path or parameters'


def test_input_validation_bad_date(client):
    res = client.get('/api/nba/games?date=invalid-date-format')
    assert res.status_code == 400
    data = res.get_json()
    assert 'Invalid date' in data.get('error', '')


def test_input_validation_bounds(client):
    # Invalid per_page > 100
    res = client.get('/api/nba/balldontlie/players?per_page=9999')
    assert res.status_code == 400
    assert 'Invalid \'per_page\'' in res.get_json().get('error', '')


def test_sanitize_string_helper():
    malicious = "<script>alert('xss')</script>../test\x00"
    cleaned = sanitize_string(malicious)
    assert '<' not in cleaned
    assert '>' not in cleaned
    assert '\x00' not in cleaned
    assert '..' in cleaned or 'test' in cleaned  # slashes stripped


def test_cors_configuration():
    origins = get_allowed_cors_origins()
    assert any('localhost' in o for o in origins)
    assert any('5173' in o for o in origins)
