from datetime import date

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from src.application.evento_masivo_service import EventoMasivoService
from src.application.suscripcion_service import contar_documentos_usados
from src.core.alegra_client import AlegraTransientError
from src.core.security import hash_password
from src.domain.evento_masivo import (
    MAX_FACTURAS_POR_ENVIO,
    MOTIVO_YA_NO_APLICA,
    CriteriosEventoMasivoRequest,
    EmitirEventoMasivoRequest,
    normalizar_nit,
)
from src.infrastructure.db.models import EventoReceptor, FacturaRecibida, Suscripcion, UsuarioEmpresa
from tests.test_factura_recibida_service import (
    NIT_PROVEEDOR,
    _crear_empresa,
    _generador,
    _respuesta_evento,
)

OTRO_NIT = "811222333"


class _FakeAlegra:
    """Responde cada evento con la siguiente respuesta (o excepcion) de la
    lista; la ultima se repite."""

    def __init__(self, *respuestas):
        self._respuestas = list(respuestas) or [_respuesta_evento()]
        self.payloads = []

    def register_receiver_event(self, payload: dict) -> dict:
        self.payloads.append(payload)
        respuesta = self._respuestas.pop(0) if len(self._respuestas) > 1 else self._respuestas[0]
        if isinstance(respuesta, Exception):
            raise respuesta
        return respuesta


def _factura(db_session, empresa, numero, *, fecha=date(2026, 9, 10), nit=NIT_PROVEEDOR, eventos=(), **overrides):
    factura = FacturaRecibida(
        empresa_id=empresa.id,
        proveedor_nombre=f"Proveedor {nit}",
        proveedor_nit=nit,
        cufe=f"cufe-{numero}",
        numero_documento_proveedor=numero,
        fecha=fecha,
        forma_pago="2",
        monto_total=1000,
        **overrides,
    )
    db_session.add(factura)
    db_session.commit()
    for i, (tipo, legal_status) in enumerate(eventos):
        db_session.add(
            EventoReceptor(factura_recibida_id=factura.id, tipo=tipo, numero=f"E{numero}{i}", legal_status=legal_status)
        )
    db_session.commit()
    db_session.refresh(factura)
    return factura


def _criterios(tipo="030", **overrides) -> CriteriosEventoMasivoRequest:
    data = {"fecha_desde": date(2026, 9, 1), "fecha_hasta": date(2026, 9, 30), "tipo": tipo}
    data.update(overrides)
    return CriteriosEventoMasivoRequest(**data)


def _emitir(facturas, tipo="030", **overrides) -> EmitirEventoMasivoRequest:
    data = {
        "fecha_desde": date(2026, 9, 1),
        "fecha_hasta": date(2026, 9, 30),
        "tipo": tipo,
        "factura_ids": [f.id for f in facturas],
        "generador": _generador(cargo="Contador"),
    }
    data.update(overrides)
    return EmitirEventoMasivoRequest(**data)


def _servicio(db_session, *respuestas) -> tuple[EventoMasivoService, _FakeAlegra]:
    fake = _FakeAlegra(*respuestas)
    return EventoMasivoService(db_session, alegra_client=fake), fake


# --- Validaciones del formulario ---


def test_normalizar_nit_quita_puntos_y_digito_de_verificacion():
    assert normalizar_nit(" 800.123.456-7 ") == "800123456"
    assert normalizar_nit("") is None
    assert normalizar_nit(None) is None


def test_nit_con_letras_es_invalido():
    with pytest.raises(ValidationError):
        _criterios(proveedor_nit="80012A456")


def test_fecha_final_anterior_a_la_inicial_es_invalida():
    with pytest.raises(ValidationError):
        _criterios(fecha_desde=date(2026, 9, 30), fecha_hasta=date(2026, 9, 1))


def test_aceptacion_tacita_no_se_aplica_en_bloque():
    with pytest.raises(ValidationError):
        _criterios(tipo="034")


def test_reclamo_en_bloque_exige_motivo_valido():
    with pytest.raises(ValidationError):
        _emitir([], tipo="031", factura_ids=["00000000-0000-0000-0000-000000000001"])
    with pytest.raises(ValidationError):
        _emitir([], tipo="031", claim_code="99", factura_ids=["00000000-0000-0000-0000-000000000001"])


