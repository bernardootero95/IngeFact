import uuid
from datetime import date, datetime

from pydantic import BaseModel, field_validator, model_validator

TIPOS_EVENTO_RECEPTOR = ("030", "031", "032", "033", "034")

TIPO_EVENTO_LABELS = {
    "030": "Acuse de recibo",
    "031": "Reclamo",
    "032": "Recibo del bien o servicio",
    "033": "Aceptación expresa",
    "034": "Aceptación tácita",
}

# Verificado contra el sandbox real (Fase 4, ver docs/alegra-investigacion.md):
# issuerParty (aqui "generador") solo es obligatorio para 030 y 032.
TIPOS_QUE_REQUIEREN_GENERADOR = ("030", "032")
TIPO_RECLAMO = "031"


class CrearFacturaRecibidaRequest(BaseModel):
    proveedor_id: uuid.UUID
    cufe: str
    numero_documento_proveedor: str | None = None
    fecha: date
    monto_total: float | None = None
    observaciones: str | None = None

    @field_validator("cufe")
    @classmethod
    def cufe_no_vacio(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El CUFE es obligatorio.")
        return v

    @field_validator("numero_documento_proveedor", "observaciones")
    @classmethod
    def normalizar_opcional(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        return v or None

    @field_validator("monto_total")
    @classmethod
    def monto_no_negativo(cls, v: float | None) -> float | None:
        if v is not None and v < 0:
            raise ValueError("El monto total no puede ser negativo.")
        return v


class GeneradorEventoRequest(BaseModel):
    """Quien firma el evento (issuerParty en la API de Alegra) -- solo se
    usa cuando el tipo de evento lo exige (030/032)."""

    tipo_identificacion: str
    numero_identificacion: str
    dv: str | None = None
    nombres: str
    apellidos: str
    cargo: str | None = None


class CrearEventoReceptorRequest(BaseModel):
    tipo: str
    claim_code: str | None = None
    notas: str | None = None
    generador: GeneradorEventoRequest | None = None

    @field_validator("tipo")
    @classmethod
    def tipo_valido(cls, v: str) -> str:
        if v not in TIPOS_EVENTO_RECEPTOR:
            raise ValueError(f"El tipo de evento debe ser uno de {TIPOS_EVENTO_RECEPTOR}.")
        return v

    @field_validator("notas")
    @classmethod
    def normalizar_notas(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        return v or None

    @model_validator(mode="after")
    def validar_campos_condicionales(self) -> "CrearEventoReceptorRequest":
        if self.tipo in TIPOS_QUE_REQUIEREN_GENERADOR and self.generador is None:
            raise ValueError(
                f"El evento {TIPO_EVENTO_LABELS[self.tipo]} requiere los datos de quien lo registra."
            )
        if self.tipo == TIPO_RECLAMO:
            if not self.claim_code or not self.claim_code.strip():
                raise ValueError("El motivo del reclamo es obligatorio.")
        return self


class EventoReceptorResponse(BaseModel):
    id: str
    tipo: str
    tipo_label: str
    numero: str
    legal_status: str | None
    cude: str | None
    claim_code: str | None
    notas: str | None
    generador_nombres: str | None
    generador_apellidos: str | None
    razon_rechazo: str | None
    notificaciones_dian: list | None
    creado: datetime

    @staticmethod
    def from_model(evento) -> "EventoReceptorResponse":
        return EventoReceptorResponse(
            id=str(evento.id),
            tipo=evento.tipo,
            tipo_label=TIPO_EVENTO_LABELS.get(evento.tipo, evento.tipo),
            numero=evento.numero,
            legal_status=evento.legal_status,
            cude=evento.cude,
            claim_code=evento.claim_code,
            notas=evento.notas,
            generador_nombres=evento.generador_nombres,
            generador_apellidos=evento.generador_apellidos,
            razon_rechazo=evento.razon_rechazo,
            notificaciones_dian=evento.notificaciones_dian,
            creado=evento.creado,
        )


class FacturaRecibidaResponse(BaseModel):
    id: str
    proveedor_id: str
    proveedor_nombre: str
    cufe: str
    numero_documento_proveedor: str | None
    fecha: date
    monto_total: float | None
    observaciones: str | None
    creado: datetime
    eventos: list[EventoReceptorResponse]

    @staticmethod
    def from_model(factura_recibida) -> "FacturaRecibidaResponse":
        return FacturaRecibidaResponse(
            id=str(factura_recibida.id),
            proveedor_id=str(factura_recibida.proveedor_id),
            proveedor_nombre=factura_recibida.proveedor.nombre,
            cufe=factura_recibida.cufe,
            numero_documento_proveedor=factura_recibida.numero_documento_proveedor,
            fecha=factura_recibida.fecha,
            monto_total=float(factura_recibida.monto_total) if factura_recibida.monto_total is not None else None,
            observaciones=factura_recibida.observaciones,
            creado=factura_recibida.creado,
            eventos=[EventoReceptorResponse.from_model(e) for e in factura_recibida.eventos],
        )


class FacturaRecibidaListItemResponse(BaseModel):
    """Version liviana para el listado -- sin eventos completos, solo un
    resumen del ultimo evento registrado (si hay alguno)."""

    id: str
    proveedor_nombre: str
    cufe: str
    numero_documento_proveedor: str | None
    fecha: date
    monto_total: float | None
    ultimo_evento_tipo_label: str | None
    ultimo_evento_legal_status: str | None

    @staticmethod
    def from_model(factura_recibida) -> "FacturaRecibidaListItemResponse":
        ultimo = factura_recibida.eventos[-1] if factura_recibida.eventos else None
        return FacturaRecibidaListItemResponse(
            id=str(factura_recibida.id),
            proveedor_nombre=factura_recibida.proveedor.nombre,
            cufe=factura_recibida.cufe,
            numero_documento_proveedor=factura_recibida.numero_documento_proveedor,
            fecha=factura_recibida.fecha,
            monto_total=float(factura_recibida.monto_total) if factura_recibida.monto_total is not None else None,
            ultimo_evento_tipo_label=TIPO_EVENTO_LABELS.get(ultimo.tipo, ultimo.tipo) if ultimo else None,
            ultimo_evento_legal_status=ultimo.legal_status if ultimo else None,
        )
