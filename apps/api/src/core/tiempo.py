from datetime import date, datetime
from zoneinfo import ZoneInfo

ZONA_HORARIA_COLOMBIA = ZoneInfo("America/Bogota")


def ahora_colombia() -> datetime:
    """Instante actual expresado en hora de Colombia (UTC-5, sin horario de
    verano). El servidor puede correr en cualquier zona horaria (en
    produccion, el contenedor Docker corre en UTC) -- usar esto en vez de
    `datetime.now()`/`date.today()` para cualquier calculo de "hoy" o "este
    mes" que le importe al negocio (vencimientos, cortes de periodo, KPIs),
    donde el dia calendario relevante es el de Colombia, no el del
    servidor."""
    return datetime.now(ZONA_HORARIA_COLOMBIA)


def hoy_colombia() -> date:
    """Fecha calendario actual en Colombia -- ver ahora_colombia()."""
    return ahora_colombia().date()


def fecha_documento_colombia(fecha_envio: datetime | None, fecha: date) -> date:
    """Dia calendario en Colombia para mostrar en el correo/PDF de un
    documento (Factura/Nota/Documento Soporte): si ya se envio, se deriva
    de `fecha_envio` (datetime aware en UTC) convertido a Colombia; si no
    se ha enviado todavia, se usa `fecha` (la fecha de negocio del
    documento), que ya es el dia calendario correcto sin conversion.

    Sin esto, un documento enviado entre las 7pm y la medianoche hora
    Colombia se mostraba fechado un dia adelante (fecha_envio en UTC ya
    era el dia siguiente)."""
    return fecha_envio.astimezone(ZONA_HORARIA_COLOMBIA).date() if fecha_envio else fecha
