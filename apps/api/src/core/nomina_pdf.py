"""Genera la representacion grafica (comprobante) de una Nomina Electronica
como PDF. A diferencia de Factura/Documento Soporte, Devengados/Deducciones
son un JSON de forma variable (ver docs/alegra-investigacion.md) -- en vez
de una plantilla fija por cada uno de los ~30 conceptos posibles, se
recorren genericamente y se muestra el monto de cada bloque presente."""

from sqlalchemy.orm import Session

from src.application.reference_table_service import ReferenceTableService
from src.core.pdf_render import escapado, render_pdf
from src.core.qr_utils import generar_qr_png_base64
from src.core.representacion_pdf_common import (
    CSS,
    cargar_catalogos_comunes,
    formatear_cop,
    formatear_fecha_hora,
    monto_en_letras,
    nombre_catalogo,
    render_emisor_html,
)
from src.infrastructure.db.models import Empresa, Nomina

MONEDA = "COP"

_CAMPOS_MONTO = (
    "Pago",
    "PagoNS",
    "Deduccion",
    "DeduccionSP",
    "SueldoTrabajado",
    "PagoIntereses",
    "AuxilioTransporte",
    "ViaticoManuAlojS",
    "ViaticoManuAlojNS",
)

_ETIQUETAS = {
    "Basico": "Sueldo Básico",
    "Transporte": "Auxilio de Transporte",
    "HEDs": "Horas Extra Diurnas",
    "HENs": "Horas Extra Nocturnas",
    "HRNs": "Horas Recargo Nocturno",
    "HEDDFs": "Horas Extra Diurnas Dom./Fest.",
    "HRDDFs": "Horas Recargo Diurno Dom./Fest.",
    "HENDFs": "Horas Extra Nocturnas Dom./Fest.",
    "HRNDFs": "Horas Recargo Nocturno Dom./Fest.",
    "Vacaciones": "Vacaciones",
    "Primas": "Prima",
    "Cesantias": "Cesantías",
    "Incapacidades": "Incapacidades",
    "Licencias": "Licencias",
    "Bonificaciones": "Bonificaciones",
    "Auxilios": "Auxilios",
    "HuelgasLegales": "Huelgas Legales",
    "OtrosConceptos": "Otros Conceptos",
    "Compensaciones": "Compensaciones",
    "BonoEPCTVs": "Bonos EPCTV",
    "Comisiones": "Comisiones",
    "PagosTerceros": "Pagos a Terceros",
    "Anticipos": "Anticipos",
    "Dotacion": "Dotación",
    "ApoyoSost": "Apoyo de Sostenimiento",
    "Teletrabajo": "Teletrabajo",
    "BonifRetiro": "Bonificación de Retiro",
    "Indemnizacion": "Indemnización",
    "Reintegro": "Reintegro",
    "Salud": "Salud",
    "FondoPension": "Fondo de Pensión",
    "FondoSP": "Fondo de Solidaridad Pensional",
    "Sindicatos": "Sindicatos",
    "Sanciones": "Sanciones",
    "Libranzas": "Libranzas",
    "OtrasDeducciones": "Otras Deducciones",
    "PensionVoluntaria": "Pensión Voluntaria",
    "RetencionFuente": "Retención en la Fuente",
    "AFC": "AFC",
    "Cooperativa": "Cooperativa",
    "EmbargoFiscal": "Embargo Fiscal",
    "PlanComplementarios": "Plan Complementario de Salud",
    "Educacion": "Educación",
    "Deuda": "Deuda",
}


def _extraer_monto(valor) -> float:
    if isinstance(valor, (int, float)):
        return float(valor)
    if isinstance(valor, dict):
        total = sum(valor[campo] for campo in _CAMPOS_MONTO if isinstance(valor.get(campo), (int, float)))
        if total:
            return total
        return sum(v for v in valor.values() if isinstance(v, (int, float)))
    if isinstance(valor, list):
        return sum(_extraer_monto(item) for item in valor)
    return 0.0


def _render_conceptos_html(bloque: dict) -> str:
    filas = []
    for clave, valor in bloque.items():
        if clave in ("DevengadosTotal", "DeduccionesTotal") or not valor:
            continue
        monto = _extraer_monto(valor)
        if not monto:
            continue
        etiqueta = _ETIQUETAS.get(clave, clave)
        filas.append(f'<div class="fila"><span>{etiqueta}</span><span>{formatear_cop(monto)}</span></div>')
    return "".join(filas)


