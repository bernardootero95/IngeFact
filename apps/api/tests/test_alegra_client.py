import httpx
import pytest
import respx

from src.core.alegra_client import AlegraApiError, AlegraClient, AlegraTransientError


@pytest.fixture
def client():
    return AlegraClient()


@respx.mock
def test_create_company_parses_nested_response(client):
    respx.post(f"{client._base_url}/companies").mock(
        return_value=httpx.Response(201, json={"company": {"id": "abc123", "name": "Test"}})
    )
    company = client.create_company({"name": "Test"})
    assert company["id"] == "abc123"


@respx.mock
def test_create_test_set_parses_singular_testset(client):
    respx.post(f"{client._base_url}/test-sets").mock(
        return_value=httpx.Response(201, json={"testSet": {"id": "ts1", "status": "ACCEPTED"}})
    )
    test_set = client.create_test_set("abc123")
    assert test_set["status"] == "ACCEPTED"


@respx.mock
def test_create_company_4xx_raises_api_error(client):
    respx.post(f"{client._base_url}/companies").mock(
        return_value=httpx.Response(400, json={"errors": [{"message": "instance requires property \"dv\""}]})
    )
    with pytest.raises(AlegraApiError) as exc_info:
        client.create_company({"name": "Test"})
    assert exc_info.value.status_code == 400


@respx.mock
def test_create_company_5xx_raises_transient_error(client):
    respx.post(f"{client._base_url}/companies").mock(return_value=httpx.Response(503))
    with pytest.raises(AlegraTransientError):
        client.create_company({"name": "Test"})


@respx.mock
def test_create_company_timeout_raises_transient_error(client):
    respx.post(f"{client._base_url}/companies").mock(side_effect=httpx.TimeoutException("timed out"))
    with pytest.raises(AlegraTransientError):
        client.create_company({"name": "Test"})


@respx.mock
def test_get_acquirer_info_returns_body(client):
    respx.get(f"{client._base_url}/acquirer-info?identificationType=31&identificationNumber=900123456").mock(
        return_value=httpx.Response(200, json={"name": "Cliente SAS", "email": "cliente@example.com"})
    )
    data = client.get_acquirer_info("31", "900123456")
    assert data == {"name": "Cliente SAS", "email": "cliente@example.com"}


@respx.mock
def test_get_acquirer_info_404_raises_api_error(client):
    respx.get(f"{client._base_url}/acquirer-info?identificationType=31&identificationNumber=900123456").mock(
        return_value=httpx.Response(404, json={"errors": [{"message": "not found"}]})
    )
    with pytest.raises(AlegraApiError) as exc_info:
        client.get_acquirer_info("31", "900123456")
    assert exc_info.value.status_code == 404
