from datetime import date

import pytest
from fastapi import HTTPException

from src.application.factura_recibida_service import FacturaRecibidaService
from src.core.alegra_client import AlegraApiError
from src.domain.factura_recibida import CrearEventoReceptorRequest, CrearFacturaRecibidaRequest, GeneradorEventoRequest
from src.application.suscripcion_service import contar_documentos_usados
from src.infrastructure.db.models import Empresa, Proveedor, Suscripcion


def _crear_empresa(db_session, *, max_documentos=100, **overrides) -> Empresa:
    """Con suscripcion activa por defecto: registrar un evento exige cupo
    disponible (verificar_cupo_disponible). max_documentos=0 = cupo agotado."""
    data = {
        "razon_social": "Empresa Demo SAS",
        "numero_identificacion": "900618467",
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
        "tipo_identificacion": "13",
        "numero_identificacion": "1000000000",
        "nombre": "Proveedor de prueba",
        "correo_electronico": "proveedor@example.com",
    }
    data.update(overrides)
    proveedor = Proveedor(**data)
    db_session.add(proveedor)
    db_session.commit()
    db_session.refresh(proveedor)
    return proveedor


def _payload_factura(proveedor_id, **overrides) -> CrearFacturaRecibidaRequest:
    data = {
        "proveedor_id": proveedor_id,
        "cufe": "cufe-de-prueba-1234567890",
        "fecha": date.today(),
    }
    data.update(overrides)
    return CrearFacturaRecibidaRequest(**data)


def _generador(**overrides) -> GeneradorEventoRequest:
    data = {
        "tipo_identificacion": "13",
        "numero_identificacion": "1000000000",
        "nombres": "Tester",
        "apellidos": "Receptor",
    }
    data.update(overrides)
    return GeneradorEventoRequest(**data)


class _FakeAlegraClient:
    def __init__(self, response: dict | None = None, error: AlegraApiError | None = None):
        self._response = response
        self._error = error
        self.last_payload = None

    def register_receiver_event(self, payload: dict) -> dict:
        self.last_payload = payload
        if self._error:
            raise self._error
        return self._response or {}


def _respuesta_aceptado(**overrides) -> dict:
    event = {
        "id": "evt-1",
        "cude": "cude-1",
        "type": {"code": "030", "value": "Acuse de recibo"},
        "legalStatus": "ACCEPTED",
        "status": "SENT",
    }
    event.update(overrides)
    return {"event": event}


def _respuesta_rechazado() -> dict:
    return {
        "event": {
            "id": "evt-1",
            "legalStatus": "REJECTED",
            "governmentResponse": {"code": "89", "message": "NIT no autorizado."},
        }
    }


def test_crear_y_listar(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id)
    service = FacturaRecibidaService(db_session)

    service.crear(empresa.id, _payload_factura(proveedor.id))

    facturas = service.listar(empresa.id)
    assert len(facturas) == 1
    assert facturas[0].cufe == "cufe-de-prueba-1234567890"


def test_crear_cufe_duplicado_lanza_409(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id)
    service = FacturaRecibidaService(db_session)
    service.crear(empresa.id, _payload_factura(proveedor.id))

    with pytest.raises(HTTPException) as exc_info:
        service.crear(empresa.id, _payload_factura(proveedor.id))
    assert exc_info.value.status_code == 409


def test_crear_proveedor_de_otro_tenant_falla_404(db_session):
    empresa_a = _crear_empresa(db_session)
    empresa_b = _crear_empresa(db_session, numero_identificacion="900618468")
    proveedor_b = _crear_proveedor(db_session, empresa_b.id)
    service = FacturaRecibidaService(db_session)

    with pytest.raises(HTTPException) as exc_info:
        service.crear(empresa_a.id, _payload_factura(proveedor_b.id))
    assert exc_info.value.status_code == 404


def test_obtener_404_si_es_de_otro_tenant(db_session):
    empresa_a = _crear_empresa(db_session)
    empresa_b = _crear_empresa(db_session, numero_identificacion="900618468")
    proveedor_a = _crear_proveedor(db_session, empresa_a.id)
    service = FacturaRecibidaService(db_session)
    factura = service.crear(empresa_a.id, _payload_factura(proveedor_a.id))

    with pytest.raises(HTTPException) as exc_info:
        service.obtener(empresa_b.id, factura.id)
    assert exc_info.value.status_code == 404


def test_eliminar_es_soft_delete_y_libera_el_cufe(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id)
    service = FacturaRecibidaService(db_session)
    factura = service.crear(empresa.id, _payload_factura(proveedor.id))

    service.eliminar(empresa.id, factura.id)

    assert service.listar(empresa.id) == []
    nueva = service.crear(empresa.id, _payload_factura(proveedor.id))
    assert nueva.cufe == "cufe-de-prueba-1234567890"


def test_evento_030_requiere_generador():
    with pytest.raises(ValueError, match="requiere los datos"):
        CrearEventoReceptorRequest(tipo="030")


def test_evento_031_requiere_claim_code():
    with pytest.raises(ValueError, match="motivo del reclamo"):
        CrearEventoReceptorRequest(tipo="031")


def test_evento_034_no_requiere_generador():
    evento = CrearEventoReceptorRequest(tipo="034")
    assert evento.generador is None


