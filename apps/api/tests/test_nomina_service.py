from datetime import date

import pytest
from fastapi import HTTPException

from src.application.nomina_service import NominaService
from src.core.alegra_client import AlegraApiError, AlegraTransientError
from src.domain.nomina import GuardarNominaRequest
from src.infrastructure.db.models import ConsecutivoNomina, Empleado, Empresa, Suscripcion


def _crear_empresa(db_session, *, max_documentos=100, **overrides) -> Empresa:
    """Con suscripcion activa por defecto: enviar() exige cupo disponible
    (verificar_cupo_disponible). max_documentos=0 simula el cupo agotado."""
    data = {
        "razon_social": "Empresa Demo SAS",
        "numero_identificacion": "900618467",
        "digito_verificacion": "4",
        "correo_electronico": "demo@example.com",
        "estado": "activo",
        "id_alegra": "alegra-empresa-1",
        "municipio": "11001",
        "direccion": "Calle 1 # 2-3",
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


def _crear_empleado(db_session, empresa_id, **overrides) -> Empleado:
    data = {
        "empresa_id": empresa_id,
        "tipo_documento": "13",
        "numero_documento": "1000000000",
        "primer_apellido": "Perez",
        "primer_nombre": "Juan",
        "tipo_trabajador": "01",
        "subtipo_trabajador": "00",
        "tipo_contrato": "1",
        "sueldo": 2000000,
        "lugar_trabajo_municipio": "11001",
        "lugar_trabajo_direccion": "Calle 1 # 2-3",
        "fecha_ingreso": date(2024, 1, 15),
        "correo_electronico": "empleado@example.com",
    }
    data.update(overrides)
    empleado = Empleado(**data)
    db_session.add(empleado)
    db_session.commit()
    db_session.refresh(empleado)
    return empleado


class _FakeAlegraClient:
    def __init__(self):
        self.payroll_response: dict | None = {
            "payroll": {
                "id": "payroll-1",
                "cune": "cune-1",
                "prefix": "NE",
                "number": 1,
                "fullNumber": "NE1",
                "status": "SENT",
                "qrCodeContent": "QR",
                "signatureValue": "firma-1",
                "governmentResponse": {"code": "00", "message": "Procesado Correctamente.", "errorMessages": []},
                "legalStatus": "ACCEPTED",
            },
            "files": {"xml": "https://s3.example.com/nomina.xml"},
        }
        self.payroll_error: AlegraApiError | AlegraTransientError | None = None
        self.cancel_response: dict | None = None
        self.cancel_error: AlegraApiError | None = None
        self.raw_response: bytes = b""

    def create_payroll(self, payload: dict) -> dict:
        if self.payroll_error:
            raise self.payroll_error
        return self.payroll_response or {}

    def get_payroll(self, payroll_id: str) -> dict:
        if self.payroll_error:
            raise self.payroll_error
        return self.payroll_response or {}

    def cancel_payroll(self, payroll_id: str, prefix: str, number: int) -> dict:
        if self.cancel_error:
            raise self.cancel_error
        return self.cancel_response or {}

    def fetch_raw(self, url: str) -> bytes:
        return self.raw_response


def _payload(empleado_id, **overrides) -> GuardarNominaRequest:
    data = {
        "empleado_id": str(empleado_id),
        "periodo_nomina": "5",
        "fecha_liquidacion_inicio": date(2026, 9, 1),
        "fecha_liquidacion_fin": date(2026, 9, 30),
        "fecha_pago": [date(2026, 9, 30)],
        "forma_pago": "1",
        "metodo_pago": "10",
        "devengados": {"Basico": {"DiasTrabajados": 30, "SueldoTrabajado": 2000000}},
        "deducciones": {
            "Salud": {"Porcentaje": 4, "Deduccion": 80000},
            "FondoPension": {"Porcentaje": 4, "Deduccion": 80000},
        },
        "devengados_total": 2000000,
        "deducciones_total": 160000,
        "comprobante_total": 1840000,
    }
    data.update(overrides)
    return GuardarNominaRequest(**data)


def test_devengados_basico_es_obligatorio():
    with pytest.raises(ValueError, match="Basico"):
        _payload("00000000-0000-0000-0000-000000000000", devengados={})


def test_deducciones_salud_pension_son_obligatorias():
    with pytest.raises(ValueError, match="Salud"):
        _payload("00000000-0000-0000-0000-000000000000", deducciones={})


def test_banco_es_obligatorio_si_metodo_es_consignacion_bancaria():
    with pytest.raises(ValueError, match="Consignaci"):
        _payload("00000000-0000-0000-0000-000000000000", metodo_pago="42")


def test_banco_no_es_obligatorio_si_metodo_no_es_consignacion_bancaria():
    payload = _payload("00000000-0000-0000-0000-000000000000", metodo_pago="10")
    assert payload.banco is None


def test_banco_completo_permite_metodo_consignacion_bancaria():
    payload = _payload(
        "00000000-0000-0000-0000-000000000000",
        metodo_pago="42",
        banco="Bancolombia",
        tipo_cuenta="Ahorros",
        numero_cuenta="123456789",
    )
    assert payload.metodo_pago == "42"


def test_crear_borrador_copia_snapshot_del_empleado(db_session):
    empresa = _crear_empresa(db_session)
    empleado = _crear_empleado(db_session, empresa.id)
    service = NominaService(db_session, alegra_client=_FakeAlegraClient())

    nomina = service.crear_borrador(empresa.id, _payload(empleado.id))

    assert nomina.estado == "borrador"
    assert nomina.consecutivo is None
    assert nomina.empleado_snapshot["PrimerNombre"] == "Juan"
    assert nomina.empleado_snapshot["Sueldo"] == 2000000.0


def test_actualizar_borrador_recalcula_snapshot_si_cambia_empleado(db_session):
    empresa = _crear_empresa(db_session)
    empleado_1 = _crear_empleado(db_session, empresa.id, numero_documento="1000000000")
    empleado_2 = _crear_empleado(
        db_session, empresa.id, numero_documento="2000000000", primer_nombre="Ana", sueldo=3000000
    )
    service = NominaService(db_session, alegra_client=_FakeAlegraClient())
    nomina = service.crear_borrador(empresa.id, _payload(empleado_1.id))

    actualizada = service.actualizar_borrador(empresa.id, nomina.id, _payload(empleado_2.id))

    assert actualizada.empleado_id == empleado_2.id
    assert actualizada.empleado_snapshot["PrimerNombre"] == "Ana"


def test_eliminar_borrador_es_soft_delete(db_session):
    empresa = _crear_empresa(db_session)
    empleado = _crear_empleado(db_session, empresa.id)
    service = NominaService(db_session, alegra_client=_FakeAlegraClient())
    nomina = service.crear_borrador(empresa.id, _payload(empleado.id))

    service.eliminar_borrador(empresa.id, nomina.id)

    assert service.listar(empresa.id) == []
    with pytest.raises(HTTPException):
        service.obtener(empresa.id, nomina.id)


def test_enviar_incrementa_consecutivo_y_marca_aceptada(db_session):
    empresa = _crear_empresa(db_session)
    empleado = _crear_empleado(db_session, empresa.id)
    service = NominaService(db_session, alegra_client=_FakeAlegraClient())
    nomina = service.crear_borrador(empresa.id, _payload(empleado.id))

    enviada = service.enviar(empresa.id, nomina.id)

    assert enviada.estado == "aceptada"
    assert enviada.consecutivo == 1
    assert enviada.numero_completo == "NE1"
    assert enviada.cune == "cune-1"
    assert enviada.firma_digital == "firma-1"


def test_enviar_con_cupo_agotado_falla_409_sin_gastar_numeracion(db_session):
    empresa = _crear_empresa(db_session, max_documentos=0)
    empleado = _crear_empleado(db_session, empresa.id)
    service = NominaService(db_session, alegra_client=_FakeAlegraClient())
    nomina = service.crear_borrador(empresa.id, _payload(empleado.id))

    with pytest.raises(HTTPException) as exc_info:
        service.enviar(empresa.id, nomina.id)

    assert exc_info.value.status_code == 409
    assert "cupo" in exc_info.value.detail
    assert db_session.query(ConsecutivoNomina).count() == 0


def test_enviar_rechazada_por_dian_guarda_razon(db_session):
    empresa = _crear_empresa(db_session)
    empleado = _crear_empleado(db_session, empresa.id)
    fake = _FakeAlegraClient()
    fake.payroll_response["payroll"]["legalStatus"] = "REJECTED"
    fake.payroll_response["payroll"]["governmentResponse"] = {"code": "90", "message": "Rechazo de prueba", "errorMessages": []}
    service = NominaService(db_session, alegra_client=fake)
    nomina = service.crear_borrador(empresa.id, _payload(empleado.id))

    enviada = service.enviar(empresa.id, nomina.id)

    assert enviada.estado == "rechazada"
    assert enviada.razon_rechazo


def test_enviar_error_4xx_revierte_consecutivo_si_no_es_reenvio(db_session):
    empresa = _crear_empresa(db_session)
    empleado = _crear_empleado(db_session, empresa.id)
    fake = _FakeAlegraClient()
    fake.payroll_error = AlegraApiError(400, {"errors": [{"message": "dato invalido"}]})
    service = NominaService(db_session, alegra_client=fake)
    nomina = service.crear_borrador(empresa.id, _payload(empleado.id))

    with pytest.raises(HTTPException) as exc_info:
        service.enviar(empresa.id, nomina.id)
    assert exc_info.value.status_code == 400

    consecutivo = db_session.query(ConsecutivoNomina).filter(
        ConsecutivoNomina.empresa_id == empresa.id, ConsecutivoNomina.tipo == "nomina"
    ).one()
    assert consecutivo.consecutivo_actual == 0


def test_enviar_error_transitorio_no_revierte_el_consecutivo(db_session):
    empresa = _crear_empresa(db_session)
    empleado = _crear_empleado(db_session, empresa.id)
    fake = _FakeAlegraClient()
    fake.payroll_error = AlegraTransientError("timeout simulado")
    service = NominaService(db_session, alegra_client=fake)
    nomina = service.crear_borrador(empresa.id, _payload(empleado.id))

    with pytest.raises(HTTPException) as exc_info:
        service.enviar(empresa.id, nomina.id)
    assert exc_info.value.status_code == 502

    consecutivo = db_session.query(ConsecutivoNomina).filter(
        ConsecutivoNomina.empresa_id == empresa.id, ConsecutivoNomina.tipo == "nomina"
    ).one()
    assert consecutivo.consecutivo_actual == 1  # se quedo "quemado", ambiguo si Alegra la creo


def test_reenvio_tras_rechazo_reutiliza_el_mismo_numero(db_session):
    empresa = _crear_empresa(db_session)
    empleado = _crear_empleado(db_session, empresa.id)
    fake = _FakeAlegraClient()
    fake.payroll_response["payroll"]["legalStatus"] = "REJECTED"
    fake.payroll_response["payroll"]["governmentResponse"] = {"code": "90", "message": "Rechazo", "errorMessages": []}
    service = NominaService(db_session, alegra_client=fake)
    nomina = service.crear_borrador(empresa.id, _payload(empleado.id))
    rechazada = service.enviar(empresa.id, nomina.id)
    assert rechazada.estado == "rechazada"
    numero_original = rechazada.consecutivo

    # Corregir (vuelve a borrador conservando el numero) y reenviar, ahora aceptada.
    corregida = service.actualizar_borrador(empresa.id, nomina.id, _payload(empleado.id))
    assert corregida.estado == "borrador"
    assert corregida.consecutivo == numero_original

    fake.payroll_response["payroll"]["legalStatus"] = "ACCEPTED"
    aceptada = service.enviar(empresa.id, nomina.id)
    assert aceptada.estado == "aceptada"
    assert aceptada.consecutivo == numero_original


def test_anular_nomina_aceptada(db_session):
    empresa = _crear_empresa(db_session)
    empleado = _crear_empleado(db_session, empresa.id)
    fake = _FakeAlegraClient()
    fake.cancel_response = {
        "payroll": {**fake.payroll_response["payroll"], "status": "CANCELED"},
        "cancellation": {"id": "cancel-1", "cune": "cune-anulacion-1", "prefix": "NEA", "number": 1, "fullNumber": "NEA1", "legalStatus": "ACCEPTED"},
    }
    service = NominaService(db_session, alegra_client=fake)
    nomina = service.crear_borrador(empresa.id, _payload(empleado.id))
    service.enviar(empresa.id, nomina.id)

    anulada = service.anular(empresa.id, nomina.id)

    assert anulada.estado == "anulada"
    assert anulada.consecutivo_anulacion == 1
    assert anulada.numero_completo_anulacion == "NEA1"
    assert anulada.cune_anulacion == "cune-anulacion-1"


def test_anular_nomina_no_aceptada_falla_409(db_session):
    empresa = _crear_empresa(db_session)
    empleado = _crear_empleado(db_session, empresa.id)
    service = NominaService(db_session, alegra_client=_FakeAlegraClient())
    nomina = service.crear_borrador(empresa.id, _payload(empleado.id))

    with pytest.raises(HTTPException) as exc_info:
        service.anular(empresa.id, nomina.id)
    assert exc_info.value.status_code == 409


def test_obtener_url_xml_nomina_sin_enviar_falla_409(db_session):
    empresa = _crear_empresa(db_session)
    empleado = _crear_empleado(db_session, empresa.id)
    service = NominaService(db_session, alegra_client=_FakeAlegraClient())
    nomina = service.crear_borrador(empresa.id, _payload(empleado.id))

    with pytest.raises(HTTPException) as exc_info:
        service.obtener_url_xml(empresa.id, nomina.id)
    assert exc_info.value.status_code == 409


def test_obtener_url_xml_pide_una_url_fresca_a_alegra(db_session):
    empresa = _crear_empresa(db_session)
    empleado = _crear_empleado(db_session, empresa.id)
    service = NominaService(db_session, alegra_client=_FakeAlegraClient())
    nomina = service.crear_borrador(empresa.id, _payload(empleado.id))
    enviada = service.enviar(empresa.id, nomina.id)

    url = service.obtener_url_xml(empresa.id, enviada.id)

    assert url == "https://s3.example.com/nomina.xml"


def test_generar_pdf_representacion_borrador_falla_409(db_session):
    empresa = _crear_empresa(db_session)
    empleado = _crear_empleado(db_session, empresa.id)
    service = NominaService(db_session, alegra_client=_FakeAlegraClient())
    nomina = service.crear_borrador(empresa.id, _payload(empleado.id))

    with pytest.raises(HTTPException) as exc_info:
        service.generar_pdf_representacion(empresa.id, nomina.id)
    assert exc_info.value.status_code == 409


def test_generar_pdf_representacion_nomina_aceptada_devuelve_bytes(db_session):
    empresa = _crear_empresa(db_session)
    empleado = _crear_empleado(db_session, empresa.id)
    service = NominaService(db_session, alegra_client=_FakeAlegraClient())
    nomina = service.crear_borrador(empresa.id, _payload(empleado.id))
    enviada = service.enviar(empresa.id, nomina.id)

    pdf_bytes = service.generar_pdf_representacion(empresa.id, enviada.id)

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 0


def test_listar_no_mezcla_nominas_de_otro_tenant(db_session):
    empresa_a = _crear_empresa(db_session, numero_identificacion="900618467")
    empresa_b = _crear_empresa(db_session, numero_identificacion="900618468")
    empleado_a = _crear_empleado(db_session, empresa_a.id)
    service = NominaService(db_session, alegra_client=_FakeAlegraClient())
    service.crear_borrador(empresa_a.id, _payload(empleado_a.id))

    assert len(service.listar(empresa_a.id)) == 1
    assert len(service.listar(empresa_b.id)) == 0
