import httpx

from src.core.config import get_settings


class AlegraApiError(Exception):
    """Error definitivo de Alegra (4xx) -- no tiene sentido reintentar."""

    def __init__(self, status_code: int, body: dict):
        self.status_code = status_code
        self.body = body
        super().__init__(f"Alegra respondio {status_code}: {body}")


class AlegraTransientError(Exception):
    """Error transitorio (timeout, 5xx) -- candidato a reintento con backoff."""


class AlegraClient:
    """
    Cliente delgado para la API e-provider de Alegra.

    Hallazgos de Sprint 0 (ver docs/alegra-investigacion.md) ya incorporados aqui:
    - POST /companies responde anidado bajo "company", no plano.
    - POST /test-sets responde anidado bajo "testSet" (singular), no "testSets".
    """

    SANDBOX_GOVERNMENT_ID = "a70562e0-631e-4ceb-aa65-36887b57dc17"

    def __init__(self):
        settings = get_settings()
        self._base_url = settings.alegra_base_url
        self._headers = {
            "Authorization": f"Bearer {settings.alegra_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def _request(self, method: str, path: str, **kwargs) -> dict:
        try:
            resp = httpx.request(method, f"{self._base_url}{path}", headers=self._headers, timeout=30, **kwargs)
        except httpx.TimeoutException as exc:
            raise AlegraTransientError(str(exc)) from exc

        if resp.status_code >= 500:
            raise AlegraTransientError(f"Alegra respondio {resp.status_code}")

        try:
            body = resp.json()
        except ValueError:
            body = {}

        if resp.status_code >= 400:
            raise AlegraApiError(resp.status_code, body)

        return body

    def create_company(self, payload: dict) -> dict:
        body = self._request("POST", "/companies", json=payload)
        return body["company"]

    def get_reference_catalog(self, path: str, key: str) -> list[dict]:
        """GET generico para los catalogos DIAN de Alegra (/dian/*). `key` es
        el nombre de la clave bajo la que responde el arreglo (ej. `{"departments": [...]}`)."""
        body = self._request("GET", path)
        return body.get(key) or []

    def list_companies(self, from_id: int = 0, limit: int = 80) -> dict:
        """Una pagina del listado de empresas en Alegra. El llamador pagina
        avanzando `from_id` mientras la respuesta venga llena (ver sync-companies)."""
        return self._request("GET", f"/companies?limit={limit}&from={from_id}")

    def get_resolution(self, nit: str) -> dict:
        """GET /resolutions/{nit}. Hallazgo de Sprint 0: este endpoint solo
        funciona en produccion, en sandbox siempre responde AEP9006."""
        return self._request("GET", f"/resolutions/{nit}")

    def get_acquirer_info(self, identification_type: str, identification_number: str) -> dict:
        """GET /acquirer-info -- consulta DIAN de nombre/correo de un
        adquiriente por tipo+numero de documento (usado para autocompletar el
        formulario de Clientes)."""
        return self._request(
            "GET",
            f"/acquirer-info?identificationType={identification_type}"
            f"&identificationNumber={identification_number}",
        )

    def create_invoice(self, payload: dict) -> dict:
        """POST /invoices. La respuesta 201 ya trae invoice.legalStatus
        (ACCEPTED|REJECTED) inline (verificado en Sprint 0/8, ver
        docs/alegra-investigacion.md) -- no hace falta esperar al webhook
        para reflejar el resultado."""
        return self._request("POST", "/invoices", json=payload)

    def get_invoice(self, invoice_id: str) -> dict:
        """GET /invoices/{id} -- usado para re-pedir la URL S3 firmada del
        XML (expira en 1h, no se persiste). Sin PDF: confirmado en Sprint 8
        que Alegra no lo expone (ver docs/alegra-investigacion.md)."""
        return self._request("GET", f"/invoices/{invoice_id}")

    def create_test_set(self, company_id: str, document_type: str = "invoices") -> dict:
        body = self._request(
            "POST",
            "/test-sets",
            json={
                "type": document_type,
                "governmentId": self.SANDBOX_GOVERNMENT_ID,
                "company": {"id": company_id},
            },
        )
        return body["testSet"]
