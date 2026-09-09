"""Piezas compartidas entre los generadores de PDF de representacion
grafica (Factura, Nota Credito, Nota Debito) -- formatters, resolucion de
catalogos, y los bloques de Emisor/Adquiriente, que son identicos entre
los 3 tipos de documento (misma Empresa, mismo modelo Cliente)."""

from datetime import datetime

from num2words import num2words

from src.application.reference_table_service import ReferenceTableService

MONEDA = "COP"

# Codigo DIAN de "responsabilidad de IVA" del adquiriente -- no viene de un
# catalogo sincronizado de Alegra (son solo 2 valores fijos post-reforma
# tributaria), mismo mapa fijo que ya usa SeccionCliente.jsx en el frontend.
REGIMEN_FISCAL_LABELS = {"48": "Responsable de IVA", "49": "No responsable de IVA"}

CSS = """
  @page { size: A4; margin: 1.5cm; }
  body { font-family: Helvetica, Arial, sans-serif; font-size: 10px; color: #1e293b; }
  h1 { font-size: 13px; margin: 0; }
  .encabezado { display: flex; justify-content: space-between; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 8px; }
  .encabezado-datos { text-align: right; font-size: 9px; color: #475569; }
  .afectado { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 8px; margin-bottom: 10px; }
  .afectado .label { font-size: 8px; font-weight: bold; color: #1d4ed8; text-transform: uppercase; margin-bottom: 3px; }
  .partes { display: flex; gap: 16px; border-bottom: 1px solid #cbd5e1; padding-bottom: 10px; margin-bottom: 10px; }
  .parte { flex: 1; }
  .parte .label { font-size: 8px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 3px; }
  .qr { width: 90px; height: 90px; }
  table { width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 10px; }
  th, td { border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; }
  th { background: #f8fafc; text-transform: uppercase; color: #64748b; }
  .num { text-align: right; }
  .total-linea { font-weight: bold; }
  .resumen { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 10px; }
  .son { flex: 1; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 4px; padding: 8px; }
  .detalle { width: 220px; background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 4px; padding: 8px; }
  .fila { display: flex; justify-content: space-between; }
  .fila-total { display: flex; justify-content: space-between; font-weight: bold; font-size: 11px; border-top: 1px solid #bbf7d0; padding-top: 4px; margin-top: 4px; }
  .cufe { font-size: 9px; margin-bottom: 10px; }
  .mono { font-family: monospace; word-break: break-all; }
  .firma { font-size: 8px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-bottom: 10px; }
  .pie { font-size: 7px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px; }
"""


def formatear_cop(valor: float) -> str:
    return f"${valor:,.0f}".replace(",", ".")


def monto_en_letras(total: float) -> str:
    entero = int(round(total))
    return f"{num2words(entero, lang='es').upper()} PESOS"


def nombre_catalogo(registros, code: str | None) -> str | None:
    if not code:
        return None
    return next((r.value for r in registros if r.code == code), code)


def nombre_regimen_fiscal(code: str | None) -> str | None:
    if not code:
        return None
    return REGIMEN_FISCAL_LABELS.get(code, code)


def formatear_fecha_hora(dt: datetime | None) -> str:
    if dt is None:
        return "-"
    return dt.strftime("%d/%m/%Y %H:%M:%S")


def agrupar_impuestos(lineas, tributos) -> list[dict]:
    grupos: dict[str, dict] = {}
    for linea in lineas:
        if not linea.tributo or float(linea.impuesto_linea) <= 0:
            continue
        key = f"{linea.tributo}-{linea.tarifa_impuesto}"
        nombre_tributo = nombre_catalogo(tributos, linea.tributo)
        if key in grupos:
            grupos[key]["monto"] += float(linea.impuesto_linea)
        else:
            grupos[key] = {"label": f"{nombre_tributo} {linea.tarifa_impuesto}%", "monto": float(linea.impuesto_linea)}
    return list(grupos.values())