def _render_trabajador_html(empleado, catalogos: dict) -> str:
    tipo_documento = nombre_catalogo(catalogos["tipos_identificacion"], empleado.tipo_documento)
    municipio = nombre_catalogo(catalogos["municipios"], empleado.lugar_trabajo_municipio)
    nombre = " ".join(
        filter(None, [empleado.primer_nombre, empleado.otros_nombres, empleado.primer_apellido, empleado.segundo_apellido])
    )

    return f"""
    <div class="parte">
      <p class="label">Trabajador</p>
      <p><strong>{nombre}</strong></p>
      <p>{tipo_documento or empleado.tipo_documento} {empleado.numero_documento}</p>
      <p>{empleado.lugar_trabajo_direccion}</p>
      <p>{municipio or empleado.lugar_trabajo_municipio}, Colombia</p>
      {f"<p>{empleado.correo_electronico}</p>" if empleado.correo_electronico else ""}
    </div>
    """


def generar_representacion_pdf_nomina(db: Session, nomina: Nomina) -> bytes:
    empresa = db.get(Empresa, nomina.empresa_id)
    empleado = nomina.empleado

    catalogos = cargar_catalogos_comunes(db)
    tabla_ref = ReferenceTableService(db)
    periodo_nombre = nombre_catalogo(tabla_ref.listar("periodos_nomina"), nomina.periodo_nomina)
    forma_pago = nombre_catalogo(tabla_ref.listar("formas_pago"), nomina.forma_pago)
    metodo_pago = nombre_catalogo(tabla_ref.listar("metodos_pago"), nomina.metodo_pago)
    qr_base64 = generar_qr_png_base64(nomina.qr_code_content or "")

    # Todo texto interpolado de aqui en adelante sale escapado (pdf_render.py),
    # incluidas las claves de devengados/deducciones (JSONB enviado por el cliente).
    nomina, empresa, empleado = map(escapado, (nomina, empresa, empleado))

    firma_html = ""
    if nomina.firma_digital:
        firma_html = f"""
        <div class="firma">
          <p class="label">Firma Digital:</p>
          <p class="mono">{nomina.firma_digital}</p>
        </div>
        """

    anulacion_html = ""
    if nomina.estado == "anulada":
        anulacion_html = f"""
        <div class="cufe">
          <p class="label">ANULADA -- Nota de Eliminación:</p>
          <p class="mono">{nomina.numero_completo_anulacion} (CUNE: {nomina.cune_anulacion})</p>
        </div>
        """

    fecha_emision = formatear_fecha_hora(nomina.fecha_envio) if nomina.fecha_envio else str(nomina.fecha_liquidacion_fin)
    fecha_validacion_html = (
        f"<p><strong>Fecha de Validación:</strong> {formatear_fecha_hora(nomina.fecha_respuesta)}</p>"
        if nomina.fecha_respuesta
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
          <h1>Comprobante de Nómina Electrónica No. {nomina.numero_completo}</h1>
        </div>
        <div class="encabezado-datos">
          <p><strong>Período:</strong> {periodo_nombre or nomina.periodo_nomina} ({nomina.fecha_liquidacion_inicio} a {nomina.fecha_liquidacion_fin})</p>
          {f"<p><strong>Forma de pago:</strong> {forma_pago}</p>" if forma_pago else ""}
          {f"<p><strong>Método de pago:</strong> {metodo_pago}</p>" if metodo_pago else ""}
          <p><strong>Moneda:</strong> {MONEDA}</p>
          <p><strong>Fecha de Emisión:</strong> {fecha_emision}</p>
          {fecha_validacion_html}
        </div>
      </div>

      <div class="partes">
        {render_emisor_html(empresa, catalogos, label="Empleador")}
        {_render_trabajador_html(empleado, catalogos)}
        <img class="qr" src="data:image/png;base64,{qr_base64}" alt="Código QR" />
      </div>

      <div class="resumen">
        <div class="son">
          <p class="label">Son</p>
          <p>{monto_en_letras(float(nomina.comprobante_total))}</p>
        </div>
        <div class="detalle">
          <p class="label">Devengados</p>
          {_render_conceptos_html(nomina.devengados)}
          <div class="fila-total"><span>Total Devengados</span><span>{formatear_cop(float(nomina.devengados_total))}</span></div>
        </div>
        <div class="detalle">
          <p class="label">Deducciones</p>
          {_render_conceptos_html(nomina.deducciones)}
          <div class="fila-total"><span>Total Deducciones</span><span>{formatear_cop(float(nomina.deducciones_total))}</span></div>
        </div>
        <div class="fila-total"><span>Neto a Pagar</span><span>{formatear_cop(float(nomina.comprobante_total))} {MONEDA}</span></div>
      </div>

      <div class="cufe">
        <p class="label">CUNE:</p>
        <p class="mono">{nomina.cune}</p>
      </div>

      {anulacion_html}
      {firma_html}

      <div class="pie">
        <p>Documento generado por IngeFact -- XML generado y firmado por el proveedor tecnológico: Alegra.</p>
      </div>
    </body>
    </html>
    """

    return render_pdf(html)
