"""Genera la representacion grafica de una Factura como PDF, para adjuntar
al correo que se le envia al cliente -- mismo contenido que
InvoiceRepresentationPage.jsx (apps/user), reconstruido en HTML/CSS del
lado del backend con WeasyPrint (decision: no reusar la pagina React via
navegador headless, para no agregar esa dependencia mas pesada)."""

from sqlalchemy.orm import Session

from src.application.reference_table_service import ReferenceTableService
from src.application.resolucion_dian_service import ResolucionDianService
from src.core.qr_utils import generar_qr_png_base64
from src.core.representacion_pdf_common import (
    CSS,
    agrupar_impuestos,
    cargar_catalogos_comunes,
    formatear_cop,
    monto_en_letras,
    nombre_catalogo,
    render_adquiriente_html,
    render_emisor_html,
    render_filas_lineas,
)
from src.infrastructure.db.models import Empresa, Factura

MONEDA = "COP"


def generar_representacion_pdf(db: Session, factura: Factura, firma_digital: str | None) -> bytes:
    # Import perezoso: weasyprint intenta cargar libgobject/libpango del
    # sistema apenas se importa el modulo (no solo al usarlo) -- si se
    # importara arriba, con esas librerias ausentes (Windows sin GTK3
    # instalado) se rompería CUALQUIER import de factura_service. En
    # Docker (Dockerfile ya las instala) esto importa sin problema.
    from weasyprint import HTML

    empresa = db.get(Empresa, factura.empresa_id)
    cliente = factura.cliente
    resolucion = ResolucionDianService(db).obtener(factura.empresa_id)

    catalogos = cargar_catalogos_comunes(db)
    tabla_ref = ReferenceTableService(db)
    formas_pago = tabla_ref.listar("formas_pago")
    metodos_pago = tabla_ref.listar("metodos_pago")

    forma_pago_nombre = nombre_catalogo(formas_pago, factura.forma_pago)
    metodo_pago_nombre = nombre_catalogo(metodos_pago, factura.metodo_pago)
    impuestos = agrupar_impuestos(factura.lineas, catalogos["tributos"])

    qr_base64 = generar_qr_png_base64(factura.qr_code_content or "")

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

    fecha_emision = factura.fecha_envio.strftime("%d/%m/%Y %H:%M:%S") if factura.fecha_envio else str(factura.fecha)
    fecha_validacion_html = (
        f'<p><strong>Fecha de Validacion:</strong> {factura.fecha_respuesta.strftime("%d/%m/%Y %H:%M:%S")}</p>'
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
    <style>{CSS}</style>
    </head>
    <body>
      <div class="encabezado">
        <div>
          <h1>Factura Electronica de Venta No. {factura.numero_completo}</h1>
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
        {render_emisor_html(empresa, catalogos)}
        {render_adquiriente_html(cliente, catalogos)}
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
          {render_filas_lineas(factura.lineas)}
        </tbody>
      </table>

      <div class="resumen">
        <div class="son">
          <p class="label">Son</p>
          <p>{monto_en_letras(float(factura.total))}</p>
        </div>
        <div class="detalle">
          <p class="label">Detalle de Venta</p>
          <div class="fila"><span>Subtotal</span><span>{formatear_cop(float(factura.subtotal))}</span></div>
          {"".join(f'<div class="fila"><span>{imp["label"]}</span><span>{formatear_cop(imp["monto"])}</span></div>' for imp in impuestos)}
          <div class="fila-total"><span>Total a Pagar</span><span>{formatear_cop(float(factura.total))} {MONEDA}</span></div>
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