def cargar_catalogos_comunes(db) -> dict:
    """Los catalogos que Emisor/Adquiriente/impuestos necesitan siempre --
    centralizado para no repetir 6 llamadas a ReferenceTableService en cada
    generador de PDF."""
    tabla_ref = ReferenceTableService(db)
    return {
        "departamentos": tabla_ref.listar("departamentos"),
        "municipios": tabla_ref.listar("municipios"),
        "tipos_organizacion": tabla_ref.listar("tipos_organizacion"),
        "responsabilidades_fiscales": tabla_ref.listar("responsabilidades_fiscales"),
        "tributos": tabla_ref.listar("tributos"),
    }


def render_filas_lineas(lineas) -> str:
    return "".join(
        f"""
        <tr>
          <td>{linea.codigo or "-"}</td>
          <td>{linea.descripcion}</td>
          <td class="num">{linea.cantidad}</td>
          <td class="num">{formatear_cop(float(linea.precio_unitario))}</td>
          <td class="num">{formatear_cop(float(linea.subtotal_linea))}</td>
          <td class="num">{formatear_cop(float(linea.impuesto_linea))}</td>
          <td class="num total-linea">{formatear_cop(float(linea.total_linea))}</td>
        </tr>
        """
        for linea in lineas
    )


def render_emisor_html(empresa, catalogos: dict) -> str:
    departamento_nombre = nombre_catalogo(catalogos["departamentos"], empresa.departamento)
    municipio_nombre = nombre_catalogo(catalogos["municipios"], empresa.municipio)
    tipo_organizacion_nombre = nombre_catalogo(catalogos["tipos_organizacion"], empresa.tipo_organizacion)
    responsabilidad_fiscal_nombre = nombre_catalogo(catalogos["responsabilidades_fiscales"], empresa.regimen)

    return f"""
    <div class="parte">
      <p class="label">Emisor</p>
      <p><strong>{empresa.razon_social}</strong></p>
      <p>NIT {empresa.numero_identificacion}-{empresa.digito_verificacion}</p>
      {f"<p>{empresa.direccion}</p>" if empresa.direccion else ""}
      {f"<p>Tel: {empresa.telefono}</p>" if empresa.telefono else ""}
      {f"<p>{empresa.correo_electronico}</p>" if empresa.correo_electronico else ""}
      <p>{", ".join(filter(None, [departamento_nombre, municipio_nombre, "Colombia"]))}</p>
      {f"<p>Tipo de Organizacion: {tipo_organizacion_nombre}</p>" if tipo_organizacion_nombre else ""}
      {f"<p>Responsabilidad Fiscal: {responsabilidad_fiscal_nombre}</p>" if responsabilidad_fiscal_nombre else ""}
    </div>
    """


def render_adquiriente_html(cliente, catalogos: dict) -> str:
    tipo_organizacion_nombre = nombre_catalogo(catalogos["tipos_organizacion"], cliente.tipo_organizacion)
    responsabilidad_fiscal_nombre = nombre_catalogo(catalogos["responsabilidades_fiscales"], cliente.regimen)
    regimen_fiscal_nombre = nombre_regimen_fiscal(cliente.regimen_fiscal)
    responsabilidad_tributaria_nombre = (
        nombre_catalogo(catalogos["tributos"], cliente.tributo) if cliente.tributo else "Sin responsabilidad tributaria"
    )

    return f"""
    <div class="parte">
      <p class="label">Adquiriente</p>
      <p><strong>{cliente.nombre}</strong></p>
      <p>{cliente.tipo_identificacion} {cliente.numero_identificacion}</p>
      {f"<p>{cliente.correo_electronico}</p>" if cliente.correo_electronico else ""}
      {f"<p>Tel: {cliente.telefono}</p>" if cliente.telefono else ""}
      {f"<p>Tipo de Organizacion: {tipo_organizacion_nombre}</p>" if tipo_organizacion_nombre else ""}
      {f"<p>Regimen Fiscal: {regimen_fiscal_nombre}</p>" if regimen_fiscal_nombre else ""}
      {f"<p>Responsabilidad Fiscal: {responsabilidad_fiscal_nombre}</p>" if responsabilidad_fiscal_nombre else ""}
      <p>Responsabilidad Tributaria: {responsabilidad_tributaria_nombre}</p>
    </div>
    """