def test_registrar_evento_aceptado_guarda_legal_status_y_cude(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id)
    fake = _FakeAlegraClient(response=_respuesta_aceptado())
    service = FacturaRecibidaService(db_session, alegra_client=fake)
    factura = service.crear(empresa.id, _payload_factura(proveedor.id))

    actualizada = service.registrar_evento(
        empresa.id, factura.id, CrearEventoReceptorRequest(tipo="030", generador=_generador())
    )

    assert len(actualizada.eventos) == 1
    evento = actualizada.eventos[0]
    assert evento.legal_status == "ACCEPTED"
    assert evento.cude == "cude-1"
    assert evento.tipo == "030"
    assert fake.last_payload["uuid"] == "cufe-de-prueba-1234567890"
    assert fake.last_payload["companyId"] == "alegra-empresa-1"
    assert fake.last_payload["issuerParty"]["identificationNumber"] == "1000000000"


def test_registrar_evento_aceptado_descuenta_un_documento_del_paquete(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id)
    service = FacturaRecibidaService(db_session, alegra_client=_FakeAlegraClient(response=_respuesta_aceptado()))
    factura = service.crear(empresa.id, _payload_factura(proveedor.id))
    suscripcion = db_session.query(Suscripcion).filter_by(empresa_id=empresa.id).one()

    service.registrar_evento(empresa.id, factura.id, CrearEventoReceptorRequest(tipo="030", generador=_generador()))

    assert contar_documentos_usados(db_session, suscripcion) == 1


def test_registrar_evento_rechazado_no_descuenta(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id)
    service = FacturaRecibidaService(db_session, alegra_client=_FakeAlegraClient(response=_respuesta_rechazado()))
    factura = service.crear(empresa.id, _payload_factura(proveedor.id))
    suscripcion = db_session.query(Suscripcion).filter_by(empresa_id=empresa.id).one()

    service.registrar_evento(empresa.id, factura.id, CrearEventoReceptorRequest(tipo="030", generador=_generador()))

    assert contar_documentos_usados(db_session, suscripcion) == 0


def test_registrar_evento_con_cupo_agotado_falla_409_sin_llamar_a_la_dian(db_session):
    empresa = _crear_empresa(db_session, max_documentos=0)
    proveedor = _crear_proveedor(db_session, empresa.id)
    fake = _FakeAlegraClient(response=_respuesta_aceptado())
    service = FacturaRecibidaService(db_session, alegra_client=fake)
    factura = service.crear(empresa.id, _payload_factura(proveedor.id))

    with pytest.raises(HTTPException) as exc_info:
        service.registrar_evento(empresa.id, factura.id, CrearEventoReceptorRequest(tipo="030", generador=_generador()))

    assert exc_info.value.status_code == 409
    assert "cupo" in exc_info.value.detail
    assert getattr(fake, "last_payload", None) is None


def test_registrar_evento_rechazado_guarda_razon_rechazo(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id)
    fake = _FakeAlegraClient(response=_respuesta_rechazado())
    service = FacturaRecibidaService(db_session, alegra_client=fake)
    factura = service.crear(empresa.id, _payload_factura(proveedor.id))

    actualizada = service.registrar_evento(
        empresa.id, factura.id, CrearEventoReceptorRequest(tipo="034")
    )

    evento = actualizada.eventos[0]
    assert evento.legal_status == "REJECTED"
    assert evento.razon_rechazo is not None


def test_registrar_evento_reclamo_incluye_claim_code_y_notas(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id)
    fake = _FakeAlegraClient(response=_respuesta_aceptado(type={"code": "031", "value": "Reclamo"}))
    service = FacturaRecibidaService(db_session, alegra_client=fake)
    factura = service.crear(empresa.id, _payload_factura(proveedor.id))

    actualizada = service.registrar_evento(
        empresa.id,
        factura.id,
        CrearEventoReceptorRequest(tipo="031", claim_code="01", notas="Factura con inconsistencias"),
    )

    evento = actualizada.eventos[0]
    assert evento.claim_code == "01"
    assert evento.notas == "Factura con inconsistencias"
    assert fake.last_payload["claimCode"] == "01"
    assert fake.last_payload["notes"] == ["Factura con inconsistencias"]


def test_registrar_evento_alegra_api_error_da_400(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id)
    fake = _FakeAlegraClient(error=AlegraApiError(400, {"errors": [{"message": "instance requires x"}]}))
    service = FacturaRecibidaService(db_session, alegra_client=fake)
    factura = service.crear(empresa.id, _payload_factura(proveedor.id))

    with pytest.raises(HTTPException) as exc_info:
        service.registrar_evento(empresa.id, factura.id, CrearEventoReceptorRequest(tipo="034"))
    assert exc_info.value.status_code == 400


def test_registrar_evento_empresa_sin_id_alegra_da_409(db_session):
    empresa = _crear_empresa(db_session, id_alegra=None, numero_identificacion="900618469")
    proveedor = _crear_proveedor(db_session, empresa.id)
    service = FacturaRecibidaService(db_session, alegra_client=_FakeAlegraClient(response=_respuesta_aceptado()))
    factura = service.crear(empresa.id, _payload_factura(proveedor.id))

    with pytest.raises(HTTPException) as exc_info:
        service.registrar_evento(empresa.id, factura.id, CrearEventoReceptorRequest(tipo="034"))
    assert exc_info.value.status_code == 409
