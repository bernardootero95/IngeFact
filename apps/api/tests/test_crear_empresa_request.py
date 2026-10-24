import pytest
from pydantic import ValidationError

from src.core.nit import nit_check_digit
from src.domain.empresa import CrearEmpresaRequest


def _request(nit: str) -> CrearEmpresaRequest:
    return CrearEmpresaRequest(
        razon_social="Persona Natural Demo",
        numero_identificacion=nit,
        digito_verificacion=nit_check_digit(nit),
        correo_electronico="demo@example.com",
        nombre_usuario="Persona Demo",
    )


@pytest.mark.parametrize("nit", ["12345", "1234567", "900618467", "123456789012345"])
def test_acepta_nit_de_5_a_15_digitos(nit):
    assert _request(nit).numero_identificacion == nit


@pytest.mark.parametrize("nit", ["1234", "1234567890123456"])
def test_rechaza_nit_fuera_de_rango(nit):
    with pytest.raises(ValidationError, match="entre 5 y 15"):
        _request(nit)
