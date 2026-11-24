from datetime import date, datetime, timedelta, timezone

from src.application.tenant_actividad_service import TenantActividadService
from src.domain.tenant_actividad import alerta_resolucion
from src.infrastructure.db.models import (
    Cliente,
    DocumentoSoporte,
    Empresa,
    EventoReceptor,
    Factura,
    FacturaRecibida,
    NotaCredito,
    Proveedor,
    ResolucionDian,
    ResolucionDocumentoSoporte,
)

HOY = date(2026, 11, 23)
BASE = datetime(2026, 11, 1, 12, tzinfo=timezone.utc)


def _empresa(db, nit="900618467") -> Empresa:
    e = Empresa(
        razon_social="Empresa Demo SAS",
        numero_identificacion=nit,
        digito_verificacion="4",
        correo_electronico=f"{nit}@example.com",
        estado="activo",
    )
    db.add(e)
    db.commit()
    return e


def _cliente(db, empresa_id) -> Cliente:
    c = Cliente(
        empresa_id=empresa_id,
        tipo_identificacion="13",
        numero_identificacion="1000000000",
        nombre="Cliente Uno",
        correo_electronico="cliente@example.com",
    )
    db.add(c)
    db.commit()
    return c


def _proveedor(db, empresa_id) -> Proveedor:
    p = Proveedor(
        empresa_id=empresa_id,
        tipo_identificacion="31",
        numero_identificacion="1000000001",
        digito_verificacion="4",
        nombre="Proveedor Uno",
        correo_electronico="proveedor@example.com",
        tipo_organizacion="2",
        regimen="R-99-PN",
        direccion="Cra 1 # 2-3",
        departamento="11",
        municipio="11001",
    )
    db.add(p)
    db.commit()
    return p


def _factura(db, empresa_id, cliente_id, *, estado="aceptada", minutos=0, numero=None, eliminado=None) -> Factura:
    f = Factura(
        empresa_id=empresa_id,
        cliente_id=cliente_id,
        fecha=HOY,
        estado=estado,
        total=1000,
        numero_completo=numero,
        creado=BASE + timedelta(minutes=minutos),
        eliminado=eliminado,
    )
    db.add(f)
    db.commit()
    return f


def _recibida(db, empresa_id, cufe, eventos=()) -> FacturaRecibida:
    fr = FacturaRecibida(empresa_id=empresa_id, proveedor_nombre="Prov SAS", cufe=cufe, fecha=HOY)
    db.add(fr)
    db.commit()
    for i, (tipo, legal_status) in enumerate(eventos):
        db.add(
            EventoReceptor(
                factura_recibida_id=fr.id, tipo=tipo, numero=f"EV{i}", legal_status=legal_status, origen="ingefact"
            )
        )
    db.commit()
    return fr


# --- alerta_resolucion (pura) -------------------------------------------------


def test_resolucion_con_holgura_no_alerta():
    assert alerta_resolucion("factura", "SETP", 1, 1000, 100, date(2027, 6, 1), HOY) is None


def test_resolucion_por_agotarse_usa_el_10_por_ciento():
    alerta = alerta_resolucion("factura", "SETP", 1, 1000, 902, date(2027, 6, 1), HOY)
    assert alerta.restantes == 99
    assert alerta.agotada is False
    assert alerta_resolucion("factura", "SETP", 1, 1000, 900, date(2027, 6, 1), HOY) is None


def test_resolucion_chica_avisa_con_el_minimo_de_10():
    assert alerta_resolucion("factura", "SETP", 1, 50, 41, date(2027, 6, 1), HOY).restantes == 10
    assert alerta_resolucion("factura", "SETP", 1, 50, 40, date(2027, 6, 1), HOY) is None


def test_resolucion_agotada_y_vencida():
    agotada = alerta_resolucion("factura", "SETP", 1, 100, 101, date(2027, 6, 1), HOY)
    assert agotada.restantes == 0 and agotada.agotada is True
    vencida = alerta_resolucion("factura", "SETP", 1, 1000, 10, date(2026, 11, 1), HOY)
    assert vencida.vencida is True and vencida.dias_para_vencer == -22


def test_resolucion_por_vencer_en_30_dias():
    assert alerta_resolucion("factura", "SETP", 1, 1000, 10, date(2026, 12, 23), HOY).dias_para_vencer == 30
    assert alerta_resolucion("factura", "SETP", 1, 1000, 10, date(2026, 12, 24), HOY) is None


# --- servicio -----------------------------------------------------------------


