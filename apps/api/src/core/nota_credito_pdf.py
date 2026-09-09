"""Genera la representacion grafica de una Nota Credito como PDF -- mismo
patron que factura_pdf.py, reusando los bloques compartidos de
representacion_pdf_common.py (Emisor/Adquiriente son identicos)."""

from sqlalchemy.orm import Session

from src.application.reference_table_service import ReferenceTableService
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
from src.infrastructure.db.models import Empresa, NotaCredito

MONEDA = "COP"


def generar_representacion_pdf_nota_credito(db: Session, nota: NotaCredito, firma_digital: str | None) -> bytes:
    from weasyprint import HTML  # import perezoso, ver factura_pdf.py

    empresa = db.get(Empresa, nota.empresa_id)
    cliente = nota.cliente
    factura = nota.factura

    catalogos = cargar_catalogos_comunes(db)
    motivos = ReferenceTableService(db).listar("conceptos_nota_credito")
    motivo_nombre = nombre_catalogo(motivos, nota.motivo_codigo)
    impuestos = agrupar_impuestos(nota.lineas, catalogos["tributos"])
    qr_base64 = generar_qr_png_base64(nota.qr_code_content or "")

    documento_afectado_html = f"""
    <div class="afectado">
      <p class="label">Documento Afectado</p>
      <p><strong>Factura Electronica No. {factura.numero_completo}</strong></p>
      {f'<p class="mono">CUFE: {factura.cufe}</p>' if factura.cufe else ""}
    </div>
    """

    firma_html = ""
    if firma_digital:
        firma_html = f"""
        <div class="firma">
          <p class="label">Firma Digital:</p>
          <p class="mono">{firma_digital}</p>
        </div>
        """

    fecha_emision = nota.fecha_envio.strftime("%d/%m/%Y %H:%M:%S") if nota.fecha_envio else str(nota.fecha)
    fecha_validacion_html = (
        f'<p><strong>Fecha de Validacion:</strong> {nota.fecha_respuesta.strftime("%d/%m/%Y %H:%M:%S")}</p>'
        if nota.fecha_respuesta
        else ""
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
          <h1>Nota Credito Electronica No. {nota.numero_completo}</h1>
        </div>
        <div class="encabezado-datos">
          <p><strong>Motivo:</strong> {motivo_nombre or "-"}</p>
          <p><strong>Moneda:</strong> {MONEDA}</p>
          <p><strong>Fecha de Emision:</strong> {fecha_emision}</p>
          {fecha_validacion_html}
        </div>
      </div>

      {documento_afectado_html}

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
          {render_filas_lineas(nota.lineas)}
        </tbody>
      </table>

      <div class="resumen">
        <div class="son">
          <p class="label">Son</p>
          <p>{monto_en_letras(float(nota.total))}</p>
        </div>
        <div class="detalle">
          <p class="label">Detalle de la Nota</p>
          <div class="fila"><span>Subtotal</span><span>{formatear_cop(float(nota.subtotal))}</span></div>
          {"".join(f'<div class="fila"><span>{imp["label"]}</span><span>{formatear_cop(imp["monto"])}</span></div>' for imp in impuestos)}
          <div class="fila-total"><span>Total</span><span>{formatear_cop(float(nota.total))} {MONEDA}</span></div>
        </div>
      </div>

      <div class="cufe">
        <p class="label">CUDE:</p>
        <p class="mono">{nota.cude}</p>
      </div>

      {firma_html}

      <div class="pie">
        <p>Documento generado por IngeFact -- XML generado y firmado por el proveedor tecnologico: Alegra.</p>
      </div>
    </body>
    </html>
    """

    return HTML(string=html).write_pdf()
