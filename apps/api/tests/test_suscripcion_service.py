from datetime import date, datetime, timezone

import pytest
from fastapi import HTTPException

from src.application.suscripcion_service import (
    contar_documentos_aceptados,
    contar_documentos_alegra,
    contar_documentos_usados,
    revisar_alerta_cuota_por_empresa,
    verificar_cupo_disponible,
    verificar_plan_vigente,
)
from src.core.tiempo import hoy_colombia
from src.infrastructure.db.models import (
    Cliente,
    DocumentoSoporte,
    Empleado,
    Empresa,
    EventoReceptor,
    Factura,
    FacturaRecibida,
    Nomina,
    NotaCredito,
    NotaDebito,
    Proveedor,
    Suscripcion,
    UsuarioEmpresa,
)
from src.core.security import hash_password


def _crear_empresa(db_session, **overrides) -> Empresa:
    data = {
        "razon_social": "Empresa Demo SAS",
        "numero_identificacion": "900618467",
        "digito_verificacion": "4",
        "correo_electronico": "empresa@example.com",
        "estado": "activo",
    }
    data.update(overrides)
    empresa = Empresa(**data)
    db_session.add(empresa)
    db_session.commit()
    db_session.refresh(empresa)
    return empresa


def _crear_cliente(db_session, empresa_id) -> Cliente:
    cliente = Cliente(
        empresa_id=empresa_id,
        tipo_identificacion="13",
        numero_identificacion="1000000000",
        nombre="Cliente de prueba",
        correo_electronico="cliente@example.com",
    )
    db_session.add(cliente)
    db_session.commit()
    db_session.refresh(cliente)
    return cliente


def _crear_suscripcion(db_session, empresa_id, **overrides) -> Suscripcion:
    data = {
        "empresa_id": empresa_id,
        "max_documentos": 10,
        "fecha_inicio": date(2026, 1, 1),
        "fecha_fin": date(2026, 12, 31),
        "estado": "activa",
    }
    data.update(overrides)
    suscripcion = Suscripcion(**data)
    db_session.add(suscripcion)
    db_session.commit()
    db_session.refresh(suscripcion)
    return suscripcion


def _crear_factura(db_session, empresa_id, cliente_id, *, estado, fecha_envio) -> Factura:
    factura = Factura(
        empresa_id=empresa_id,
        cliente_id=cliente_id,
        fecha=date(2026, 6, 1),
        estado=estado,
        fecha_envio=fecha_envio,
    )
    db_session.add(factura)
    db_session.commit()
    db_session.refresh(factura)
    return factura


def _crear_nota_credito(db_session, empresa_id, cliente_id, factura_id, *, estado, fecha_envio) -> NotaCredito:
    nota = NotaCredito(
        empresa_id=empresa_id,
        factura_id=factura_id,
        cliente_id=cliente_id,
        fecha=date(2026, 6, 2),
        motivo_codigo="1",
        estado=estado,
        fecha_envio=fecha_envio,
    )
    db_session.add(nota)
    db_session.commit()
    db_session.refresh(nota)
    return nota


def _crear_nota_debito(db_session, empresa_id, cliente_id, factura_id, *, estado, fecha_envio) -> NotaDebito:
    nota = NotaDebito(
        empresa_id=empresa_id,
        factura_id=factura_id,
        cliente_id=cliente_id,
        fecha=date(2026, 6, 2),
        motivo_codigo="1",
        estado=estado,
        fecha_envio=fecha_envio,
    )
    db_session.add(nota)
    db_session.commit()
    db_session.refresh(nota)
    return nota


_DENTRO_DEL_PERIODO = datetime(2026, 6, 15, tzinfo=timezone.utc)
_FUERA_DEL_PERIODO = datetime(2025, 1, 1, tzinfo=timezone.utc)


