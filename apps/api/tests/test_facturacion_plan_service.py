from datetime import date

from src.application.configuracion_service import ConfiguracionService
from src.application.empresa_admin_service import EmpresaAdminService
from src.application.facturacion_plan_service import SIN_CORREO, SIN_FACTURADORA, FacturacionPlanService
from src.core.alegra_client import AlegraApiError
from src.domain.configuracion import ConfiguracionNegocioRequest
from src.domain.empresa import CambiarPlanRequest
from src.domain.facturacion_plan import (
    CODIGO_PRODUCTO_PAQUETE,
    ESTADO_EMITIDA,
    ESTADO_ERROR,
    ESTADO_SIN_FACTURA,
    VentaPaqueteResponse,
    descripcion_paquete,
)
from src.infrastructure.db.models import Cliente, Empresa, Factura, Producto, ResolucionDian, Suscripcion
from tests.conftest import HabilitadaEnDianMixin

NIT_FACTURADORA = "1083000777"


class _FakeAlegra(HabilitadaEnDianMixin):
    def __init__(self, error: AlegraApiError | None = None):
        self.error = error
        self.payloads = []

    def create_invoice(self, payload: dict) -> dict:
        self.payloads.append(payload)
        if self.error:
            raise self.error
        return {
            "invoice": {
                "id": f"inv-{len(self.payloads)}",
                "fullNumber": f"FE{len(self.payloads)}",
                "cufe": "cufe-123",
                "governmentResponse": {"statusCode": "00"},
                "legalStatus": "ACCEPTED",
            }
        }


def _empresa(db, nit, dv, **extra) -> Empresa:
    data = {
        "razon_social": f"Empresa {nit}",
        "numero_identificacion": nit,
        "digito_verificacion": dv,
        "correo_electronico": f"{nit}@example.com",
        "estado": "activo",
        "id_alegra": f"alegra-{nit}",
    }
    data.update(extra)
    empresa = Empresa(**data)
    db.add(empresa)
    db.commit()
    db.refresh(empresa)
    return empresa


def _facturadora(db) -> Empresa:
    """Empresa del titular con resolucion y plan vigentes para poder emitir."""
    empresa = _empresa(db, NIT_FACTURADORA, "7", tipo_identificacion="13")
    db.add(
        ResolucionDian(
            empresa_id=empresa.id,
            numero_resolucion="18760000001",
            prefijo="FE",
            rango_minimo=1,
            rango_maximo=1000,
            fecha_inicio=date(2026, 1, 1),
            fecha_fin=date(2030, 1, 1),
            technical_key="fc8eac422eba16e22ffd8c6f94b3f40a6e38162c",
            consecutivo_actual=1,
        )
    )
    db.add(
        Suscripcion(
            empresa_id=empresa.id,
            max_documentos=1000,
            fecha_inicio=date(2026, 1, 1),
            fecha_fin=date(2030, 1, 1),
            estado="activa",
        )
    )
    db.commit()
    return empresa


def _vender(db, comprador, precio=300000, max_documentos=1200):
    _, venta = EmpresaAdminService(db).registrar_plan(
        comprador.id,
        CambiarPlanRequest(max_documentos=max_documentos, fecha_inicio=date(2026, 11, 1), fecha_fin=date(2027, 10, 31), precio=precio),
    )
    return venta


def test_registrar_plan_devuelve_la_venta_solo_si_es_venta(db_session):
    comprador = _empresa(db_session, "900618467", "4")
    data = CambiarPlanRequest(max_documentos=100, fecha_inicio=date(2026, 1, 1), fecha_fin=date(2026, 12, 31))
    service = EmpresaAdminService(db_session)

    _, venta = service.registrar_plan(comprador.id, data)
    assert venta is not None

    extender = CambiarPlanRequest(max_documentos=100, fecha_inicio=date(2026, 1, 1), fecha_fin=date(2027, 6, 30))
    _, sin_venta = service.registrar_plan(comprador.id, extender)
    assert sin_venta is None


