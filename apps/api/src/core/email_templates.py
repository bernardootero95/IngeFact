"""Plantillas de correo transaccional. Funciones puras que devuelven
(subject, html) -- sin motor de plantillas (Jinja2 no es dependencia del
proyecto), f-strings simples alcanzan para el volumen de correos del MVP.

Todo valor dinamico pasa por _e() (html.escape): nombres de clientes,
proveedores y empleados los escribe el tenant, y sin escapar permitirian
inyectar enlaces o HTML en correos que salen desde el dominio de IngeFact
hacia terceros (phishing con nuestra marca).

Colores con contraste AA sobre blanco: texto #1e293b, secundario #475569,
boton #1E7A1B (brand-600) con texto blanco."""

from html import escape

from src.core.legal import URL_POLITICA_DATOS, URL_SITIO

_COLOR_BOTON = "#1E7A1B"


def _e(valor) -> str:
    return escape(str(valor), quote=True)


def _boton(url: str, texto: str) -> str:
    return f"""
      <p style="text-align:center;margin:24px 0;">
        <a href="{_e(url)}" style="background:{_COLOR_BOTON};color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
          {_e(texto)}
        </a>
      </p>"""


def _layout(contenido: str, motivo: str) -> str:
    """Envoltura comun. `motivo` explica por que la persona recibe el correo
    (ya escapado por quien llama) -- quien lo recibe puede ser un tercero
    (cliente, proveedor o empleado del tenant), titular de datos personales."""
    return f"""
    <div lang="es" style="font-family:Arial,sans-serif;color:#1e293b;max-width:480px;margin:0 auto;line-height:1.5;">
      {contenido}
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0 16px;" />
      <p style="color:#475569;font-size:12px;margin:0 0 8px;">{motivo}</p>
      <p style="color:#475569;font-size:12px;margin:0;">
        IngeFact · Software de documentos electrónicos DIAN ·
        <a href="{_e(URL_SITIO)}" style="color:#475569;">ingefact.com</a> ·
        <a href="{_e(URL_POLITICA_DATOS)}" style="color:#475569;">Tratamiento de datos personales</a>
      </p>
    </div>
    """


def _motivo_documento(emisor: str) -> str:
    emisor = _e(emisor)
    return (
        f"Recibes este correo porque {emisor} te envió este documento a través de IngeFact, su software de "
        f"documentos electrónicos. {emisor} es responsable de tus datos personales; para consultarlos o "
        f"corregirlos, comunícate directamente con {emisor}."
    )


def _tabla(filas: list[tuple[str, str, bool]]) -> str:
    """filas: (etiqueta, valor, es_codigo)."""
    html_filas = "".join(
        f'<tr><th scope="row" style="padding:4px 12px 4px 0;color:#475569;text-align:left;font-weight:normal;">{_e(etiqueta)}</th>'
        + (
            f'<td style="padding:4px 0;font-family:monospace;font-size:12px;word-break:break-all;">{_e(valor)}</td></tr>'
            if es_codigo
            else f'<td style="padding:4px 0;font-weight:bold;">{_e(valor)}</td></tr>'
        )
        for etiqueta, valor, es_codigo in filas
    )
    return f'<table role="presentation" style="width:100%;border-collapse:collapse;margin:16px 0;">{html_filas}</table>'


# content_id del QR incrustado (referenciado como cid: en el <img> de abajo)
# -- Gmail y la mayoria de clientes de correo bloquean imagenes data: URI
# incrustadas directo en el HTML (verificado en esta sesion), cid: con un
# adjunto real es el mecanismo estandar que si funciona.
QR_CONTENT_ID = "qr-code"


def _qr(alt: str) -> str:
    return f"""
      <div style="text-align:center;margin:20px 0;">
        <img src="cid:{QR_CONTENT_ID}" alt="{_e(alt)}" width="160" height="160" style="width:160px;height:160px;" />
      </div>"""


_ADJUNTOS = "<p>Adjuntamos la representación gráfica en PDF y el archivo XML, que es el soporte legal ante la DIAN.</p>"


def plantilla_reset_password(nombre: str, reset_url: str) -> tuple[str, str]:
    subject = "Recupera tu contraseña de IngeFact"
    contenido = f"""
      <h2>Hola, {_e(nombre)}</h2>
      <p>Recibimos una solicitud para restablecer tu contraseña. Si fuiste tú, usa el botón de abajo:</p>
      {_boton(reset_url, "Restablecer contraseña")}
      <p>El enlace vence en 30 minutos. Si no fuiste tú, ignora este correo: tu contraseña no cambiará.</p>
    """
    motivo = "Recibes este correo porque se pidió restablecer la contraseña de tu cuenta de IngeFact."
    return subject, _layout(contenido, motivo)