def test_contar_documentos_usados_solo_cuenta_aceptadas_y_anuladas_dentro_del_periodo(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    suscripcion = _crear_suscripcion(db_session, empresa.id)

    aceptada = _crear_factura(db_session, empresa.id, cliente.id, estado="aceptada", fecha_envio=_DENTRO_DEL_PERIODO)
    _crear_factura(db_session, empresa.id, cliente.id, estado="anulada", fecha_envio=_DENTRO_DEL_PERIODO)
    _crear_factura(db_session, empresa.id, cliente.id, estado="rechazada", fecha_envio=_DENTRO_DEL_PERIODO)
    _crear_factura(db_session, empresa.id, cliente.id, estado="aceptada", fecha_envio=_FUERA_DEL_PERIODO)
    _crear_nota_credito(db_session, empresa.id, cliente.id, aceptada.id, estado="aceptada", fecha_envio=_DENTRO_DEL_PERIODO)
    _crear_nota_credito(db_session, empresa.id, cliente.id, aceptada.id, estado="borrador", fecha_envio=_DENTRO_DEL_PERIODO)
    _crear_nota_debito(db_session, empresa.id, cliente.id, aceptada.id, estado="aceptada", fecha_envio=_DENTRO_DEL_PERIODO)

    assert contar_documentos_usados(db_session, suscripcion) == 4  # 1 factura aceptada + 1 anulada + 1 NC + 1 ND


def _crear_documento_soporte(db_session, empresa_id, *, estado, fecha_envio) -> DocumentoSoporte:
    proveedor = Proveedor(
        empresa_id=empresa_id,
        tipo_identificacion="31",
        numero_identificacion=f"9001{datetime.now().microsecond:06d}",
        nombre="Proveedor de prueba",
        correo_electronico="proveedor@example.com",
    )
    db_session.add(proveedor)
    db_session.commit()
    documento = DocumentoSoporte(
        empresa_id=empresa_id, proveedor_id=proveedor.id, fecha=date(2026, 6, 1), estado=estado, fecha_envio=fecha_envio
    )
    db_session.add(documento)
    db_session.commit()
    return documento


def _crear_nomina(db_session, empresa_id, *, estado, fecha_envio) -> Nomina:
    empleado = Empleado(
        empresa_id=empresa_id,
        tipo_documento="13",
        numero_documento=f"10{datetime.now().microsecond:06d}",
        primer_apellido="Perez",
        primer_nombre="Ana",
        tipo_trabajador="01",
        subtipo_trabajador="00",
        tipo_contrato="1",
        sueldo=1_500_000,
        lugar_trabajo_municipio="11001",
        lugar_trabajo_direccion="Calle 1",
        fecha_ingreso=date(2026, 1, 1),
    )
    db_session.add(empleado)
    db_session.commit()
    nomina = Nomina(
        empresa_id=empresa_id,
        empleado_id=empleado.id,
        periodo_nomina="5",
        fecha_liquidacion_inicio=date(2026, 6, 1),
        fecha_liquidacion_fin=date(2026, 6, 30),
        fecha_pago=["2026-06-30"],
        forma_pago="1",
        metodo_pago="10",
        devengados={},
        deducciones={},
        estado=estado,
        fecha_envio=fecha_envio,
    )
    db_session.add(nomina)
    db_session.commit()
    return nomina


def test_contar_documentos_usados_incluye_documento_soporte_y_nomina(db_session):
    empresa = _crear_empresa(db_session)
    suscripcion = _crear_suscripcion(db_session, empresa.id)

    _crear_documento_soporte(db_session, empresa.id, estado="aceptado", fecha_envio=_DENTRO_DEL_PERIODO)
    _crear_documento_soporte(db_session, empresa.id, estado="rechazado", fecha_envio=_DENTRO_DEL_PERIODO)
    _crear_nomina(db_session, empresa.id, estado="aceptada", fecha_envio=_DENTRO_DEL_PERIODO)
    _crear_nomina(db_session, empresa.id, estado="anulada", fecha_envio=_DENTRO_DEL_PERIODO)
    _crear_nomina(db_session, empresa.id, estado="borrador", fecha_envio=None)
    _crear_nomina(db_session, empresa.id, estado="aceptada", fecha_envio=_FUERA_DEL_PERIODO)

    assert contar_documentos_usados(db_session, suscripcion) == 3  # 1 DS aceptado + nomina aceptada + anulada


def _crear_factura_recibida(db_session, empresa_id, cufe, eventos) -> FacturaRecibida:
    """eventos: (tipo, legal_status, origen, creado)."""
    factura = FacturaRecibida(empresa_id=empresa_id, proveedor_nombre="Proveedor SAS", cufe=cufe, fecha=date(2026, 6, 1))
    db_session.add(factura)
    db_session.commit()
    for i, (tipo, legal_status, origen, creado) in enumerate(eventos):
        db_session.add(
            EventoReceptor(
                factura_recibida_id=factura.id,
                tipo=tipo,
                numero=f"{cufe}-{i}",
                legal_status=legal_status,
                origen=origen,
                creado=creado,
            )
        )
    db_session.commit()
    return factura


def test_contar_documentos_usados_cobra_una_vez_por_factura_recibida(db_session):
    empresa = _crear_empresa(db_session)
    suscripcion = _crear_suscripcion(db_session, empresa.id)
    # Tres eventos aceptados: un solo documento.
    _crear_factura_recibida(
        db_session,
        empresa.id,
        "cufe-a",
        [
            ("030", "ACCEPTED", "ingefact", _DENTRO_DEL_PERIODO),
            ("032", "ACCEPTED", "ingefact", _DENTRO_DEL_PERIODO),
            ("033", "ACCEPTED", "ingefact", _DENTRO_DEL_PERIODO),
        ],
    )
    # Rechazado y luego aceptado: cobra el aceptado.
    _crear_factura_recibida(
        db_session,
        empresa.id,
        "cufe-b",
        [("030", "REJECTED", "ingefact", _DENTRO_DEL_PERIODO), ("030", "ACCEPTED", "ingefact", _DENTRO_DEL_PERIODO)],
    )
    # Solo eventos leidos de la DIAN o rechazados: no cobra.
    _crear_factura_recibida(db_session, empresa.id, "cufe-c", [("030", "ACCEPTED", "dian", _DENTRO_DEL_PERIODO)])
    _crear_factura_recibida(db_session, empresa.id, "cufe-d", [("030", "REJECTED", "ingefact", _DENTRO_DEL_PERIODO)])
    # Cobrada en un periodo anterior: los eventos de este periodo ya no cobran.
    _crear_factura_recibida(
        db_session,
        empresa.id,
        "cufe-e",
        [("030", "ACCEPTED", "ingefact", _FUERA_DEL_PERIODO), ("032", "ACCEPTED", "ingefact", _DENTRO_DEL_PERIODO)],
    )

    assert contar_documentos_usados(db_session, suscripcion) == 2


def test_contar_documentos_alegra_cuenta_cada_evento_aceptado(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    _crear_factura(db_session, empresa.id, cliente.id, estado="aceptada", fecha_envio=_DENTRO_DEL_PERIODO)
    _crear_factura_recibida(
        db_session,
        empresa.id,
        "cufe-a",
        [
            ("030", "ACCEPTED", "ingefact", _DENTRO_DEL_PERIODO),
            ("032", "ACCEPTED_WITH_OBSERVATIONS", "ingefact", _DENTRO_DEL_PERIODO),
            ("033", "REJECTED", "ingefact", _DENTRO_DEL_PERIODO),
            ("031", "ACCEPTED", "dian", _DENTRO_DEL_PERIODO),
        ],
    )
    inicio = datetime(2026, 1, 1, tzinfo=timezone.utc)
    fin = datetime(2026, 12, 31, tzinfo=timezone.utc)

    assert contar_documentos_alegra(db_session, inicio, fin) == 3  # factura + 2 eventos
    assert contar_documentos_aceptados(db_session, inicio, fin) == 2  # factura + 1 factura recibida


def test_verificar_cupo_disponible_con_plan_vencido_lanza_409(db_session):
    empresa = _crear_empresa(db_session)
    _crear_suscripcion(db_session, empresa.id, fecha_inicio=date(2025, 1, 1), fecha_fin=date(2025, 12, 31))

    with pytest.raises(HTTPException) as exc:
        verificar_cupo_disponible(db_session, empresa.id)

    assert exc.value.status_code == 409
    assert exc.value.detail == "Tu plan venció el 31/12/2025. Renuévalo para seguir enviando documentos a la DIAN."


def test_verificar_plan_vigente_el_ultimo_dia_del_plan_no_lanza(db_session):
    empresa = _crear_empresa(db_session)
    _crear_suscripcion(db_session, empresa.id, fecha_inicio=date(2025, 1, 1), fecha_fin=hoy_colombia())

    verificar_plan_vigente(db_session, empresa.id)


def test_verificar_cupo_disponible_sin_suscripcion_activa_lanza_409(db_session):
    empresa = _crear_empresa(db_session)

    with pytest.raises(HTTPException) as exc:
        verificar_cupo_disponible(db_session, empresa.id)

    assert exc.value.status_code == 409


def test_verificar_cupo_disponible_con_cupo_agotado_lanza_409(db_session):
    empresa = _crear_empresa(db_session)
    _crear_suscripcion(db_session, empresa.id, max_documentos=1)
    _crear_nomina(db_session, empresa.id, estado="aceptada", fecha_envio=_DENTRO_DEL_PERIODO)

    with pytest.raises(HTTPException) as exc:
        verificar_cupo_disponible(db_session, empresa.id)

    assert exc.value.status_code == 409
    assert "cupo" in exc.value.detail


def test_verificar_cupo_disponible_con_cupo_libre_no_lanza(db_session):
    empresa = _crear_empresa(db_session)
    _crear_suscripcion(db_session, empresa.id, max_documentos=2)
    _crear_documento_soporte(db_session, empresa.id, estado="aceptado", fecha_envio=_DENTRO_DEL_PERIODO)

    verificar_cupo_disponible(db_session, empresa.id)


def test_revisar_alerta_cuota_envia_correo_al_cruzar_el_umbral(db_session, fake_email_client):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    suscripcion = _crear_suscripcion(db_session, empresa.id, max_documentos=2)
    for _ in range(2):
        _crear_factura(db_session, empresa.id, cliente.id, estado="aceptada", fecha_envio=_DENTRO_DEL_PERIODO)

    usuario = UsuarioEmpresa(
        empresa_id=empresa.id,
        nombre="Tenant Test",
        email="tenant@example.com",
        password_hash=hash_password("Sandbox123!"),
    )
    db_session.add(usuario)
    db_session.commit()

    revisar_alerta_cuota_por_empresa(db_session, empresa.id, fake_email_client)

    assert len(fake_email_client.sent) == 1
    assert fake_email_client.sent[0]["to"] == "tenant@example.com"
    db_session.refresh(suscripcion)
    assert suscripcion.alerta_cuota_enviada is True


def test_revisar_alerta_cuota_no_envia_si_no_cruzo_el_umbral(db_session, fake_email_client):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    _crear_suscripcion(db_session, empresa.id, max_documentos=10)
    _crear_factura(db_session, empresa.id, cliente.id, estado="aceptada", fecha_envio=_DENTRO_DEL_PERIODO)

    revisar_alerta_cuota_por_empresa(db_session, empresa.id, fake_email_client)

    assert fake_email_client.sent == []


def test_revisar_alerta_cuota_no_reenvia_si_ya_se_envio(db_session, fake_email_client):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    _crear_suscripcion(db_session, empresa.id, max_documentos=2, alerta_cuota_enviada=True)
    for _ in range(2):
        _crear_factura(db_session, empresa.id, cliente.id, estado="aceptada", fecha_envio=_DENTRO_DEL_PERIODO)

    revisar_alerta_cuota_por_empresa(db_session, empresa.id, fake_email_client)

    assert fake_email_client.sent == []


def test_revisar_alerta_cuota_usa_correo_de_empresa_si_no_hay_usuario_tenant(db_session, fake_email_client):
    empresa = _crear_empresa(db_session, correo_electronico="fallback@example.com")
    cliente = _crear_cliente(db_session, empresa.id)
    _crear_suscripcion(db_session, empresa.id, max_documentos=1)
    _crear_factura(db_session, empresa.id, cliente.id, estado="aceptada", fecha_envio=_DENTRO_DEL_PERIODO)

    revisar_alerta_cuota_por_empresa(db_session, empresa.id, fake_email_client)

    assert fake_email_client.sent[0]["to"] == "fallback@example.com"


def test_revisar_alerta_cuota_sin_suscripcion_activa_no_hace_nada(db_session, fake_email_client):
    empresa = _crear_empresa(db_session)

    revisar_alerta_cuota_por_empresa(db_session, empresa.id, fake_email_client)

    assert fake_email_client.sent == []
