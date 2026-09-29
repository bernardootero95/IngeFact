import base64
from datetime import date

import pytest
from fastapi import HTTPException

from src.application.factura_recibida_service import FacturaRecibidaService
from src.application.suscripcion_service import contar_documentos_usados
from src.core.alegra_client import AlegraApiError
from src.domain.factura_recibida import (
    CrearEventoReceptorRequest,
    CrearFacturaRecibidaRequest,
    FacturaRecibidaListItemResponse,
    GeneradorEventoRequest,
)
from src.infrastructure.db.models import Empresa, Proveedor, Suscripcion

NIT_EMPRESA = "900618467"
NIT_PROVEEDOR = "800123456"
CUFE = "cufe-de-prueba-1234567890"


def _crear_empresa(db_session, *, max_documentos=100, **overrides) -> Empresa:
    """Con suscripcion activa por defecto: registrar un evento exige cupo
    disponible (verificar_cupo_disponible). max_documentos=0 = cupo agotado."""
    data = {
        "razon_social": "Empresa Demo SAS",
        "numero_identificacion": NIT_EMPRESA,
        "digito_verificacion": "4",
        "correo_electronico": "demo@example.com",
        "estado": "activo",
        "id_alegra": "alegra-empresa-1",
    }
    data.update(overrides)
    empresa = Empresa(**data)
    db_session.add(empresa)
    db_session.commit()
    db_session.refresh(empresa)
    db_session.add(
        Suscripcion(
            empresa_id=empresa.id,
            max_documentos=max_documentos,
            fecha_inicio=date(2000, 1, 1),
            fecha_fin=date(2100, 12, 31),
            estado="activa",
        )
    )
    db_session.commit()
    return empresa


def _crear_proveedor(db_session, empresa_id, **overrides) -> Proveedor:
    data = {
        "empresa_id": empresa_id,
        "tipo_identificacion": "31",
        "numero_identificacion": NIT_PROVEEDOR,
        "nombre": "Proveedor del directorio",
        "correo_electronico": "proveedor@example.com",
    }
    data.update(overrides)
    proveedor = Proveedor(**data)
    db_session.add(proveedor)
    db_session.commit()
    db_session.refresh(proveedor)
    return proveedor


def _xml_factura(*, forma_pago="2", adquiriente=NIT_EMPRESA) -> str:
    """Factura UBL minima con la misma estructura que devuelve la DIAN."""
    return f"""<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
  xmlns:sts="dian:gov:co:facturaelectronica:Structures-2-1">
  <ext:UBLExtensions><ext:UBLExtension><ext:ExtensionContent><sts:DianExtensions>
    <sts:InvoiceControl><sts:AuthorizedInvoices><sts:Prefix>FEV</sts:Prefix></sts:AuthorizedInvoices></sts:InvoiceControl>
  </sts:DianExtensions></ext:ExtensionContent></ext:UBLExtension></ext:UBLExtensions>
  <cbc:ID>FEV123</cbc:ID>
  <cbc:IssueDate>2026-09-01</cbc:IssueDate>
  <cac:AccountingSupplierParty><cac:Party>
    <cac:PartyTaxScheme><cbc:RegistrationName>Distribuidora Andina SAS</cbc:RegistrationName>
      <cbc:CompanyID schemeName="31">{NIT_PROVEEDOR}</cbc:CompanyID></cac:PartyTaxScheme>
  </cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party>
    <cac:PartyTaxScheme><cbc:RegistrationName>Empresa Demo SAS</cbc:RegistrationName>
      <cbc:CompanyID schemeName="31">{adquiriente}</cbc:CompanyID></cac:PartyTaxScheme>
  </cac:Party></cac:AccountingCustomerParty>
  <cac:PaymentMeans><cbc:ID>{forma_pago}</cbc:ID><cbc:PaymentMeansCode>1</cbc:PaymentMeansCode>
    <cbc:PaymentDueDate>2026-10-01</cbc:PaymentDueDate></cac:PaymentMeans>
  <cac:LegalMonetaryTotal><cbc:PayableAmount currencyID="COP">119000.00</cbc:PayableAmount></cac:LegalMonetaryTotal>
</Invoice>"""


def _respuesta_dian(xml: str | None = None, dian_status="AUTHORIZED") -> dict:
    return {
        "trackId": CUFE,
        "dianStatus": dian_status,
        "xmlDocument": {"format": "base64", "content": base64.b64encode((xml or _xml_factura()).encode()).decode()},
    }


