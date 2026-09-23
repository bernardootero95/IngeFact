from datetime import date, datetime

from pydantic import BaseModel, field_validator, model_validator


class EmpleadoRequestBase(BaseModel):
    tipo_documento: str
    numero_documento: str
    primer_apellido: str
    segundo_apellido: str | None = None
    primer_nombre: str
    otros_nombres: str | None = None

    tipo_trabajador: str
    subtipo_trabajador: str
    alto_riesgo_pension: bool = False
    salario_integral: bool = False
    tipo_contrato: str
    sueldo: float
    codigo_trabajador: str | None = None

    lugar_trabajo_pais: str = "CO"
    lugar_trabajo_municipio: str
    lugar_trabajo_direccion: str

    banco: str | None = None
    tipo_cuenta: str | None = None
    numero_cuenta: str | None = None

    correo_electronico: str | None = None
    telefono: str | None = None

    fecha_ingreso: date
    fecha_retiro: date | None = None

    @field_validator(
        "tipo_documento",
        "numero_documento",
        "primer_apellido",
        "primer_nombre",
        "tipo_trabajador",
        "subtipo_trabajador",
        "tipo_contrato",
        "lugar_trabajo_municipio",
        "lugar_trabajo_direccion",
    )
    @classmethod
    def obligatorio(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Este campo es obligatorio.")
        return v

    @field_validator(
        "segundo_apellido",
        "otros_nombres",
        "codigo_trabajador",
        "banco",
        "tipo_cuenta",
        "numero_cuenta",
        "correo_electronico",
        "telefono",
    )
    @classmethod
    def normalizar_opcional(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        return v or None

    @field_validator("sueldo")
    @classmethod
    def sueldo_positivo(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("El sueldo debe ser mayor a 0.")
        return v

    @model_validator(mode="after")
    def fecha_retiro_no_antes_de_ingreso(self) -> "EmpleadoRequestBase":
        if self.fecha_retiro is not None and self.fecha_retiro < self.fecha_ingreso:
            raise ValueError("La fecha de retiro no puede ser anterior a la fecha de ingreso.")
        return self


class CrearEmpleadoRequest(EmpleadoRequestBase):
    pass


class ActualizarEmpleadoRequest(EmpleadoRequestBase):
    pass


class EmpleadoResponse(BaseModel):
    id: str
    tipo_documento: str
    numero_documento: str
    primer_apellido: str
    segundo_apellido: str | None
    primer_nombre: str
    otros_nombres: str | None
    tipo_trabajador: str
    subtipo_trabajador: str
    alto_riesgo_pension: bool
    salario_integral: bool
    tipo_contrato: str
    sueldo: float
    codigo_trabajador: str | None
    lugar_trabajo_pais: str
    lugar_trabajo_municipio: str
    lugar_trabajo_direccion: str
    banco: str | None
    tipo_cuenta: str | None
    numero_cuenta: str | None
    correo_electronico: str | None
    telefono: str | None
    fecha_ingreso: date
    fecha_retiro: date | None
    estado: str
    creado: datetime

    @staticmethod
    def from_model(empleado) -> "EmpleadoResponse":
        return EmpleadoResponse(
            id=str(empleado.id),
            tipo_documento=empleado.tipo_documento,
            numero_documento=empleado.numero_documento,
            primer_apellido=empleado.primer_apellido,
            segundo_apellido=empleado.segundo_apellido,
            primer_nombre=empleado.primer_nombre,
            otros_nombres=empleado.otros_nombres,
            tipo_trabajador=empleado.tipo_trabajador,
            subtipo_trabajador=empleado.subtipo_trabajador,
            alto_riesgo_pension=empleado.alto_riesgo_pension,
            salario_integral=empleado.salario_integral,
            tipo_contrato=empleado.tipo_contrato,
            sueldo=float(empleado.sueldo),
            codigo_trabajador=empleado.codigo_trabajador,
            lugar_trabajo_pais=empleado.lugar_trabajo_pais,
            lugar_trabajo_municipio=empleado.lugar_trabajo_municipio,
            lugar_trabajo_direccion=empleado.lugar_trabajo_direccion,
            banco=empleado.banco,
            tipo_cuenta=empleado.tipo_cuenta,
            numero_cuenta=empleado.numero_cuenta,
            correo_electronico=empleado.correo_electronico,
            telefono=empleado.telefono,
            fecha_ingreso=empleado.fecha_ingreso,
            fecha_retiro=empleado.fecha_retiro,
            estado=empleado.estado,
            creado=empleado.creado,
        )
