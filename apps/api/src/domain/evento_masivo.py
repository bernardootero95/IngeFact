import uuid
from datetime import date

from pydantic import BaseModel, field_validator, model_validator

from src.domain.factura_recibida import (
    TIPO_ACEPTACION_EXPRESA,
    TIPO_ACUSE,
    TIPO_RECIBO_BIEN,
    TIPO_RECLAMO,
    CrearEventoReceptorRequest,
    GeneradorEventoRequest,
)

# La aceptacion tacita (034) la registra el emisor, no el receptor.
TIPOS_EVENTO_MASIVO = (TIPO_ACUSE, TIPO_RECIBO_BIEN, TIPO_ACEPTACION_EXPRESA, TIPO_RECLAMO)
CLAIM_CODES = ("01", "02", "03", "04")

# Tope de facturas por aplicacion en bloque; el cliente las envia en tandas
# de hasta MAX_FACTURAS_POR_ENVIO para mostrar el avance (mismo criterio que
# la carga masiva de facturas).
MAX_FACTURAS_EVENTO_MASIVO = 200
MAX_FACTURAS_POR_ENVIO = 20

RESULTADO_EVENTO_ACEPTADO = "aceptado"
RESULTADO_EVENTO_FALLIDO = "fallido"

MOTIVO_YA_NO_APLICA = "La factura ya no cumple los criterios o el evento ya no se le puede aplicar."
MOTIVO_RECHAZO_GENERICO = "La DIAN rechazó el evento."


def normalizar_nit(valor: str | None) -> str | None:
    """Acepta el NIT con puntos, espacios o digito de verificacion
    ("800.123.456-7") y lo deja como lo guarda el XML de la DIAN: solo el
    numero, sin DV."""
    if valor is None:
        return None
    valor = valor.strip().split("-")[0].replace(".", "").replace(" ", "")
    if not valor:
        return None
    if not valor.isdigit() or not 5 <= len(valor) <= 15:
        raise ValueError("El NIT del proveedor debe tener solo números (entre 5 y 15 dígitos).")
    return valor


class CriteriosEventoMasivoRequest(BaseModel):
    """Que facturas recibidas entran en el bloque: rango por fecha de
    emision, proveedor opcional y el evento que se les quiere aplicar."""

    fecha_desde: date
    fecha_hasta: date
    proveedor_nit: str | None = None
    tipo: str

    @field_validator("proveedor_nit")
    @classmethod
    def nit_valido(cls, v: str | None) -> str | None:
        return normalizar_nit(v)

    @field_validator("tipo")
    @classmethod
    def tipo_valido(cls, v: str) -> str:
        if v not in TIPOS_EVENTO_MASIVO:
            raise ValueError("Ese evento no se puede aplicar en bloque.")
        return v

    @model_validator(mode="after")
    def rango_valido(self) -> "CriteriosEventoMasivoRequest":
        if self.fecha_hasta < self.fecha_desde:
            raise ValueError("La fecha final no puede ser anterior a la inicial.")
        return self


class EmitirEventoMasivoRequest(CriteriosEventoMasivoRequest):
    """Una tanda del envio. Se repiten los criterios para que el backend
    confirme que cada factura todavia los cumple; nunca se confia solo en la
    lista de ids que manda el cliente."""

    factura_ids: list[uuid.UUID]
    generador: GeneradorEventoRequest
    claim_code: str | None = None
    notas: str | None = None

    @field_validator("factura_ids")
    @classmethod
    def ids_validos(cls, v: list[uuid.UUID]) -> list[uuid.UUID]:
        if not v:
            raise ValueError("Envía al menos una factura.")
        if len(v) > MAX_FACTURAS_POR_ENVIO:
            raise ValueError(f"Envía como máximo {MAX_FACTURAS_POR_ENVIO} facturas por tanda.")
        return list(dict.fromkeys(v))

    @model_validator(mode="after")
    def reclamo_con_motivo(self) -> "EmitirEventoMasivoRequest":
        if self.tipo == TIPO_RECLAMO and self.claim_code not in CLAIM_CODES:
            raise ValueError("Selecciona el motivo del reclamo.")
        return self

    def evento(self) -> CrearEventoReceptorRequest:
        return CrearEventoReceptorRequest(
            tipo=self.tipo,
            claim_code=self.claim_code if self.tipo == TIPO_RECLAMO else None,
            notas=self.notas if self.tipo == TIPO_RECLAMO else None,
            generador=self.generador,
        )


class FacturaEventoMasivoResponse(BaseModel):
    id: str
    numero: str | None
    proveedor_nombre: str
    proveedor_nit: str | None
    fecha: date
    total: float | None

    @staticmethod
    def from_model(factura) -> "FacturaEventoMasivoResponse":
        return FacturaEventoMasivoResponse(
            id=str(factura.id),
            numero=factura.numero_documento_proveedor,
            proveedor_nombre=factura.proveedor_nombre,
            proveedor_nit=factura.proveedor_nit,
            fecha=factura.fecha,
            total=float(factura.monto_total) if factura.monto_total is not None else None,
        )


class ValidacionEventoMasivoResponse(BaseModel):
    cantidad: int
    facturas: list[FacturaEventoMasivoResponse]
    maximo: int
    documentos_necesarios: int
    documentos_disponibles: int
    # Motivo por el que no se puede emitir (cupo o tope); None si se puede.
    bloqueo: str | None


class ResultadoEventoMasivoResponse(BaseModel):
    factura_id: str
    numero: str | None
    proveedor_nombre: str | None
    resultado: str
    mensaje: str | None
