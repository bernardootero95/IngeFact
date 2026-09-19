"""Genera la representacion grafica de un Documento Soporte como PDF -- mismo
patron que nota_debito_pdf.py. A diferencia de una Factura, aqui la empresa
es el ADQUIRIENTE (quien emite el documento) y el Proveedor es el vendedor."""

from sqlalchemy.orm import Session

from src.application.reference_table_service import ReferenceTableService
from src.core.qr_utils import generar_qr_png_base64
from src.core.representacion_pdf_common import (
    CSS,
    agrupar_impuestos,
    cargar_catalogos_comunes,
    formatear_cop,
    formatear_fecha_hora,
    monto_en_letras,
    nombre_catalogo,
    nombre_regimen_fiscal,
    nombre_responsabilidad_fiscal,
    render_emisor_html,
    render_filas_lineas,
)
from src.infrastructure.db.models import DocumentoSoporte, Empresa

MONEDA = "COP"


def _render_vendedor_html(proveedor, catalogos: dict) -> str:
    tipo_identificacion = nombre_catalogo(catalogos["tipos_identificacion"], proveedor.tipo_identificacion)
    tipo_organizacion = nombre_catalogo(catalogos["tipos_organizacion"], proveedor.tipo_organizacion)
    responsabilidad_fiscal = nombre_responsabilidad_fiscal(catalogos["responsabilidades_fiscales"], proveedor.regimen)
    regimen_fiscal = nombre_regimen_fiscal(proveedor.regimen_fiscal)
    departamento = nombre_catalogo(catalogos["departamentos"], proveedor.departamento)
    municipio = nombre_catalogo(catalogos["municipios"], proveedor.municipio)
    ubicacion = ", ".join(filter(None, [departamento, municipio, "Colombia"]))
    digito = f"-{proveedor.digito_verificacion}" if proveedor.digito_verificacion else ""

    return f"""
    <div class="parte">
      <p class="label">Vendedor</p>
      <p><strong>{proveedor.nombre}</strong></p>
      <p>{tipo_identificacion} {proveedor.numero_identificacion}{digito}</p>
      {f"<p>{proveedor.direccion}</p>" if proveedor.direccion else ""}
      {f"<p>Tel: {proveedor.telefono}</p>" if proveedor.telefono else ""}
      {f"<p>{proveedor.correo_electronico}</p>" if proveedor.correo_electronico else ""}
      <p>{ubicacion}</p>
      {f"<p>{tipo_organizacion}</p>" if tipo_organizacion else ""}
      {f"<p>{regimen_fiscal}</p>" if regimen_fiscal else ""}
      {f"<p>{responsabilidad_fiscal}</p>" if responsabilidad_fiscal else ""}
    </div>
    """


def _render_tabla_lineas_html(documento: DocumentoSoporte) -> str:
    # Los documentos nuevos no llevan impuestos; solo los anteriores a ese
    # cambio pueden traerlos y deben seguir mostrando su desglose real.
    con_impuestos = float(documento.total_impuestos) > 0
    if con_impuestos:
        encabezado = (
            "<th>Cod</th><th>Descripcion</th><th>Cant.</th><th>Precio Unit.</th>"
            "<th>Subtotal</th><th>IVA</th><th>Total</th>"
        )
        filas = render_filas_lineas(documento.lineas)
    else:
        encabezado = "<th>Cod</th><th>Descripcion</th><th>Cant.</th><th>Precio Unit.</th><th>Total</th>"
        filas = "".join(
            f"""
            <tr>
              <td>{linea.codigo or "-"}</td>
              <td>{linea.descripcion}</td>
              <td class="num">{linea.cantidad}</td>
              <td class="num">{formatear_cop(float(linea.precio_unitario))}</td>
              <td class="num total-linea">{formatear_cop(float(linea.total_linea))}</td>
            </tr>
            """
            for linea in documento.lineas
        )
    return f"""
      <table>
        <thead><tr>{encabezado}</tr></thead>
        <tbody>{filas}</tbody>
      </table>
    """


def generar_representacion_pdf_documento_soporte(
    db: Session, documento: DocumentoSoporte, firma_digital: str | None
) -> bytes:
    from weasyprint import HTML  # import perezoso, ver factura_pdf.py

    empresa = db.get(Empresa, documento.empresa_id)
    proveedor = documento.proveedor

    catalogos = cargar_catalogos_comunes(db)
    tabla_ref = ReferenceTableService(db)
    forma_pago = nombre_catalogo(tabla_ref.listar("formas_pago"), documento.forma_pago)
    metodo_pago = nombre_catalogo(tabla_ref.listar("metodos_pago"), documento.metodo_pago)
    impuestos = agrupar_impuestos(documento.lineas, catalogos["tributos"])
    qr_base64 = generar_qr_png_base64(documento.qr_code_content or "")

    firma_html = ""
    if firma_digital:
        firma_html = f"""
        <div class="firma">
          <p class="label">Firma Digital:</p>
          <p class="mono">{firma_digital}</p>
        </div>
        """

    fecha_emision = formatear_fecha_hora(documento.fecha_envio) if documento.fecha_envio else str(documento.fecha)
    fecha_validacion_html = (
        f"<p><strong>Fecha de Validacion:</strong> {formatear_fecha_hora(documento.fecha_respuesta)}</p>"
        if documento.fecha_respuesta
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
          <h1>Documento Soporte en Adquisiciones No. {documento.numero_completo}</h1>
        </div>
        <div class="encabezado-datos">
          {f"<p><strong>Forma de pago:</strong> {forma_pago}</p>" if forma_pago else ""}
          {f"<p><strong>Metodo de pago:</strong> {metodo_pago}</p>" if metodo_pago else ""}
          <p><strong>Moneda:</strong> {MONEDA}</p>
          <p><strong>Fecha de Emision:</strong> {fecha_emision}</p>
          {fecha_validacion_html}
        </div>
      </div>

      <div class="partes">
        {render_emisor_html(empresa, catalogos, label="Adquiriente")}
        {_render_vendedor_html(proveedor, catalogos)}
        <img class="qr" src="data:image/png;base64,{qr_base64}" alt="Codigo QR" />
      </div>

      {_render_tabla_lineas_html(documento)}

      <div class="resumen">
        <div class="son">
          <p class="label">Son</p>
          <p>{monto_en_letras(float(documento.total))}</p>
        </div>
        <div class="detalle">
          <p class="label">Detalle del Documento</p>
          {f'<div class="fila"><span>Subtotal</span><span>{formatear_cop(float(documento.subtotal))}</span></div>' if impuestos else ""}
          {"".join(f'<div class="fila"><span>{imp["label"]}</span><span>{formatear_cop(imp["monto"])}</span></div>' for imp in impuestos)}
          <div class="fila-total"><span>Total</span><span>{formatear_cop(float(documento.total))} {MONEDA}</span></div>
        </div>
      </div>

      <div class="cufe">
        <p class="label">CUDS:</p>
        <p class="mono">{documento.cuds}</p>
      </div>

      {firma_html}

      <div class="pie">
        <p>Documento generado por IngeFact -- XML generado y firmado por el proveedor tecnologico: Alegra.</p>
      </div>
    </body>
    </html>
    """

    return HTML(string=html).write_pdf()
