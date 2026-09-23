from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, field_validator, model_validator


class GuardarNominaRequest(BaseModel):
    """`devengados`/`deducciones` viajan tal cual el schema de Alegra (ver
    docs/alegra-investigacion.md, seccion "Nomina Electronica") -- no se
    tipa cada uno de los ~30 bloques posibles en Pydantic, solo se valida
    que los obligatorios legales esten presentes (Basico, Salud,
    FondoPension); el resto lo valida Alegra al enviar y el error se mapea,
    mismo criterio ya usado para `taxPercentage`/`totalAmounts` en
    Factura."""

    empleado_id: str
    periodo_nomina: str
    fecha_liquidacion_inicio: date
    fecha_liquidacion_fin: date
    fecha_pago: list[date]
    forma_pago: str
    metodo_pago: str
    banco: str | None = None
    tipo_cuenta: str | None = None
    numero_cuenta: str | None = None
    devengados: dict[str, Any]
    deducciones: dict[str, Any]
    devengados_total: float
    deducciones_total: float
    comprobante_total: float
    notas: str | None = None

    @field_validator("periodo_nomina", "forma_pago", "metodo_pago")
    @classmethod
    def obligatorio(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Este campo es obligatorio.")
        return v

    @field_validator("fecha_pago")
    @classmethod
    def al_menos_una_fecha_pago(cls, v: list[date]) -> list[date]:
        if not v:
            raise ValueError("Debes indicar al menos una fecha de pago.")
        return v

    @field_validator("devengados")
    @classmethod
    def basico_obligatorio(cls, v: dict) -> dict:
        basico = v.get("Basico") if v else None
        if not basico or basico.get("DiasTrabajados") is None or basico.get("SueldoTrabajado") is None:
            raise ValueError("Devengados.Basico (DiasTrabajados y SueldoTrabajado) es obligatorio.")
        return v

    @field_validator("deducciones")
    @classmethod
    def salud_pension_obligatorias(cls, v: dict) -> dict:
        for concepto in ("Salud", "FondoPension"):
            bloque = v.get(concepto) if v else None
            if not bloque or bloque.get("Deduccion") is None:
                raise ValueError(f"Deducciones.{concepto} es obligatorio por ley.")
        return v

    @model_validator(mode="after")
    def fechas_coherentes(self) -> "GuardarNominaRequest":
        if self.fecha_liquidacion_fin < self.fecha_liquidacion_inicio:
            raise ValueError("La fecha fin de liquidacion no puede ser anterior a la fecha inicio.")
        return self


class NominaResponse(BaseModel):
    id: str
    empleado_id: str
    empleado_nombre: str
    periodo_nomina: str
    fecha_liquidacion_inicio: date
    fecha_liquidacion_fin: date
    fecha_pago: list[date]
    forma_pago: str
    metodo_pago: str
    banco: str | None
    tipo_cuenta: str | None
    numero_cuenta: str | None
    devengados: dict[str, Any]
    deducciones: dict[str, Any]
    devengados_total: float
    deducciones_total: float
    comprobante_total: float
    notas: str | None
    consecutivo: int | None
    numero_completo: str | None
    estado: str
    cune: str | None
    razon_rechazo: str | None
    notificaciones_dian: list | None
    fecha_envio: datetime | None
    fecha_respuesta: datetime | None
    creado: datetime

    @staticmethod
    def from_model(nomina) -> "NominaResponse":
        empleado = nomina.empleado
        nombre = " ".join(
            filter(None, [empleado.primer_nombre, empleado.otros_nombres, empleado.primer_apellido, empleado.segundo_apellido])
        )
        return NominaResponse(
            id=str(nomina.id),
            empleado_id=str(nomina.empleado_id),
            empleado_nombre=nombre,
            periodo_nomina=nomina.periodo_nomina,
            fecha_liquidacion_inicio=nomina.fecha_liquidacion_inicio,
            fecha_liquidacion_fin=nomina.fecha_liquidacion_fin,
            fecha_pago=nomina.fecha_pago,
            forma_pago=nomina.forma_pago,
            metodo_pago=nomina.metodo_pago,
            banco=nomina.banco,
            tipo_cuenta=nomina.tipo_cuenta,
            numero_cuenta=nomina.numero_cuenta,
            devengados=nomina.devengados,
            deducciones=nomina.deducciones,
            devengados_total=float(nomina.devengados_total),
            deducciones_total=float(nomina.deducciones_total),
            comprobante_total=float(nomina.comprobante_total),
            notas=nomina.notas,
            consecutivo=nomina.consecutivo,
            numero_completo=nomina.numero_completo,
            estado=nomina.estado,
            cune=nomina.cune,
            razon_rechazo=nomina.razon_rechazo,
            notificaciones_dian=nomina.notificaciones_dian,
            fecha_envio=nomina.fecha_envio,
            fecha_respuesta=nomina.fecha_respuesta,
            creado=nomina.creado,
        )