def test_emitir_limita_las_facturas_por_tanda():
    ids = [f"00000000-0000-0000-0000-{i:012d}" for i in range(MAX_FACTURAS_POR_ENVIO + 1)]
    with pytest.raises(ValidationError):
        _emitir([], factura_ids=ids)


# --- Validar ---


def test_validar_cuenta_solo_las_facturas_que_admiten_el_evento(db_session):
    empresa = _crear_empresa(db_session)
    _factura(db_session, empresa, "F1")
    _factura(db_session, empresa, "F2", eventos=[("030", "REJECTED")])
    _factura(db_session, empresa, "F3", eventos=[("030", "ACCEPTED")])
    service, _ = _servicio(db_session)

    acuse = service.validar(empresa.id, _criterios("030"))
    recibo = service.validar(empresa.id, _criterios("032"))

    assert [f.numero for f in acuse.facturas] == ["F1", "F2"]
    assert acuse.cantidad == 2
    assert [f.numero for f in recibo.facturas] == ["F3"]


def test_validar_filtra_por_fecha_de_emision_y_proveedor(db_session):
    empresa = _crear_empresa(db_session)
    _factura(db_session, empresa, "DENTRO")
    _factura(db_session, empresa, "AGOSTO", fecha=date(2026, 8, 31))
    _factura(db_session, empresa, "OTRO", nit=OTRO_NIT)
    _factura(db_session, empresa, "BORRADA", eliminado=date(2026, 9, 20))
    service, _ = _servicio(db_session)

    todas = service.validar(empresa.id, _criterios())
    del_proveedor = service.validar(empresa.id, _criterios(proveedor_nit=f"{NIT_PROVEEDOR}-1"))

    assert {f.numero for f in todas.facturas} == {"DENTRO", "OTRO"}
    assert [f.numero for f in del_proveedor.facturas] == ["DENTRO"]


def test_validar_no_ve_facturas_de_otra_empresa(db_session):
    empresa = _crear_empresa(db_session)
    otra = _crear_empresa(db_session, numero_identificacion="900000001")
    _factura(db_session, otra, "AJENA")
    service, _ = _servicio(db_session)

    assert service.validar(empresa.id, _criterios()).cantidad == 0


def test_validar_informa_cupo_insuficiente(db_session):
    empresa = _crear_empresa(db_session, max_documentos=1)
    _factura(db_session, empresa, "F1")
    _factura(db_session, empresa, "F2")
    service, _ = _servicio(db_session)

    resultado = service.validar(empresa.id, _criterios())

    assert resultado.documentos_necesarios == 2
    assert resultado.documentos_disponibles == 1
    assert resultado.bloqueo == "No tienes documentos suficientes: necesitas 2 y tienes 1 disponibles."


def test_validar_con_cupo_suficiente_no_bloquea(db_session):
    empresa = _crear_empresa(db_session, max_documentos=5)
    _factura(db_session, empresa, "F1")
    service, _ = _servicio(db_session)

    resultado = service.validar(empresa.id, _criterios())

    assert resultado.bloqueo is None
    assert resultado.documentos_disponibles == 5


def test_validar_no_pide_documentos_por_facturas_ya_cobradas(db_session):
    empresa = _crear_empresa(db_session, max_documentos=0)
    _factura(db_session, empresa, "F1", eventos=[("030", "ACCEPTED")])
    _factura(db_session, empresa, "F2", eventos=[("030", "ACCEPTED")])
    service, _ = _servicio(db_session)

    resultado = service.validar(empresa.id, _criterios("032"))

    assert resultado.cantidad == 2
    assert resultado.documentos_necesarios == 0
    assert resultado.bloqueo is None


