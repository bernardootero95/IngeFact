"""Genera la representacion grafica de una Factura como PDF, para adjuntar
al correo que se le envia al cliente -- mismo contenido que
InvoiceRepresentationPage.jsx (apps/user), reconstruido en HTML/CSS del
lado del backend con WeasyPrint (decision: no reusar la pagina React via
navegador headless, para no agregar esa dependencia mas pesada)."""

import base64
from datetime import date as date_cls
from datetime import datetime

from num2words import num2words
from sqlalchemy.orm import Session

from src.application.reference_table_service import ReferenceTableService
from src.application.resolucion_dian_service import ResolucionDianService
from src.core.qr_utils import generar_qr_png_base64
from src.infrastructure.db.models import Empresa, Factura

MONEDA = "COP"


def _formatear_cop(valor: float) -> str:
    return f"${valor:,.0f}".replace(",", ".")


def _monto_en_letras(total: float) -> str:
    entero = int(round(total))
    return f"{num2words(entero, lang='es').upper()} PESOS"


def _nombre_catalogo(registros, code: str | None) -> str | None:
    if not code:
        return None
    return next((r.value for r in registros if r.code == code), code)


def _agrupar_impuestos(lineas, tributos) -> list[dict]:
    grupos: dict[str, dict] = {}
    for linea in lineas:
        if not linea.tributo or float(linea.impuesto_linea) <= 0:
            continue
        key = f"{linea.tributo}-{linea.tarifa_impuesto}"
        nombre_tributo = _nombre_catalogo(tributos, linea.tributo)
        if key in grupos:
            grupos[key]["monto"] += float(linea.impuesto_linea)
        else:
            grupos[key] = {"label": f"{nombre_tributo} {linea.tarifa_impuesto}%", "monto": float(linea.impuesto_linea)}
    return list(grupos.values())


def _formatear_fecha_hora(dt: datetime | None) -> str:
    if dt is None:
        return "-"
    return dt.strftime("%d/%m/%Y %H:%M:%S")