def _generador(**overrides) -> GeneradorEventoRequest:
    data = {
        "tipo_identificacion": "13",
        "numero_identificacion": "1000000000",
        "nombres": "Tester",
        "apellidos": "Receptor",
    }
    data.update(overrides)
    return GeneradorEventoRequest(**data)


def _respuesta_evento(legal_status="ACCEPTED") -> dict:
    event = {"id": "evt-1", "cude": "cude-1", "legalStatus": legal_status, "status": "SENT"}
    if legal_status == "REJECTED":
        event["governmentResponse"] = {"code": "89", "message": "NIT no autorizado."}
    return {"event": event}


class _FakeAlegraClient:
    def __init__(
        self,
        *,
        documento: dict | None = None,
        documento_error: AlegraApiError | None = None,
        evento: dict | None = None,
        evento_error: AlegraApiError | None = None,
    ):
        self._documento = documento or _respuesta_dian()
        self._documento_error = documento_error
        self._evento = evento or _respuesta_evento()
        self._evento_error = evento_error
        self.last_payload = None

    def get_document_by_track_id(self, track_id: str) -> dict:
        if self._documento_error:
            raise self._documento_error
        return self._documento

    def register_receiver_event(self, payload: dict) -> dict:
        self.last_payload = payload
        if self._evento_error:
            raise self._evento_error
        return self._evento


def _servicio(db_session, **fake_kwargs) -> tuple[FacturaRecibidaService, _FakeAlegraClient]:
    fake = _FakeAlegraClient(**fake_kwargs)
    return FacturaRecibidaService(db_session, alegra_client=fake), fake


def _crear(service, empresa) -> object:
    return service.crear(empresa.id, CrearFacturaRecibidaRequest(cufe=CUFE))


def _evento(tipo: str) -> CrearEventoReceptorRequest:
    if tipo in ("030", "032"):
        return CrearEventoReceptorRequest(tipo=tipo, generador=_generador())
    if tipo == "031":
        return CrearEventoReceptorRequest(tipo=tipo, claim_code="01", notas="Factura con inconsistencias")
    return CrearEventoReceptorRequest(tipo=tipo)


# --- Consulta y registro por CUFE -------------------------------------------


def test_consultar_devuelve_resumen_leido_del_xml(db_session):
    empresa = _crear_empresa(db_session)
    service, _ = _servicio(db_session)

    consulta = service.consultar(empresa.id, f"  {CUFE}  ")

    assert consulta.cufe == CUFE
    assert consulta.numero == "FEV123"
    assert consulta.proveedor_nombre == "Distribuidora Andina SAS"
    assert consulta.fecha == date(2026, 9, 1)
    assert consulta.fecha_vencimiento == date(2026, 10, 1)
    assert consulta.forma_pago_label == "Crédito"
    assert consulta.total == 119000.0
    assert consulta.puede_registrar is True


def test_consultar_factura_de_contado_queda_bloqueada(db_session):
    empresa = _crear_empresa(db_session)
    service, _ = _servicio(db_session, documento=_respuesta_dian(_xml_factura(forma_pago="1")))

    consulta = service.consultar(empresa.id, CUFE)

    assert consulta.forma_pago_label == "Contado"
    assert consulta.puede_registrar is False
    assert "contado" in consulta.motivo_bloqueo


def test_consultar_factura_de_otro_comprador_queda_bloqueada(db_session):
    empresa = _crear_empresa(db_session)
    service, _ = _servicio(db_session, documento=_respuesta_dian(_xml_factura(adquiriente="111111111")))

    consulta = service.consultar(empresa.id, CUFE)

    assert consulta.puede_registrar is False
    assert "no fue emitida a tu empresa" in consulta.motivo_bloqueo


def test_consultar_cufe_inexistente_da_404(db_session):
    empresa = _crear_empresa(db_session)
    service, _ = _servicio(db_session, documento_error=AlegraApiError(404, {"dianStatus": "NOT_FOUND"}))

    with pytest.raises(HTTPException) as exc_info:
        service.consultar(empresa.id, CUFE)
    assert exc_info.value.status_code == 404


def test_consultar_factura_no_autorizada_da_422(db_session):
    empresa = _crear_empresa(db_session)
    service, _ = _servicio(db_session, documento=_respuesta_dian(dian_status="VALIDATION_ERROR"))

    with pytest.raises(HTTPException) as exc_info:
        service.consultar(empresa.id, CUFE)
    assert exc_info.value.status_code == 422


