"""Plantillas de correo transaccional. Funciones puras que devuelven
(subject, html) -- sin motor de plantillas (Jinja2 no es dependencia del
proyecto), f-strings simples alcanzan para el volumen de correos del MVP."""

_FOOTER = """
<p style="color:#94a3b8;font-size:12px;margin-top:32px;">
  IngeFact -- Facturacion electronica para Colombia
</p>
"""


def plantilla_reset_password(nombre: str, reset_url: str) -> tuple[str, str]:
    subject = "Recupera tu contrasena de IngeFact"
    html = f"""
    <div style="font-family:sans-serif;color:#1e293b;max-width:480px;margin:0 auto;">
      <h2>Hola, {nombre}</h2>
      <p>Recibimos una solicitud para restablecer tu contrasena. Si fuiste tu, haz clic en el boton de abajo:</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="{reset_url}" style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">
          Restablecer contrasena
        </a>
      </p>
      <p>Este link vence en 30 minutos. Si no fuiste tu, puedes ignorar este correo.</p>
      {_FOOTER}
    </div>
    """
    return subject, html


def plantilla_invitacion_tenant(nombre: str, email: str, password_temporal: str, login_url: str) -> tuple[str, str]:
    subject = "Tu cuenta de IngeFact esta lista"
    html = f"""
    <div style="font-family:sans-serif;color:#1e293b;max-width:480px;margin:0 auto;">
      <h2>Hola, {nombre}</h2>
      <p>Se creo tu acceso al panel de IngeFact. Estas son tus credenciales iniciales:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:4px 0;color:#64748b;">Correo</td><td style="padding:4px 0;font-weight:bold;">{email}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">Clave temporal</td><td style="padding:4px 0;font-weight:bold;font-family:monospace;">{password_temporal}</td></tr>
      </table>
      <p style="text-align:center;margin:24px 0;">
        <a href="{login_url}" style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">
          Iniciar sesion
        </a>
      </p>
      <p>Por seguridad, el sistema te pedira cambiar esta clave la primera vez que inicies sesion.</p>
      {_FOOTER}
    </div>
    """
    return subject, html


def plantilla_factura_cliente(
    *,
    razon_social_emisor: str,
    nombre_cliente: str,
    numero_completo: str,
    fecha: str,
    total_formateado: str,
    cufe: str,
    qr_base64: str,
) -> tuple[str, str]:
    subject = f"Factura electronica {numero_completo} de {razon_social_emisor}"
    html = f"""
    <div style="font-family:sans-serif;color:#1e293b;max-width:480px;margin:0 auto;">
      <h2>Hola, {nombre_cliente}</h2>
      <p>{razon_social_emisor} te envio la factura electronica <strong>{numero_completo}</strong>, con fecha {fecha}.</p>
      <div style="text-align:center;margin:20px 0;">
        <img src="data:image/png;base64,{qr_base64}" alt="Codigo QR de la factura" style="width:160px;height:160px;" />
      </div>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:4px 0;color:#64748b;">Total</td><td style="padding:4px 0;font-weight:bold;">{total_formateado}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">CUFE</td><td style="padding:4px 0;font-family:monospace;font-size:11px;word-break:break-all;">{cufe}</td></tr>
      </table>
      <p>Adjunto va el archivo XML del documento, el soporte legal ante la DIAN.</p>
      {_FOOTER}
    </div>
    """
    return subject, html
