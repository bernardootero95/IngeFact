import uuid
from dataclasses import dataclass
from datetime import date

from sqlalchemy import and_, exists, func, not_, select
from sqlalchemy.orm import Session

from src.domain.factura_recibida import ESTADOS_EVENTO_ACEPTADO
from src.domain.tenant_actividad import (
    ESTADO_BORRADOR,
    ESTADO_ENVIADA,
    ESTADO_RECHAZADA,
    LIMITE_ULTIMOS_DOCUMENTOS,
    TIPO_DOCUMENTO_SOPORTE,
    TIPO_FACTURA,
    TIPO_NOTA_CREDITO,
    TIPO_NOTA_DEBITO,
    AlertasDocumentos,
    DocumentoReciente,
    TenantActividadResponse,
    alerta_resolucion,
    normalizar_estado,
    variantes_estado,
)
from src.infrastructure.db.models import (
    Cliente,
    DocumentoSoporte,
    EventoReceptor,
    Factura,
    FacturaRecibida,
    NotaCredito,
    NotaDebito,
    Proveedor,
    ResolucionDian,
    ResolucionDocumentoSoporte,
)


@dataclass(frozen=True)
class _FuenteDocumento:
    tipo: str
    modelo: type
    tercero_modelo: type
    tercero_fk: str


FUENTES = (
    _FuenteDocumento(TIPO_FACTURA, Factura, Cliente, "cliente_id"),
    _FuenteDocumento(TIPO_NOTA_CREDITO, NotaCredito, Cliente, "cliente_id"),
    _FuenteDocumento(TIPO_NOTA_DEBITO, NotaDebito, Cliente, "cliente_id"),
    _FuenteDocumento(TIPO_DOCUMENTO_SOPORTE, DocumentoSoporte, Proveedor, "proveedor_id"),
)


class TenantActividadService:
    """Ultimos documentos emitidos y lo que requiere accion del usuario.
    Todo filtrado por empresa_id, que sale del JWT."""

    def __init__(self, db: Session):
        self.db = db

    def obtener(self, empresa_id: uuid.UUID, hoy: date) -> TenantActividadResponse:
        return TenantActividadResponse(
            ultimos_documentos=self._ultimos_documentos(empresa_id),
            alertas=AlertasDocumentos(
                rechazados=self._contar_por_estado(empresa_id, ESTADO_RECHAZADA),
                en_validacion=self._contar_por_estado(empresa_id, ESTADO_ENVIADA),
                borradores=self._contar_por_estado(empresa_id, ESTADO_BORRADOR),
                recibidas_sin_evento=self._recibidas_sin_evento(empresa_id),
                resoluciones=self._alertas_resolucion(empresa_id, hoy),
            ),
        )

    @staticmethod
    def _vigentes(modelo, empresa_id: uuid.UUID):
        return (modelo.empresa_id == empresa_id, modelo.eliminado.is_(None))

    def _ultimos_documentos(self, empresa_id: uuid.UUID) -> list[DocumentoReciente]:
        documentos: list[tuple] = []
        for fuente in FUENTES:
            m, t = fuente.modelo, fuente.tercero_modelo
            filas = self.db.execute(
                select(m.id, m.numero_completo, m.fecha, m.total, m.estado, m.creado, t.nombre)
                .outerjoin(t, t.id == getattr(m, fuente.tercero_fk))
                .where(*self._vigentes(m, empresa_id))
                .order_by(m.creado.desc())
                .limit(LIMITE_ULTIMOS_DOCUMENTOS)
            ).all()
            documentos.extend((fuente.tipo, *fila) for fila in filas)

        documentos.sort(key=lambda d: d[6], reverse=True)
        return [
            DocumentoReciente(
                tipo=tipo,
                id=str(id_),
                numero=numero,
                fecha=fecha,
                tercero=tercero,
                total=float(total),
                estado=normalizar_estado(estado),
            )
            for tipo, id_, numero, fecha, total, estado, _creado, tercero in documentos[:LIMITE_ULTIMOS_DOCUMENTOS]
        ]

    def _contar_por_estado(self, empresa_id: uuid.UUID, estado: str) -> dict[str, int]:
        conteo = {}
        for f in FUENTES:
            n = self.db.execute(
                select(func.count()).select_from(f.modelo).where(
                    *self._vigentes(f.modelo, empresa_id), f.modelo.estado.in_(variantes_estado(estado))
                )
            ).scalar_one()
            if n:
                conteo[f.tipo] = n
        return conteo

    def _recibidas_sin_evento(self, empresa_id: uuid.UUID) -> int:
        """Mismo criterio que ESTADO_SIN_EVENTO: ningun evento aceptado por la DIAN."""
        evento_aceptado = exists().where(
            and_(
                EventoReceptor.factura_recibida_id == FacturaRecibida.id,
                EventoReceptor.legal_status.in_(ESTADOS_EVENTO_ACEPTADO),
            )
        )
        return self.db.execute(
            select(func.count()).select_from(FacturaRecibida).where(
                *self._vigentes(FacturaRecibida, empresa_id), not_(evento_aceptado)
            )
        ).scalar_one()

    def _alertas_resolucion(self, empresa_id: uuid.UUID, hoy: date):
        alertas = []
        for tipo, modelo in ((TIPO_FACTURA, ResolucionDian), (TIPO_DOCUMENTO_SOPORTE, ResolucionDocumentoSoporte)):
            r = self.db.execute(select(modelo).where(modelo.empresa_id == empresa_id)).scalar_one_or_none()
            if r is None:
                continue
            alerta = alerta_resolucion(
                tipo, r.prefijo, r.rango_minimo, r.rango_maximo, r.consecutivo_actual, r.fecha_fin, hoy
            )
            if alerta:
                alertas.append(alerta)
        return alertas