def plantilla_invitacion_tenant(nombre: str, email: str, password_temporal: str, login_url: str) -> tuple[str, str]:
    subject = "Tu cuenta de IngeFact está lista"
    contenido = f"""
      <h2>Hola, {_e(nombre)}</h2>
      <p>Creamos tu acceso a IngeFact. Estas son tus credenciales iniciales:</p>
      {_tabla([("Correo", email, False), ("Clave temporal", password_temporal, True)])}
      {_boton(login_url, "Iniciar sesión")}
      <p>Por seguridad, la primera vez que ingreses te pediremos cambiar esta clave y aceptar los términos y la
      política de tratamiento de datos.</p>
    """
    motivo = "Recibes este correo porque se creó una cuenta de IngeFact para tu empresa."
    return subject, _layout(contenido, motivo)


def plantilla_factura_cliente(
    *,
    razon_social_emisor: str,
    nombre_cliente: str,
    numero_completo: str,
    fecha: str,
    total_formateado: str,
    cufe: str,
) -> tuple[str, str]:
    subject = f"Factura electrónica {numero_completo} de {razon_social_emisor}"
    contenido = f"""
      <h2>Hola, {_e(nombre_cliente)}</h2>
      <p>{_e(razon_social_emisor)} te envió la factura electrónica <strong>{_e(numero_completo)}</strong>, con fecha {_e(fecha)}.</p>
      {_qr("Código QR de la factura")}
      {_tabla([("Total", total_formateado, False), ("CUFE", cufe, True)])}
      {_ADJUNTOS}
    """
    return subject, _layout(contenido, _motivo_documento(razon_social_emisor))


def plantilla_nota_cliente(
    *,
    tipo: str,
    razon_social_emisor: str,
    nombre_cliente: str,
    numero_completo: str,
    factura_afectada: str,
    fecha: str,
    total_formateado: str,
    cude: str,
) -> tuple[str, str]:
    """`tipo` = "credito" | "debito"."""
    nombre_tipo = "crédito" if tipo == "credito" else "débito"
    subject = f"Nota {nombre_tipo} electrónica {numero_completo} de {razon_social_emisor}"
    contenido = f"""
      <h2>Hola, {_e(nombre_cliente)}</h2>
      <p>{_e(razon_social_emisor)} te envió la nota {nombre_tipo} electrónica <strong>{_e(numero_completo)}</strong>,
      con fecha {_e(fecha)}, sobre la factura <strong>{_e(factura_afectada)}</strong>.</p>
      {_qr(f"Código QR de la nota {nombre_tipo}")}
      {_tabla([("Total", total_formateado, False), ("CUDE", cude, True)])}
      {_ADJUNTOS}
    """
    return subject, _layout(contenido, _motivo_documento(razon_social_emisor))


def plantilla_documento_soporte_proveedor(
    *,
    razon_social_adquiriente: str,
    nombre_proveedor: str,
    numero_completo: str,
    fecha: str,
    total_formateado: str,
    cuds: str,
) -> tuple[str, str]:
    subject = f"Documento soporte {numero_completo} de {razon_social_adquiriente}"
    contenido = f"""
      <h2>Hola, {_e(nombre_proveedor)}</h2>
      <p>{_e(razon_social_adquiriente)} te envió el documento soporte en adquisiciones <strong>{_e(numero_completo)}</strong>,
      con fecha {_e(fecha)}.</p>
      {_qr("Código QR del documento soporte")}
      {_tabla([("Total", total_formateado, False), ("CUDS", cuds, True)])}
      {_ADJUNTOS}
    """
    return subject, _layout(contenido, _motivo_documento(razon_social_adquiriente))


def plantilla_nomina_empleado(
    *,
    razon_social_empleador: str,
    nombre_empleado: str,
    numero_completo: str,
    fecha: str,
    total_formateado: str,
    cune: str,
) -> tuple[str, str]:
    subject = f"Comprobante de nómina {numero_completo} de {razon_social_empleador}"
    contenido = f"""
      <h2>Hola, {_e(nombre_empleado)}</h2>
      <p>{_e(razon_social_empleador)} te envió tu comprobante de nómina electrónica <strong>{_e(numero_completo)}</strong>,
      con fecha {_e(fecha)}.</p>
      {_qr("Código QR del comprobante de nómina")}
      {_tabla([("Neto a pagar", total_formateado, False), ("CUNE", cune, True)])}
      {_ADJUNTOS}
    """
    return subject, _layout(contenido, _motivo_documento(razon_social_empleador))


def plantilla_alerta_cuota(razon_social: str, documentos_usados: int, max_documentos: int) -> tuple[str, str]:
    subject = "Tu paquete de documentos está por agotarse"
    contenido = f"""
      <h2>Hola, {_e(razon_social)}</h2>
      <p>Ya usaste <strong>{_e(documentos_usados)} de {_e(max_documentos)}</strong> documentos de tu paquete actual.</p>
      <p>Cuando se agote no podrás enviar ningún documento a la DIAN (facturas, notas crédito y débito, documentos
      soporte, nómina ni eventos sobre facturas recibidas) hasta comprar otro paquete.</p>
      <p>Escríbenos para comprar un nuevo paquete a tiempo.</p>
    """
    motivo = "Recibes este correo porque tu empresa tiene un paquete de documentos activo en IngeFact."
    return subject, _layout(contenido, motivo)
