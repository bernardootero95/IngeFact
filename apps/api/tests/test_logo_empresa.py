import base64
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from src.application.empresa_admin_service import EmpresaAdminService
from src.core.logo_empresa import MAX_BYTES_LOGO, decodificar_logo, render_logo_html
from src.core.pdf_render import escapado
from src.core.representacion_pdf_common import _render_nombres_emisor
from src.domain.empresa import ActualizarDatosContactoRequest, EmpresaDetailResponse
from src.infrastructure.db.models import Empresa

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32


def _data_url(datos: bytes, mime: str = "image/png") -> str:
    return f"data:{mime};base64,{base64.b64encode(datos).decode()}"


def _crear_empresa(db_session, **overrides) -> Empresa:
    data = {
        "razon_social": "Empresa Demo SAS",
        "numero_identificacion": "900618467",
        "digito_verificacion": "4",
        "correo_electronico": "demo@example.com",
        "estado": "activo",
    }
    data.update(overrides)
    empresa = Empresa(**data)
    db_session.add(empresa)
    db_session.commit()
    db_session.refresh(empresa)
    return empresa


def test_decodificar_logo_png_valido():
    datos, mime = decodificar_logo(_data_url(PNG))
    assert datos == PNG and mime == "image/png"


@pytest.mark.parametrize(
    "data_url",
    [
        _data_url(b"<svg xmlns='http://www.w3.org/2000/svg'/>", "image/svg+xml"),
        _data_url(b"GIF89a" + b"\x00" * 10, "image/png"),  # mime no coincide con la firma
        "data:image/png;base64,@@no-es-base64@@",
        _data_url(PNG + b"\x00" * MAX_BYTES_LOGO),
    ],
    ids=["svg", "firma-no-coincide", "base64-invalido", "muy-pesado"],
)
def test_decodificar_logo_rechaza_invalidos(data_url):
    with pytest.raises(ValueError):
        decodificar_logo(data_url)


def test_guardar_mostrar_y_eliminar_logo(db_session):
    empresa = _crear_empresa(db_session)
    servicio = EmpresaAdminService(db_session)

    with pytest.raises(HTTPException) as exc_info:
        servicio.actualizar_datos_contacto(empresa.id, ActualizarDatosContactoRequest(mostrar_logo=True))
    assert exc_info.value.status_code == 409

    servicio.guardar_logo(empresa.id, _data_url(PNG))
    actualizada = servicio.actualizar_datos_contacto(empresa.id, ActualizarDatosContactoRequest(mostrar_logo=True))
    respuesta = EmpresaDetailResponse.from_empresa(actualizada)
    assert respuesta.tiene_logo and respuesta.mostrar_logo
    assert 'class="logo"' in render_logo_html(actualizada)

    # Un PATCH que no manda mostrar_logo no lo apaga.
    sin_campo = servicio.actualizar_datos_contacto(empresa.id, ActualizarDatosContactoRequest(telefono="123"))
    assert sin_campo.mostrar_logo is True

    eliminada = servicio.eliminar_logo(empresa.id)
    assert eliminada.logo is None and eliminada.mostrar_logo is False
    assert render_logo_html(eliminada) == ""


def test_guardar_logo_invalido_responde_400(db_session):
    empresa = _crear_empresa(db_session)
    with pytest.raises(HTTPException) as exc_info:
        EmpresaAdminService(db_session).guardar_logo(empresa.id, _data_url(b"no es imagen"))
    assert exc_info.value.status_code == 400


def test_logo_no_se_imprime_si_la_opcion_esta_apagada():
    empresa = SimpleNamespace(mostrar_logo=False, logo=PNG, logo_mime="image/png")
    assert render_logo_html(empresa) == ""


def test_nombre_comercial_va_arriba_de_la_razon_social():
    html = _render_nombres_emisor(escapado(SimpleNamespace(nombre_comercial="Tienda <Luz>", razon_social="Luz SAS")))
    assert html.index("Tienda &lt;Luz&gt;") < html.index("Luz SAS")
    assert "<strong>Tienda" in html


def test_sin_nombre_comercial_o_igual_solo_razon_social():
    for comercial in (None, "", "luz sas"):
        html = _render_nombres_emisor(SimpleNamespace(nombre_comercial=comercial, razon_social="Luz SAS"))
        assert html == "<p><strong>Luz SAS</strong></p>"
