from datetime import date, datetime, timedelta, timezone

from src.application.dashboard_service import DashboardService
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


def _crear_nomina(db_session, empresa_id, *, estado, fecha_envio, fecha_anulacion=None) -> Nomina:
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
        fecha_anulacion=fecha_anulacion,
    )
    db_session.add(nomina)
    db_session.commit()
    return nomina


def _crear_factura_recibida(db_session, empresa_id, eventos) -> FacturaRecibida:
    """eventos: (tipo, legal_status, origen, creado)."""
    factura = FacturaRecibida(
        empresa_id=empresa_id,
        proveedor_nombre="Proveedor SAS",
        cufe=f"cufe-{datetime.now().microsecond}",
        fecha=date(2026, 6, 1),
    )
    db_session.add(factura)
    db_session.commit()
    for i, (tipo, legal_status, origen, creado) in enumerate(eventos):
        db_session.add(
            EventoReceptor(
                factura_recibida_id=factura.id,
                tipo=tipo,
                numero=f"EV{i}",
                legal_status=legal_status,
                origen=origen,
                creado=creado,
            )
        )
    db_session.commit()
    return factura


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


def test_documentos_emitidos_mes_solo_cuenta_los_aceptados_este_mes(db_session):
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

    # Factura + NC + doc soporte aceptados este mes (rechazados, borrador y fuera de mes no cuentan)
    assert kpis["documentos_emitidos_mes"] == 3


def test_documentos_emitidos_mes_incluye_nomina_y_su_anulacion(db_session):
    empresa = _crear_empresa(db_session)
    _crear_nomina(db_session, empresa.id, estado="aceptada", fecha_envio=_DENTRO_DEL_MES)
    _crear_nomina(db_session, empresa.id, estado="rechazada", fecha_envio=_DENTRO_DEL_MES)
    _crear_nomina(db_session, empresa.id, estado="borrador", fecha_envio=None)
    # Anulada este mes: el comprobante y la nota de eliminacion son dos envios.
    _crear_nomina(
        db_session, empresa.id, estado="anulada", fecha_envio=_DENTRO_DEL_MES, fecha_anulacion=_DENTRO_DEL_MES
    )
    # Emitida en otro mes y anulada en este: solo cuenta la anulacion.
    _crear_nomina(
        db_session, empresa.id, estado="anulada", fecha_envio=_FUERA_DEL_MES, fecha_anulacion=_DENTRO_DEL_MES
    )

    kpis = DashboardService(db_session).obtener_kpis()

    # aceptada + (envio + anulacion) + anulacion = 4; la rechazada no cuenta
    assert kpis["documentos_emitidos_mes"] == 4
    assert kpis["finanzas_mes"]["documentos_emitidos"] == 4


def test_documentos_emitidos_mes_cuenta_cada_evento_aceptado_enviado_por_ingefact(db_session):
    empresa = _crear_empresa(db_session)
    _crear_factura_recibida(
        db_session,
        empresa.id,
        [
            ("030", "ACCEPTED", "ingefact", _DENTRO_DEL_MES),
            ("032", "ACCEPTED", "ingefact", _DENTRO_DEL_MES),
            ("033", "REJECTED", "ingefact", _DENTRO_DEL_MES),  # rechazado por la DIAN: no cuenta
        ],
    )
    _crear_factura_recibida(
        db_session,
        empresa.id,
        [
            ("030", "ACCEPTED", "dian", _DENTRO_DEL_MES),  # leido de la DIAN: no lo envio IngeFact
            ("032", "ACCEPTED", "ingefact", _FUERA_DEL_MES),
        ],
    )

    kpis = DashboardService(db_session).obtener_kpis()

    assert kpis["documentos_emitidos_mes"] == 2


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


def test_finanzas_mes_ganancia_y_documentos_maximos(db_session):
    from datetime import timedelta

    from src.core.config import get_settings
    from src.infrastructure.db.models import VentaPaquete

    ahora = datetime.now(timezone.utc)
    empresa_vieja = _crear_empresa(db_session, razon_social="Vieja SAS", nit="900000001")
    empresa_nueva = _crear_empresa(db_session, razon_social="Nueva SAS", nit="900000002")
    # Arranco el mes con 100 documentos de cupo, 30 ya usados el mes pasado.
    _crear_suscripcion(db_session, empresa_vieja.id, max_documentos=100, fecha_inicio=date(2026, 1, 1))
    cliente = _crear_cliente(db_session, empresa_vieja.id)
    _crear_factura(
        db_session, empresa_vieja.id, cliente.id, estado="aceptada", fecha_envio=ahora - timedelta(days=60)
    )
    # Venta de este mes.
    db_session.add(
        VentaPaquete(
            empresa_id=empresa_nueva.id,
            max_documentos=500,
            precio=300000,
            fecha_inicio=hoy_colombia(),
            fecha_fin=hoy_colombia() + timedelta(days=365),
        )
    )
    db_session.add(
        VentaPaquete(
            empresa_id=empresa_nueva.id,
            max_documentos=50,
            precio=90000,
            fecha_inicio=date(2025, 1, 1),
            fecha_fin=date(2025, 12, 31),
            creado=ahora - timedelta(days=90),
        )
    )
    db_session.commit()

    finanzas = DashboardService(db_session).obtener_kpis()["finanzas_mes"]
    settings = get_settings()

    assert finanzas["documentos_disponibles_inicio_mes"] == 99
    assert finanzas["documentos_vendidos_mes"] == 500
    assert finanzas["documentos_maximos_mes"] == 599
    assert finanzas["ingresos_paquetes"] == 300000
    assert [v["razon_social"] for v in finanzas["ventas"]] == ["Nueva SAS"]
    assert finanzas["costo_alegra"] == 120000
    assert finanzas["comision"] == 30000
    esperado = 300000 - 120000 - settings.costo_servidor_usd * settings.trm_usd_cop - 30000
    assert finanzas["ganancia"] == esperado


def test_finanzas_mes_sin_ventas_es_perdida_por_costos_fijos(db_session):
    finanzas = DashboardService(db_session).obtener_kpis()["finanzas_mes"]

    assert finanzas["ingresos_paquetes"] == 0
    assert finanzas["ventas"] == []
    assert finanzas["ganancia"] < 0


def test_finanzas_mes_usa_la_configuracion_guardada(db_session):
    from src.application.configuracion_service import ConfiguracionService
    from src.domain.configuracion import ConfiguracionNegocioRequest

    ConfiguracionService(db_session).guardar(
        ConfiguracionNegocioRequest(costo_servidor_usd=10, trm_usd_cop=3000, comision_paquetes_pct=20)
    )

    finanzas = DashboardService(db_session).obtener_kpis()["finanzas_mes"]

    assert finanzas["costo_servidor_cop"] == 30000
    assert finanzas["trm_usd_cop"] == 3000
    assert finanzas["comision_pct"] == 20
