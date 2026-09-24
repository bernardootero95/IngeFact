from datetime import date, datetime, timedelta, timezone

from src.application.dashboard_service import DashboardService
from src.core.tiempo import hoy_colombia
from src.infrastructure.db.models import (
    Cliente,
    DocumentoSoporte,
    Empresa,
    Factura,
    NotaCredito,
    NotaDebito,
    Proveedor,
    Suscripcion,
)


def _crear_empresa(db_session, *, razon_social="Empresa Demo SAS", nit="900618467", estado="activo"):
    empresa = Empresa(
        razon_social=razon_social,
        numero_identificacion=nit,
        digito_verificacion="1",
        correo_electronico=f"{nit}@example.com",
        estado=estado,
    )
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


def _crear_proveedor(db_session, empresa_id) -> Proveedor:
    proveedor = Proveedor(
        empresa_id=empresa_id,
        tipo_identificacion="31",
        numero_identificacion="1000000001",
        digito_verificacion="4",
        nombre="Proveedor de prueba",
        correo_electronico="proveedor@example.com",
        tipo_organizacion="2",
        regimen="R-99-PN",
        direccion="Cra 1 # 2-3",
        departamento="11",
        municipio="11001",
    )
    db_session.add(proveedor)
    db_session.commit()
    db_session.refresh(proveedor)
    return proveedor


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
        empresa_id=empresa_id, cliente_id=cliente_id, fecha=date(2026, 6, 1), estado=estado, fecha_envio=fecha_envio
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


def _crear_documento_soporte(db_session, empresa_id, proveedor_id, *, estado, fecha_envio) -> DocumentoSoporte:
    documento = DocumentoSoporte(
        empresa_id=empresa_id,
        proveedor_id=proveedor_id,
        fecha=date(2026, 6, 1),
        estado=estado,
        fecha_envio=fecha_envio,
    )
    db_session.add(documento)
    db_session.commit()
    db_session.refresh(documento)
    return documento


_DENTRO_DEL_MES = datetime.now(timezone.utc)
_FUERA_DEL_MES = datetime(2020, 1, 1, tzinfo=timezone.utc)


def test_obtener_kpis_sin_empresas(db_session):
    kpis = DashboardService(db_session).obtener_kpis()

    assert kpis["total_empresas"] == 0
    assert kpis["empresas_activas"] == 0
    assert kpis["empresas_inactivas"] == 0
    assert kpis["empresas_con_error_alegra"] == 0
    assert kpis["documentos_emitidos_mes"] == 0
    assert kpis["clientes_proximos_a_vencer"] == []
    assert kpis["clientes_proximos_a_agotar_cupo"] == []
    assert kpis["ultimas_empresas"] == []


def test_obtener_kpis_cuenta_por_estado(db_session):
    _crear_empresa(db_session, razon_social="Activa 1", nit="900000001", estado="activo")
    _crear_empresa(db_session, razon_social="Activa 2", nit="900000002", estado="activo")
    _crear_empresa(db_session, razon_social="Inactiva", nit="900000003", estado="inactivo")
    _crear_empresa(db_session, razon_social="Con error", nit="900000004", estado="error_alegra")

    kpis = DashboardService(db_session).obtener_kpis()

    assert kpis["total_empresas"] == 4
    assert kpis["empresas_activas"] == 2
    assert kpis["empresas_inactivas"] == 1
    assert kpis["empresas_con_error_alegra"] == 1


def test_obtener_kpis_ultimas_empresas_limita_a_5_mas_recientes(db_session):
    for i in range(7):
        _crear_empresa(db_session, razon_social=f"Empresa {i}", nit=f"90000100{i}", estado="activo")

    kpis = DashboardService(db_session).obtener_kpis()

    assert len(kpis["ultimas_empresas"]) == 5
    nombres = {e["razon_social"] for e in kpis["ultimas_empresas"]}
    assert "Empresa 6" in nombres
    assert "Empresa 0" not in nombres