def test_facturar_emite_factura_de_contado_a_la_empresa_compradora(db_session):
    facturadora = _facturadora(db_session)
    comprador = _empresa(db_session, "900618467", "4")
    alegra = _FakeAlegra()

    venta = FacturacionPlanService(db_session, alegra).facturar(_vender(db_session, comprador))

    assert venta.factura_error is None
    factura = db_session.get(Factura, venta.factura_id)
    assert factura.empresa_id == facturadora.id
    assert factura.estado == "aceptada"
    assert float(factura.total) == 300000
    assert factura.forma_pago == "1"
    assert factura.metodo_pago == "47"
    cliente = db_session.get(Cliente, factura.cliente_id)
    assert cliente.numero_identificacion == comprador.numero_identificacion
    assert cliente.digito_verificacion == "4"
    assert cliente.correo_electronico == comprador.correo_electronico
    producto = db_session.query(Producto).filter_by(empresa_id=facturadora.id, codigo=CODIGO_PRODUCTO_PAQUETE).one()
    assert float(producto.tarifa_impuesto) == 0
    assert factura.lineas[0].descripcion == descripcion_paquete(1200, date(2026, 11, 1), date(2027, 10, 31))
    assert VentaPaqueteResponse.from_model(venta, factura).factura.estado == ESTADO_EMITIDA


def test_segunda_venta_reutiliza_el_cliente(db_session):
    _facturadora(db_session)
    comprador = _empresa(db_session, "900618467", "4")
    service = FacturacionPlanService(db_session, _FakeAlegra())

    service.facturar(_vender(db_session, comprador))
    service.facturar(_vender(db_session, comprador, precio=500000, max_documentos=5000))

    assert db_session.query(Cliente).filter_by(numero_identificacion=comprador.numero_identificacion).count() == 1


def test_si_alegra_rechaza_guarda_el_error_y_el_reintento_reusa_el_borrador(db_session):
    _facturadora(db_session)
    comprador = _empresa(db_session, "900618467", "4")
    alegra = _FakeAlegra(error=AlegraApiError(400, {"message": "Dato invalido"}))
    service = FacturacionPlanService(db_session, alegra)

    venta = service.facturar(_vender(db_session, comprador))

    assert venta.factura_error
    factura = db_session.get(Factura, venta.factura_id)
    assert factura.estado == "borrador"
    assert VentaPaqueteResponse.from_model(venta, factura).factura.estado == ESTADO_ERROR
    # El plan queda guardado igual.
    assert db_session.query(Suscripcion).filter_by(empresa_id=comprador.id, estado="activa").count() == 1

    alegra.error = None
    venta = service.facturar(venta)

    assert venta.factura_error is None
    assert db_session.get(Factura, venta.factura_id).estado == "aceptada"
    assert db_session.query(Factura).filter_by(cliente_id=factura.cliente_id).count() == 1


def test_reintentar_una_venta_ya_facturada_no_emite_otra(db_session):
    _facturadora(db_session)
    comprador = _empresa(db_session, "900618467", "4")
    alegra = _FakeAlegra()
    service = FacturacionPlanService(db_session, alegra)
    venta = service.facturar(_vender(db_session, comprador))

    service.facturar(venta)

    assert len(alegra.payloads) == 1


def test_sin_empresa_facturadora_deja_el_motivo(db_session):
    comprador = _empresa(db_session, "900618467", "4")

    venta = FacturacionPlanService(db_session, _FakeAlegra()).facturar(_vender(db_session, comprador))

    assert venta.factura_error == SIN_FACTURADORA
    assert venta.factura_id is None


def test_empresa_sin_correo_no_se_factura(db_session):
    _facturadora(db_session)
    comprador = _empresa(db_session, "900618467", "4", correo_electronico=None)

    venta = FacturacionPlanService(db_session, _FakeAlegra()).facturar(_vender(db_session, comprador))

    assert venta.factura_error == SIN_CORREO


def test_la_facturadora_no_se_factura_a_si_misma(db_session):
    facturadora = _facturadora(db_session)
    alegra = _FakeAlegra()

    venta = FacturacionPlanService(db_session, alegra).facturar(_vender(db_session, facturadora))

    assert alegra.payloads == []
    assert VentaPaqueteResponse.from_model(venta, None).factura.estado == ESTADO_SIN_FACTURA


def test_la_facturadora_se_puede_cambiar_en_configuracion(db_session):
    _facturadora(db_session)
    otra = _empresa(db_session, "900559088", "2")
    service = ConfiguracionService(db_session)
    assert service.empresa_facturadora().numero_identificacion == NIT_FACTURADORA

    resultado = service.guardar(
        ConfiguracionNegocioRequest(
            costo_servidor_usd=8, trm_usd_cop=3200, comision_paquetes_pct=10, empresa_facturadora_id=otra.id
        )
    )

    assert resultado["empresa_facturadora_id"] == str(otra.id)
    assert service.empresa_facturadora().id == otra.id