def test_crear_guarda_los_datos_de_la_dian(db_session):
    empresa = _crear_empresa(db_session)
    service, _ = _servicio(db_session)

    factura = _crear(service, empresa)

    assert factura.numero_documento_proveedor == "FEV123"
    assert factura.proveedor_nombre == "Distribuidora Andina SAS"
    assert factura.proveedor_nit == NIT_PROVEEDOR
    assert factura.proveedor_id is None
    assert factura.fecha_vencimiento == date(2026, 10, 1)
    assert factura.forma_pago == "2"
    assert float(factura.monto_total) == 119000.0
    assert len(service.listar(empresa.id)) == 1


def test_crear_enlaza_el_proveedor_del_directorio_por_nit(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id)
    service, _ = _servicio(db_session)

    factura = _crear(service, empresa)

    assert factura.proveedor_id == proveedor.id


def test_crear_factura_de_contado_falla_409(db_session):
    empresa = _crear_empresa(db_session)
    service, _ = _servicio(db_session, documento=_respuesta_dian(_xml_factura(forma_pago="1")))

    with pytest.raises(HTTPException) as exc_info:
        _crear(service, empresa)
    assert exc_info.value.status_code == 409
    assert "contado" in exc_info.value.detail


def test_crear_cufe_duplicado_lanza_409(db_session):
    empresa = _crear_empresa(db_session)
    service, _ = _servicio(db_session)
    _crear(service, empresa)

    with pytest.raises(HTTPException) as exc_info:
        _crear(service, empresa)
    assert exc_info.value.status_code == 409


def test_obtener_404_si_es_de_otro_tenant(db_session):
    empresa_a = _crear_empresa(db_session)
    empresa_b = _crear_empresa(db_session, numero_identificacion="900618468")
    service, _ = _servicio(db_session)
    factura = _crear(service, empresa_a)

    with pytest.raises(HTTPException) as exc_info:
        service.obtener(empresa_b.id, factura.id)
    assert exc_info.value.status_code == 404


def test_eliminar_es_soft_delete_y_libera_el_cufe(db_session):
    empresa = _crear_empresa(db_session)
    service, _ = _servicio(db_session)
    factura = _crear(service, empresa)

    service.eliminar(empresa.id, factura.id)

    assert service.listar(empresa.id) == []
    assert _crear(service, empresa).cufe == CUFE


def test_obtener_xml_devuelve_el_contenido_de_la_dian(db_session):
    empresa = _crear_empresa(db_session)
    service, _ = _servicio(db_session)
    factura = _crear(service, empresa)

    xml = service.obtener_xml(empresa.id, factura.id)

    assert xml.nombre_archivo == "FEV123.xml"
    assert base64.b64decode(xml.contenido_base64).decode().startswith("<Invoice")


# --- Orden de eventos y estado ----------------------------------------------


def test_estado_inicial_sin_evento_solo_permite_acuse(db_session):
    empresa = _crear_empresa(db_session)
    service, _ = _servicio(db_session)
    item = FacturaRecibidaListItemResponse.from_model(_crear(service, empresa))

    assert item.estado == "sin_evento"
    assert item.estado_label == "Sin evento"
    assert item.eventos_permitidos == ["030"]


@pytest.mark.parametrize("tipo", ["032", "033", "031"])
def test_no_se_puede_saltar_el_acuse_de_recibo(db_session, tipo):
    empresa = _crear_empresa(db_session)
    service, fake = _servicio(db_session)
    factura = _crear(service, empresa)

    with pytest.raises(HTTPException) as exc_info:
        service.registrar_evento(empresa.id, factura.id, _evento(tipo))
    assert exc_info.value.status_code == 409
    assert fake.last_payload is None


def test_no_se_puede_aceptar_sin_recibo_de_mercancia(db_session):
    empresa = _crear_empresa(db_session)
    service, fake = _servicio(db_session)
    factura = _crear(service, empresa)
    service.registrar_evento(empresa.id, factura.id, _evento("030"))
    fake.last_payload = None

    with pytest.raises(HTTPException) as exc_info:
        service.registrar_evento(empresa.id, factura.id, _evento("033"))
    assert exc_info.value.status_code == 409
    assert "recibo de la mercancía" in exc_info.value.detail
    assert fake.last_payload is None


def test_flujo_completo_hasta_factura_aceptada(db_session):
    empresa = _crear_empresa(db_session)
    service, _ = _servicio(db_session)
    factura = _crear(service, empresa)

    estados = []
    for tipo in ("030", "032", "033"):
        factura = service.registrar_evento(empresa.id, factura.id, _evento(tipo))
        estados.append(FacturaRecibidaListItemResponse.from_model(factura).estado)

    assert estados == ["factura_recibida", "mercancia_recibida", "aceptada"]
    assert FacturaRecibidaListItemResponse.from_model(factura).eventos_permitidos == []