def test_documentos_emitidos_mes_cuenta_los_4_tipos_enviados_este_mes(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    proveedor = _crear_proveedor(db_session, empresa.id)

    aceptada = _crear_factura(db_session, empresa.id, cliente.id, estado="aceptada", fecha_envio=_DENTRO_DEL_MES)
    _crear_factura(db_session, empresa.id, cliente.id, estado="rechazada", fecha_envio=_DENTRO_DEL_MES)
    _crear_factura(db_session, empresa.id, cliente.id, estado="borrador", fecha_envio=None)  # no cuenta: nunca se envio
    _crear_factura(db_session, empresa.id, cliente.id, estado="aceptada", fecha_envio=_FUERA_DEL_MES)
    _crear_nota_credito(
        db_session, empresa.id, cliente.id, aceptada.id, estado="aceptada", fecha_envio=_DENTRO_DEL_MES
    )
    _crear_nota_debito(db_session, empresa.id, cliente.id, aceptada.id, estado="rechazada", fecha_envio=_DENTRO_DEL_MES)
    _crear_documento_soporte(db_session, empresa.id, proveedor.id, estado="aceptado", fecha_envio=_DENTRO_DEL_MES)

    kpis = DashboardService(db_session).obtener_kpis()

    # 2 facturas + 1 NC + 1 ND + 1 doc soporte enviados este mes (borrador y fuera de mes no cuentan)
    assert kpis["documentos_emitidos_mes"] == 5


def test_clientes_proximos_a_vencer_solo_incluye_dentro_del_umbral_de_30_dias(db_session):
    hoy = hoy_colombia()
    empresa_urgente = _crear_empresa(db_session, razon_social="Vence pronto", nit="900000010")
    _crear_suscripcion(db_session, empresa_urgente.id, fecha_fin=hoy + timedelta(days=5))

    empresa_lejos = _crear_empresa(db_session, razon_social="Vence lejos", nit="900000011")
    _crear_suscripcion(db_session, empresa_lejos.id, fecha_fin=hoy + timedelta(days=90))

    kpis = DashboardService(db_session).obtener_kpis()

    nombres = {c["razon_social"] for c in kpis["clientes_proximos_a_vencer"]}
    assert nombres == {"Vence pronto"}


def test_clientes_proximos_a_vencer_incluye_ya_vencidos_y_ordena_por_urgencia(db_session):
    hoy = hoy_colombia()
    empresa_vencida = _crear_empresa(db_session, razon_social="Ya vencida", nit="900000020")
    _crear_suscripcion(db_session, empresa_vencida.id, fecha_fin=hoy - timedelta(days=3))

    empresa_pronto = _crear_empresa(db_session, razon_social="En 10 dias", nit="900000021")
    _crear_suscripcion(db_session, empresa_pronto.id, fecha_fin=hoy + timedelta(days=10))

    kpis = DashboardService(db_session).obtener_kpis()

    orden = [c["razon_social"] for c in kpis["clientes_proximos_a_vencer"]]
    assert orden == ["Ya vencida", "En 10 dias"]
    assert kpis["clientes_proximos_a_vencer"][0]["dias_para_vencer"] == -3


def test_clientes_proximos_a_agotar_cupo_usa_el_mismo_umbral_90_por_ciento(db_session):
    hoy = hoy_colombia()
    empresa = _crear_empresa(db_session, razon_social="Casi sin cupo", nit="900000030")
    cliente = _crear_cliente(db_session, empresa.id)
    _crear_suscripcion(db_session, empresa.id, max_documentos=10, fecha_fin=hoy + timedelta(days=365))
    for _ in range(9):
        _crear_factura(db_session, empresa.id, cliente.id, estado="aceptada", fecha_envio=_DENTRO_DEL_MES)

    empresa_ok = _crear_empresa(db_session, razon_social="Con cupo de sobra", nit="900000031")
    cliente_ok = _crear_cliente(db_session, empresa_ok.id)
    _crear_suscripcion(db_session, empresa_ok.id, max_documentos=10, fecha_fin=hoy + timedelta(days=365))
    _crear_factura(db_session, empresa_ok.id, cliente_ok.id, estado="aceptada", fecha_envio=_DENTRO_DEL_MES)

    kpis = DashboardService(db_session).obtener_kpis()

    nombres = {c["razon_social"] for c in kpis["clientes_proximos_a_agotar_cupo"]}
    assert nombres == {"Casi sin cupo"}
    assert kpis["clientes_proximos_a_agotar_cupo"][0]["porcentaje_usado"] == 90.0


def test_alertas_ignoran_suscripciones_no_activas(db_session):
    hoy = hoy_colombia()
    empresa = _crear_empresa(db_session, razon_social="Plan cancelado", nit="900000040")
    _crear_suscripcion(db_session, empresa.id, fecha_fin=hoy + timedelta(days=1), estado="cancelada")

    kpis = DashboardService(db_session).obtener_kpis()

    assert kpis["clientes_proximos_a_vencer"] == []
