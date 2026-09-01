def test_login_is_rate_limited_after_repeated_attempts(api_client):
    payload = {"email": "no-existe@example.com", "password": "clave-incorrecta"}

    responses = [api_client.post("/api/v1/auth/login", json=payload) for _ in range(6)]

    assert [r.status_code for r in responses[:5]] == [401] * 5
    assert responses[5].status_code == 429


def test_forgot_password_is_rate_limited_after_repeated_attempts(api_client):
    payload = {"email": "no-existe@example.com"}

    responses = [api_client.post("/api/v1/auth/forgot-password", json=payload) for _ in range(4)]

    assert [r.status_code for r in responses[:3]] == [204] * 3
    assert responses[3].status_code == 429
