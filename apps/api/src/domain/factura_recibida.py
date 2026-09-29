from datetime import date, datetime

from pydantic import BaseModel, field_validator, model_validator

from src.core.factura_ubl_parser import FORMA_PAGO_LABELS

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
TIPO_ACUSE = "030"
TIPO_RECLAMO = "031"
TIPO_RECIBO_BIEN = "032"
TIPO_ACEPTACION_EXPRESA = "033"
TIPO_ACEPTACION_TACITA = "034"

# legal_status que devuelve la DIAN (via Alegra) para un evento valido.
ESTADOS_EVENTO_ACEPTADO = ("ACCEPTED", "ACCEPTED_WITH_OBSERVATIONS")

# Estado de la factura segun los eventos que la DIAN ya acepto. Orden RADIAN
# (Res. 000085/2022): acuse (030) -> recibo del bien (032) -> aceptacion
# (033) o reclamo (031). La aceptacion tacita (034) la registra el emisor, no
# el receptor, pero si llega a existir cuenta como aceptada.
ESTADO_SIN_EVENTO = "sin_evento"
ESTADO_FACTURA_RECIBIDA = "factura_recibida"
ESTADO_MERCANCIA_RECIBIDA = "mercancia_recibida"
ESTADO_ACEPTADA = "aceptada"
ESTADO_RECHAZADA = "rechazada"

ESTADO_LABELS = {
    ESTADO_SIN_EVENTO: "Sin evento",
    ESTADO_FACTURA_RECIBIDA: "Factura recibida",
    ESTADO_MERCANCIA_RECIBIDA: "Mercancía recibida",
    ESTADO_ACEPTADA: "Factura aceptada",
    ESTADO_RECHAZADA: "Factura rechazada",
}

EVENTOS_PERMITIDOS_POR_ESTADO = {
    ESTADO_SIN_EVENTO: (TIPO_ACUSE,),
    ESTADO_FACTURA_RECIBIDA: (TIPO_RECIBO_BIEN,),
    ESTADO_MERCANCIA_RECIBIDA: (TIPO_ACEPTACION_EXPRESA, TIPO_RECLAMO),
    ESTADO_ACEPTADA: (),
    ESTADO_RECHAZADA: (),
}


def calcular_estado(eventos) -> str:
    """Solo cuentan los eventos que la DIAN acepto: uno rechazado no avanza
    el flujo y el usuario puede volver a intentarlo."""
    aceptados = {e.tipo for e in eventos if e.legal_status in ESTADOS_EVENTO_ACEPTADO}
    if aceptados & {TIPO_ACEPTACION_EXPRESA, TIPO_ACEPTACION_TACITA}:
        return ESTADO_ACEPTADA
    if TIPO_RECLAMO in aceptados:
        return ESTADO_RECHAZADA
    if TIPO_RECIBO_BIEN in aceptados:
        return ESTADO_MERCANCIA_RECIBIDA
    if TIPO_ACUSE in aceptados:
        return ESTADO_FACTURA_RECIBIDA
    return ESTADO_SIN_EVENTO


def eventos_permitidos(eventos) -> tuple[str, ...]:
    return EVENTOS_PERMITIDOS_POR_ESTADO[calcular_estado(eventos)]


def _normalizar_cufe(v: str) -> str:
    v = v.strip()
    if not v:
        raise ValueError("El CUFE es obligatorio.")
    if len(v) > 200:
        raise ValueError("El CUFE no puede tener más de 200 caracteres.")
    return v


class CrearFacturaRecibidaRequest(BaseModel):
    """Solo el CUFE: el resto de datos (proveedor, numero, fechas, forma de
    pago, total) se leen del XML que la DIAN tiene de esa factura -- nunca de
    lo que mande el cliente."""

    cufe: str

    @field_validator("cufe")
    @classmethod
    def cufe_valido(cls, v: str) -> str:
        return _normalizar_cufe(v)


class ConsultaFacturaRecibidaResponse(BaseModel):
    """Resumen previo a registrar: lo que el usuario ve tras escribir el CUFE."""

    cufe: str
    numero: str
    proveedor_nombre: str
    proveedor_nit: str
    fecha: date
    fecha_vencimiento: date | None
    forma_pago: str | None
    forma_pago_label: str
    total: float
    puede_registrar: bool
    motivo_bloqueo: str | None


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


def _campos_comunes(factura_recibida) -> dict:
    estado = calcular_estado(factura_recibida.eventos)
    ultimo = factura_recibida.eventos[-1] if factura_recibida.eventos else None
    return {
        "id": str(factura_recibida.id),
        "cufe": factura_recibida.cufe,
        "numero": factura_recibida.numero_documento_proveedor,
        "proveedor_nombre": factura_recibida.proveedor_nombre,
        "proveedor_nit": factura_recibida.proveedor_nit,
        "fecha": factura_recibida.fecha,
        "fecha_vencimiento": factura_recibida.fecha_vencimiento,
        "forma_pago_label": FORMA_PAGO_LABELS.get(factura_recibida.forma_pago or "", "Sin dato"),
        "total": float(factura_recibida.monto_total) if factura_recibida.monto_total is not None else None,
        "estado": estado,
        "estado_label": ESTADO_LABELS[estado],
        "eventos_permitidos": list(EVENTOS_PERMITIDOS_POR_ESTADO[estado]),
        # Un evento REJECTED no cambia el estado; se muestra para que el
        # usuario sepa por que su ultimo intento no avanzo.
        "ultimo_evento_rechazado": (
            ultimo is not None and ultimo.legal_status not in ESTADOS_EVENTO_ACEPTADO
        ),
    }


class FacturaRecibidaListItemResponse(BaseModel):
    id: str
    cufe: str
    numero: str | None
    proveedor_nombre: str
    proveedor_nit: str | None
    fecha: date
    fecha_vencimiento: date | None
    forma_pago_label: str
    total: float | None
    estado: str
    estado_label: str
    eventos_permitidos: list[str]
    ultimo_evento_rechazado: bool

    @staticmethod
    def from_model(factura_recibida) -> "FacturaRecibidaListItemResponse":
        return FacturaRecibidaListItemResponse(**_campos_comunes(factura_recibida))


class FacturaRecibidaResponse(FacturaRecibidaListItemResponse):
    observaciones: str | None
    creado: datetime
    eventos: list[EventoReceptorResponse]

    @staticmethod
    def from_model(factura_recibida) -> "FacturaRecibidaResponse":
        return FacturaRecibidaResponse(
            **_campos_comunes(factura_recibida),
            observaciones=factura_recibida.observaciones,
            creado=factura_recibida.creado,
            eventos=[EventoReceptorResponse.from_model(e) for e in factura_recibida.eventos],
        )


class XmlFacturaRecibidaResponse(BaseModel):
    nombre_archivo: str
    contenido_base64: str
