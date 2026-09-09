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
