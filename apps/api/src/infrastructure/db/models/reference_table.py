import uuid

from sqlalchemy import Column, DateTime, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID

from src.infrastructure.db.session import Base

# Las 13 tablas de catalogo DIAN comparten el mismo esquema base (code/value/
# estado), salvo un puñado de columnas extra en un par de ellas. En vez de
# escribir 13 clases casi identicas a mano (Mapped[]/mapped_column() por
# columna), se generan con esta fabrica -- por eso usan el estilo Column()
# clasico en vez del Mapped[] del resto del proyecto, mas simple de construir
# dinamicamente. Cada llamada arma columnas nuevas (un objeto Column no se
# puede reutilizar entre tablas distintas).
def _base_columns() -> dict:
    return {
        "id": Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        "code": Column(String(50), nullable=False),
        "value": Column(String(255), nullable=False),
        "estado": Column(String(20), nullable=False, default="activo"),
        "creado": Column(DateTime(timezone=True), server_default=func.now()),
        "actualizado": Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now()),
        "eliminado": Column(DateTime(timezone=True), nullable=True),
    }


def _make_reference_model(table_name: str, extra_columns: dict | None = None):
    attrs = {
        "__tablename__": table_name,
        "__table_args__": (UniqueConstraint("code", name=f"{table_name}_code_unique"),),
        **_base_columns(),
    }
    if extra_columns:
        attrs.update(extra_columns)
    class_name = "".join(part.capitalize() for part in table_name.split("_"))
    return type(class_name, (Base,), attrs)


REFERENCE_TABLE_NAMES = (
    "paises",
    "departamentos",
    "municipios",
    "monedas",
    "formas_pago",
    "metodos_pago",
    "tipos_organizacion",
    "responsabilidades_fiscales",
    "tributos",
    "tipos_identificacion",
    "tipos_unidad",
    "conceptos_nota_credito",
    "conceptos_nota_debito",
)

Pais = _make_reference_model("paises")
Departamento = _make_reference_model("departamentos")
Municipio = _make_reference_model(
    "municipios",
    {
        "department_code": Column(String(10)),
        "department_value": Column(String(255)),
    },
)
Moneda = _make_reference_model("monedas")
FormaPago = _make_reference_model("formas_pago")
MetodoPago = _make_reference_model("metodos_pago")
TipoOrganizacion = _make_reference_model("tipos_organizacion")
ResponsabilidadFiscal = _make_reference_model("responsabilidades_fiscales")
Tributo = _make_reference_model("tributos")
TipoIdentificacion = _make_reference_model("tipos_identificacion")
TipoUnidad = _make_reference_model("tipos_unidad")
ConceptoNotaCredito = _make_reference_model("conceptos_nota_credito", {"value_nade": Column(String(255))})
ConceptoNotaDebito = _make_reference_model("conceptos_nota_debito", {"value_nade": Column(String(255))})

REFERENCE_TABLE_MODELS = {
    "paises": Pais,
    "departamentos": Departamento,
    "municipios": Municipio,
    "monedas": Moneda,
    "formas_pago": FormaPago,
    "metodos_pago": MetodoPago,
    "tipos_organizacion": TipoOrganizacion,
    "responsabilidades_fiscales": ResponsabilidadFiscal,
    "tributos": Tributo,
    "tipos_identificacion": TipoIdentificacion,
    "tipos_unidad": TipoUnidad,
    "conceptos_nota_credito": ConceptoNotaCredito,
    "conceptos_nota_debito": ConceptoNotaDebito,
}