def test_validar_con_plan_vencido_bloquea_aunque_no_necesite_documentos(db_session):
    empresa = _crear_empresa(db_session)
    db_session.query(Suscripcion).filter_by(empresa_id=empresa.id).update({"fecha_fin": date(2020, 1, 31)})
    db_session.commit()
    _factura(db_session, empresa, "F1", eventos=[("030", "ACCEPTED")])
    service, _ = _servicio(db_session)

    resultado = service.validar(empresa.id, _criterios("032"))

    assert resultado.documentos_necesarios == 0
    assert "venció" in resultado.bloqueo


def test_validar_bloquea_si_supera_el_maximo(db_session, monkeypatch):
    monkeypatch.setattr("src.application.evento_masivo_service.MAX_FACTURAS_EVENTO_MASIVO", 1)
    empresa = _crear_empresa(db_session)
    _factura(db_session, empresa, "F1")
    _factura(db_session, empresa, "F2")
    service, _ = _servicio(db_session)

    resultado = service.validar(empresa.id, _criterios())

    assert resultado.cantidad == 2
    assert "máximo" in resultado.bloqueo


# --- Emitir ---


def test_emitir_envia_un_evento_por_factura_y_descuenta_cupo(db_session):
    empresa = _crear_empresa(db_session)
    facturas = [_factura(db_session, empresa, "F1"), _factura(db_session, empresa, "F2")]
    service, fake = _servicio(db_session)

    resultados = service.emitir(empresa.id, _emitir(facturas))

    assert [r.resultado for r in resultados] == ["aceptado", "aceptado"]
    assert [p["uuid"] for p in fake.payloads] == ["cufe-F1", "cufe-F2"]
    assert fake.payloads[0]["issuerParty"]["jobTitle"] == "Contador"
    suscripcion = db_session.query(Suscripcion).filter_by(empresa_id=empresa.id).one()
    assert contar_documentos_usados(db_session, suscripcion) == 2


def test_emitir_sin_cupo_suficiente_no_envia_nada(db_session):
    empresa = _crear_empresa(db_session, max_documentos=1)
    facturas = [_factura(db_session, empresa, "F1"), _factura(db_session, empresa, "F2")]
    service, fake = _servicio(db_session)

    with pytest.raises(HTTPException) as exc_info:
        service.emitir(empresa.id, _emitir(facturas))

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail == "No tienes documentos suficientes: necesitas 2 y tienes 1 disponibles."
    assert fake.payloads == []


def test_emitir_solo_exige_cupo_para_las_facturas_no_cobradas(db_session):
    # El acuse ya aceptado de F1 agota el unico documento del plan.
    empresa = _crear_empresa(db_session, max_documentos=1)
    cobrada = _factura(db_session, empresa, "F1", eventos=[("030", "ACCEPTED")])
    suscripcion = db_session.query(Suscripcion).filter_by(empresa_id=empresa.id).one()
    service, fake = _servicio(db_session)

    resultados = service.emitir(empresa.id, _emitir([cobrada], tipo="032"))

    assert [r.resultado for r in resultados] == ["aceptado"]
    assert len(fake.payloads) == 1
    assert contar_documentos_usados(db_session, suscripcion) == 1


def test_emitir_con_plan_vencido_no_envia_nada_aunque_no_necesite_documentos(db_session):
    empresa = _crear_empresa(db_session)
    db_session.query(Suscripcion).filter_by(empresa_id=empresa.id).update({"fecha_fin": date(2020, 1, 31)})
    db_session.commit()
    factura = _factura(db_session, empresa, "F1", eventos=[("030", "ACCEPTED")])
    service, fake = _servicio(db_session)

    with pytest.raises(HTTPException) as exc_info:
        service.emitir(empresa.id, _emitir([factura], tipo="032"))

    assert exc_info.value.status_code == 409
    assert fake.payloads == []


def test_emitir_sin_suscripcion_activa_no_envia_nada(db_session):
    empresa = _crear_empresa(db_session)
    db_session.query(Suscripcion).filter_by(empresa_id=empresa.id).update({"estado": "vencida"})
    db_session.commit()
    factura = _factura(db_session, empresa, "F1")
    service, fake = _servicio(db_session)

    with pytest.raises(HTTPException) as exc_info:
        service.emitir(empresa.id, _emitir([factura]))

    assert exc_info.value.status_code == 409
    assert fake.payloads == []