def generar_representacion_pdf(db: Session, factura: Factura, firma_digital: str | None) -> bytes:
    # Import perezoso: weasyprint intenta cargar libgobject/libpango del
    # sistema apenas se importa el modulo (no solo al usarlo) -- si se
    # importara arriba, con esas librerias ausentes (Windows sin GTK3
    # instalado) se rompería CUALQUIER import de factura_service, no solo
    # el envio de correo. En Docker (Dockerfile ya las instala) esto
    # importa sin problema.
    from weasyprint import HTML

    empresa = db.get(Empresa, factura.empresa_id)
    cliente = factura.cliente
    resolucion = ResolucionDianService(db).obtener(factura.empresa_id)

    tabla_ref = ReferenceTableService(db)
    departamentos = tabla_ref.listar("departamentos")
    municipios = tabla_ref.listar("municipios")
    formas_pago = tabla_ref.listar("formas_pago")
    metodos_pago = tabla_ref.listar("metodos_pago")
    tributos = tabla_ref.listar("tributos")

    departamento_nombre = _nombre_catalogo(departamentos, empresa.departamento)
    municipio_nombre = _nombre_catalogo(municipios, empresa.municipio)
    forma_pago_nombre = _nombre_catalogo(formas_pago, factura.forma_pago)
    metodo_pago_nombre = _nombre_catalogo(metodos_pago, factura.metodo_pago)
    impuestos = _agrupar_impuestos(factura.lineas, tributos)

    qr_base64 = generar_qr_png_base64(factura.qr_code_content or "")

    filas_lineas = "".join(
        f"""
        <tr>
          <td>{linea.codigo or "-"}</td>
          <td>{linea.descripcion}</td>
          <td class="num">{linea.cantidad}</td>
          <td class="num">{_formatear_cop(float(linea.precio_unitario))}</td>
          <td class="num">{_formatear_cop(float(linea.subtotal_linea))}</td>
          <td class="num">{_formatear_cop(float(linea.impuesto_linea))}</td>
          <td class="num total-linea">{_formatear_cop(float(linea.total_linea))}</td>
        </tr>
        """
        for linea in factura.lineas
    )

    filas_impuestos = "".join(
        f"""<div class="fila"><span>{imp["label"]}</span><span>{_formatear_cop(imp["monto"])}</span></div>"""
        for imp in impuestos
    )

    resolucion_html = ""
    if resolucion:
        resolucion_html = f"""
        <p>Autorizado DIAN para la Facturacion Electronica mediante la resolucion {resolucion.numero_resolucion}
        entre los rangos de facturacion del {resolucion.rango_minimo} al {resolucion.rango_maximo} usando el
        prefijo {resolucion.prefijo}, con vigencia entre las fechas {resolucion.fecha_inicio} al
        {resolucion.fecha_fin}.</p>
        """

    firma_html = ""
    if firma_digital:
        firma_html = f"""
        <div class="firma">
          <p class="label">Firma Digital:</p>
          <p class="mono">{firma_digital}</p>
        </div>
        """

    fecha_emision = _formatear_fecha_hora(factura.fecha_envio) if factura.fecha_envio else str(factura.fecha)
    fecha_validacion_html = (
        f'<p><strong>Fecha de Validacion:</strong> {_formatear_fecha_hora(factura.fecha_respuesta)}</p>'
        if factura.fecha_respuesta
        else ""
    )
    fecha_vencimiento_html = (
        f"<p><strong>Fecha de Vencimiento:</strong> {factura.fecha_vencimiento}</p>" if factura.fecha_vencimiento else ""
    )

    html = f"""
    <html>
    <head>
    <meta charset="utf-8" />
    <style>
      @page {{ size: A4; margin: 1.5cm; }}
      body {{ font-family: Helvetica, Arial, sans-serif; font-size: 10px; color: #1e293b; }}
      h1 {{ font-size: 13px; margin: 0; }}
      .subtitulo {{ font-size: 9px; color: #64748b; text-transform: uppercase; }}
      .encabezado {{ display: flex; justify-content: space-between; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 8px; }}
      .encabezado-datos {{ text-align: right; font-size: 9px; color: #475569; }}
      .partes {{ display: flex; gap: 16px; border-bottom: 1px solid #cbd5e1; padding-bottom: 10px; margin-bottom: 10px; }}
      .parte {{ flex: 1; }}
      .parte .label {{ font-size: 8px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 3px; }}
      .qr {{ width: 90px; height: 90px; }}
      table {{ width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 10px; }}
      th, td {{ border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; }}
      th {{ background: #f8fafc; text-transform: uppercase; color: #64748b; }}
      .num {{ text-align: right; }}
      .total-linea {{ font-weight: bold; }}
      .resumen {{ display: flex; justify-content: space-between; gap: 16px; margin-bottom: 10px; }}
      .son {{ flex: 1; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 4px; padding: 8px; }}
      .detalle {{ width: 220px; background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 4px; padding: 8px; }}
      .fila {{ display: flex; justify-content: space-between; }}
      .fila-total {{ display: flex; justify-content: space-between; font-weight: bold; font-size: 11px; border-top: 1px solid #bbf7d0; padding-top: 4px; margin-top: 4px; }}
      .cufe {{ font-size: 9px; margin-bottom: 10px; }}
      .mono {{ font-family: monospace; word-break: break-all; }}
      .firma {{ font-size: 8px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-bottom: 10px; }}
      .pie {{ font-size: 7px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px; }}
    </style>
    </head>
    <body>
      <div class="encabezado">
        <div>
          <h1>Factura Electronica de Venta No. {factura.numero_completo}</h1>
          <p class="subtitulo">Representacion Grafica</p>
        </div>
        <div class="encabezado-datos">
          <p><strong>Forma de Pago:</strong> {forma_pago_nombre or "-"}</p>
          <p><strong>Metodo de Pago:</strong> {metodo_pago_nombre or "-"}</p>
          {fecha_vencimiento_html}
          <p><strong>Moneda:</strong> {MONEDA}</p>
          <p><strong>Fecha de Emision:</strong> {fecha_emision}</p>
          {fecha_validacion_html}
        </div>
      </div>

      <div class="partes">
        <div class="parte">
          <p class="label">Emisor</p>
          <p><strong>{empresa.razon_social}</strong></p>
          <p>NIT {empresa.numero_identificacion}-{empresa.digito_verificacion}</p>
          {f"<p>{empresa.direccion}</p>" if empresa.direccion else ""}
          {f"<p>Tel: {empresa.telefono}</p>" if empresa.telefono else ""}
          {f"<p>{empresa.correo_electronico}</p>" if empresa.correo_electronico else ""}
          <p>{", ".join(filter(None, [departamento_nombre, municipio_nombre, "Colombia"]))}</p>
        </div>
        <div class="parte">
          <p class="label">Adquiriente</p>
          <p><strong>{cliente.nombre}</strong></p>
          <p>{cliente.tipo_identificacion} {cliente.numero_identificacion}</p>
          {f"<p>{cliente.correo_electronico}</p>" if cliente.correo_electronico else ""}
          {f"<p>Tel: {cliente.telefono}</p>" if cliente.telefono else ""}
        </div>
        <img class="qr" src="data:image/png;base64,{qr_base64}" alt="Codigo QR" />
      </div>

      <table>
        <thead>
          <tr>
            <th>Cod</th><th>Descripcion</th><th>Cant.</th><th>Precio Unit.</th>
            <th>Subtotal</th><th>IVA</th><th>Total</th>
          </tr>
        </thead>
        <tbody>
          {filas_lineas}
        </tbody>
      </table>

      <div class="resumen">
        <div class="son">
          <p class="label">Son</p>
          <p>{_monto_en_letras(float(factura.total))}</p>
        </div>
        <div class="detalle">
          <p class="label">Detalle de Venta</p>
          <div class="fila"><span>Subtotal</span><span>{_formatear_cop(float(factura.subtotal))}</span></div>
          {filas_impuestos}
          <div class="fila-total"><span>Total a Pagar</span><span>{_formatear_cop(float(factura.total))} {MONEDA}</span></div>
        </div>
      </div>

      <div class="cufe">
        <p class="label">CUFE:</p>
        <p class="mono">{factura.cufe}</p>
      </div>

      {firma_html}

      <div class="pie">
        {resolucion_html}
        <p>Documento generado por IngeFact -- XML generado y firmado por el proveedor tecnologico: Alegra.</p>
      </div>
    </body>
    </html>
    """

    return HTML(string=html).write_pdf()