def test_reclamo_tras_recibo_de_mercancia_deja_la_factura_rechazada(db_session):
    empresa = _crear_empresa(db_session)
    service, fake = _servicio(db_session)
    factura = _crear(service, empresa)
    service.registrar_evento(empresa.id, factura.id, _evento("030"))
    service.registrar_evento(empresa.id, factura.id, _evento("032"))

    factura = service.registrar_evento(empresa.id, factura.id, _evento("031"))

    item = FacturaRecibidaListItemResponse.from_model(factura)
    assert item.estado == "rechazada"
    assert item.estado_label == "Factura rechazada"
    assert fake.last_payload["claimCode"] == "01"
    assert fake.last_payload["notes"] == ["Factura con inconsistencias"]


def test_evento_rechazado_por_la_dian_no_avanza_el_estado(db_session):
    empresa = _crear_empresa(db_session)
    service, _ = _servicio(db_session, evento=_respuesta_evento("REJECTED"))
    factura = _crear(service, empresa)

    factura = service.registrar_evento(empresa.id, factura.id, _evento("030"))

    item = FacturaRecibidaListItemResponse.from_model(factura)
    assert item.estado == "sin_evento"
    assert item.eventos_permitidos == ["030"]
    assert item.ultimo_evento_rechazado is True
    assert factura.eventos[0].razon_rechazo is not None


# --- Registro de eventos contra Alegra --------------------------------------


def test_evento_030_requiere_generador():
    with pytest.raises(ValueError, match="requiere los datos"):
        CrearEventoReceptorRequest(tipo="030")


def test_evento_031_requiere_claim_code():
    with pytest.raises(ValueError, match="motivo del reclamo"):
        CrearEventoReceptorRequest(tipo="031")


def test_registrar_evento_aceptado_guarda_legal_status_y_cude(db_session):
    empresa = _crear_empresa(db_session)
    service, fake = _servicio(db_session)
    factura = _crear(service, empresa)

    actualizada = service.registrar_evento(empresa.id, factura.id, _evento("030"))

    evento = actualizada.eventos[0]
    assert evento.legal_status == "ACCEPTED"
    assert evento.cude == "cude-1"
    assert fake.last_payload["uuid"] == CUFE
    assert fake.last_payload["companyId"] == "alegra-empresa-1"
    assert fake.last_payload["issuerParty"]["identificationNumber"] == "1000000000"


def test_registrar_evento_aceptado_descuenta_un_documento_del_paquete(db_session):
    empresa = _crear_empresa(db_session)
    service, _ = _servicio(db_session)
    factura = _crear(service, empresa)
    suscripcion = db_session.query(Suscripcion).filter_by(empresa_id=empresa.id).one()

    service.registrar_evento(empresa.id, factura.id, _evento("030"))

    assert contar_documentos_usados(db_session, suscripcion) == 1


def test_registrar_evento_rechazado_no_descuenta(db_session):
    empresa = _crear_empresa(db_session)
    service, _ = _servicio(db_session, evento=_respuesta_evento("REJECTED"))
    factura = _crear(service, empresa)
    suscripcion = db_session.query(Suscripcion).filter_by(empresa_id=empresa.id).one()

    service.registrar_evento(empresa.id, factura.id, _evento("030"))

    assert contar_documentos_usados(db_session, suscripcion) == 0


def test_registrar_evento_con_cupo_agotado_falla_409_sin_llamar_a_la_dian(db_session):
    empresa = _crear_empresa(db_session, max_documentos=0)
    service, fake = _servicio(db_session)
    factura = _crear(service, empresa)

    with pytest.raises(HTTPException) as exc_info:
        service.registrar_evento(empresa.id, factura.id, _evento("030"))

    assert exc_info.value.status_code == 409
    assert "cupo" in exc_info.value.detail
    assert fake.last_payload is None


def test_registrar_evento_alegra_api_error_da_400(db_session):
    empresa = _crear_empresa(db_session)
    service, _ = _servicio(
        db_session, evento_error=AlegraApiError(400, {"errors": [{"message": "instance requires x"}]})
    )
    factura = _crear(service, empresa)

    with pytest.raises(HTTPException) as exc_info:
        service.registrar_evento(empresa.id, factura.id, _evento("030"))
    assert exc_info.value.status_code == 400


def test_registrar_evento_empresa_sin_id_alegra_da_409(db_session):
    empresa = _crear_empresa(db_session, id_alegra=None)
    service, _ = _servicio(db_session)
    factura = _crear(service, empresa)

    with pytest.raises(HTTPException) as exc_info:
        service.registrar_evento(empresa.id, factura.id, _evento("030"))
    assert exc_info.value.status_code == 409