def test_emitir_reporta_cada_fallo_con_su_motivo_y_sigue(db_session):
    empresa = _crear_empresa(db_session)
    facturas = [_factura(db_session, empresa, n) for n in ("F1", "F2", "F3")]
    service, _ = _servicio(
        db_session,
        _respuesta_evento("REJECTED"),
        AlegraTransientError("timeout"),
        _respuesta_evento("ACCEPTED"),
    )

    resultados = service.emitir(empresa.id, _emitir(facturas))

    assert [(r.numero, r.resultado) for r in resultados] == [
        ("F1", "fallido"),
        ("F2", "fallido"),
        ("F3", "aceptado"),
    ]
    assert resultados[0].mensaje  # razon de rechazo mapeada de la DIAN
    assert "no está respondiendo" in resultados[1].mensaje
    assert resultados[2].mensaje is None


def test_emitir_no_envia_a_facturas_que_ya_no_admiten_el_evento(db_session):
    empresa = _crear_empresa(db_session)
    lista = _factura(db_session, empresa, "LISTA")
    avanzada = _factura(db_session, empresa, "AVANZADA", eventos=[("030", "ACCEPTED")])
    fuera_de_rango = _factura(db_session, empresa, "VIEJA", fecha=date(2026, 1, 1))
    service, fake = _servicio(db_session)

    resultados = service.emitir(empresa.id, _emitir([lista, avanzada, fuera_de_rango]))

    assert [r.resultado for r in resultados] == ["aceptado", "fallido", "fallido"]
    assert resultados[1].mensaje == MOTIVO_YA_NO_APLICA
    assert [p["uuid"] for p in fake.payloads] == ["cufe-LISTA"]


def test_emitir_reclamo_lleva_motivo_y_notas(db_session):
    empresa = _crear_empresa(db_session)
    factura = _factura(db_session, empresa, "F1", eventos=[("030", "ACCEPTED"), ("032", "ACCEPTED")])
    service, fake = _servicio(db_session)

    resultados = service.emitir(empresa.id, _emitir([factura], tipo="031", claim_code="02", notas="No llegó"))

    assert resultados[0].resultado == "aceptado"
    assert fake.payloads[0]["claimCode"] == "02"
    assert fake.payloads[0]["notes"] == ["No llegó"]


def test_emitir_empresa_sin_id_alegra_da_409(db_session):
    empresa = _crear_empresa(db_session, id_alegra=None)
    factura = _factura(db_session, empresa, "F1")
    service, fake = _servicio(db_session)

    with pytest.raises(HTTPException) as exc_info:
        service.emitir(empresa.id, _emitir([factura]))

    assert exc_info.value.status_code == 409
    assert fake.payloads == []


# --- HTTP ---


def test_validar_por_http_usa_la_empresa_del_token(api_client, db_session):
    empresa = _crear_empresa(db_session)
    db_session.add(
        UsuarioEmpresa(
            empresa_id=empresa.id,
            nombre="Usuario",
            email="masivo@example.com",
            password_hash=hash_password("ClaveMasivo123!"),
            estado="activo",
        )
    )
    db_session.commit()
    _factura(db_session, empresa, "F1")
    login = api_client.post("/api/v1/auth/login", json={"email": "masivo@example.com", "password": "ClaveMasivo123!"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    ok = api_client.post(
        "/api/v1/tenant/facturas-recibidas/eventos-masivos/validar",
        json={"fecha_desde": "2026-09-01", "fecha_hasta": "2026-09-30", "tipo": "030"},
        headers=headers,
    )
    invalido = api_client.post(
        "/api/v1/tenant/facturas-recibidas/eventos-masivos/validar",
        json={"fecha_desde": "2026-09-30", "fecha_hasta": "2026-09-01", "tipo": "030"},
        headers=headers,
    )

    assert ok.status_code == 200
    assert ok.json()["cantidad"] == 1
    assert invalido.status_code == 422


def test_emitir_por_http_sin_token_es_rechazado(api_client):
    response = api_client.post("/api/v1/tenant/facturas-recibidas/eventos-masivos/emitir", json={})

    assert response.status_code == 401
