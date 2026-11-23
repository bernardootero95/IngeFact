"""Estado comercial del plan de una empresa, tal como lo ve el cliente.

- vigente: puede usar todo IngeFact.
- sin_cupo: gasto todos los documentos del paquete. Sigue entrando y
  navegando, pero no envia nada a la DIAN hasta comprar otro paquete.
- vencido: paso la fecha fin del paquete (aunque le queden documentos). Ya
  no tiene plan: solo ve su estado y descarga su informacion (Excel, PDF y
  XML); la API rechaza cualquier escritura.
- sin_plan: la empresa no tiene suscripcion activa.

Un plan vencido manda sobre uno sin cupo: al vencer, los documentos que
quedaban se pierden (terminos, seccion 4)."""

from datetime import date

VIGENTE = "vigente"
SIN_CUPO = "sin_cupo"
VENCIDO = "vencido"
SIN_PLAN = "sin_plan"


def calcular_estado_plan(
    fecha_fin: date | None, max_documentos: int | None, documentos_usados: int | None, hoy: date
) -> str:
    if fecha_fin is None:
        return SIN_PLAN
    if fecha_fin < hoy:
        return VENCIDO
    if max_documentos is not None and (documentos_usados or 0) >= max_documentos:
        return SIN_CUPO
    return VIGENTE