def test_ultimos_documentos_mezcla_tipos_y_ordena_por_creacion(db_session):
    e = _empresa(db_session)
    c = _cliente(db_session, e.id)
    p = _proveedor(db_session, e.id)
    facturas = [_factura(db_session, e.id, c.id, minutos=i, numero=f"SETP{i}") for i in range(5)]
    db_session.add(
        NotaCredito(
            empresa_id=e.id,
            factura_id=facturas[0].id,
            cliente_id=c.id,
            fecha=HOY,
            motivo_codigo="1",
            estado="aceptada",
            total=500,
            numero_completo="NC1",
            creado=BASE + timedelta(minutes=10),
        )
    )
    db_session.add(
        DocumentoSoporte(
            empresa_id=e.id,
            proveedor_id=p.id,
            fecha=HOY,
            estado="rechazado",
            total=700,
            numero_completo="DS1",
            creado=BASE + timedelta(minutes=20),
        )
    )
    _factura(db_session, e.id, c.id, minutos=30, eliminado=datetime.now(timezone.utc))
    db_session.commit()

    actividad = TenantActividadService(db_session).obtener(e.id, HOY)

    assert [(d.tipo, d.numero) for d in actividad.ultimos_documentos] == [
        ("documento_soporte", "DS1"),
        ("nota_credito", "NC1"),
        ("factura", "SETP4"),
        ("factura", "SETP3"),
        ("factura", "SETP2"),
    ]
    assert actividad.ultimos_documentos[0].tercero == "Proveedor Uno"
    assert actividad.ultimos_documentos[1].tercero == "Cliente Uno"
    assert actividad.ultimos_documentos[0].total == 700
    assert actividad.ultimos_documentos[0].estado == "rechazada"


def test_alertas_cuentan_estados_en_todos_los_tipos(db_session):
    e = _empresa(db_session)
    c = _cliente(db_session, e.id)
    p = _proveedor(db_session, e.id)
    _factura(db_session, e.id, c.id, estado="rechazada")
    _factura(db_session, e.id, c.id, estado="enviada")
    _factura(db_session, e.id, c.id, estado="borrador")
    _factura(db_session, e.id, c.id, estado="borrador", eliminado=datetime.now(timezone.utc))
    db_session.add(DocumentoSoporte(empresa_id=e.id, proveedor_id=p.id, fecha=HOY, estado="rechazado", total=1))
    db_session.commit()

    alertas = TenantActividadService(db_session).obtener(e.id, HOY).alertas

    assert alertas.rechazados == {"factura": 1, "documento_soporte": 1}
    assert alertas.en_validacion == {"factura": 1}
    assert alertas.borradores == {"factura": 1}


def test_recibidas_sin_evento_ignora_eventos_rechazados(db_session):
    e = _empresa(db_session)
    _recibida(db_session, e.id, "cufe-1")
    _recibida(db_session, e.id, "cufe-2", eventos=[("030", "REJECTED")])
    _recibida(db_session, e.id, "cufe-3", eventos=[("030", "ACCEPTED")])

    alertas = TenantActividadService(db_session).obtener(e.id, HOY).alertas

    assert alertas.recibidas_sin_evento == 2


def test_alertas_de_resolucion_de_factura_y_documento_soporte(db_session):
    e = _empresa(db_session)
    db_session.add(
        ResolucionDian(
            empresa_id=e.id,
            numero_resolucion="187",
            prefijo="SETP",
            rango_minimo=1,
            rango_maximo=100,
            fecha_inicio=date(2026, 1, 1),
            fecha_fin=date(2027, 1, 1),
            technical_key="x",
            consecutivo_actual=95,
        )
    )
    db_session.add(
        ResolucionDocumentoSoporte(
            empresa_id=e.id,
            numero_resolucion="188",
            prefijo="DS",
            rango_minimo=1,
            rango_maximo=1000,
            fecha_inicio=date(2026, 1, 1),
            fecha_fin=date(2028, 1, 1),
            consecutivo_actual=5,
        )
    )
    db_session.commit()

    resoluciones = TenantActividadService(db_session).obtener(e.id, HOY).alertas.resoluciones

    assert [(r.tipo, r.prefijo, r.restantes) for r in resoluciones] == [("factura", "SETP", 6)]


def test_no_mezcla_datos_de_otra_empresa(db_session):
    a = _empresa(db_session, nit="900618467")
    b = _empresa(db_session, nit="900618468")
    c = _cliente(db_session, a.id)
    _factura(db_session, a.id, c.id, estado="rechazada")
    _recibida(db_session, a.id, "cufe-a")

    actividad = TenantActividadService(db_session).obtener(b.id, HOY)

    assert actividad.ultimos_documentos == []
    assert actividad.alertas.rechazados == {}
    assert actividad.alertas.recibidas_sin_evento == 0
    assert actividad.alertas.resoluciones == []
