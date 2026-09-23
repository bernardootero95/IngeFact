from datetime import date, timezone

from src.core.tiempo import ZONA_HORARIA_COLOMBIA, ahora_colombia, fecha_documento_colombia, hoy_colombia


def test_ahora_colombia_esta_en_utc_menos_5():
    dt = ahora_colombia()
    assert dt.tzinfo is not None
    assert dt.utcoffset().total_seconds() == -5 * 3600


def test_hoy_colombia_devuelve_un_date_coherente_con_ahora_colombia():
    assert hoy_colombia() == ahora_colombia().date()
    assert isinstance(hoy_colombia(), date)


def test_zona_horaria_colombia_no_tiene_horario_de_verano():
    # America/Bogota es UTC-5 todo el ano (sin DST) -- verifica enero y julio.
    from datetime import datetime

    enero = datetime(2026, 1, 15, 12, 0, tzinfo=ZONA_HORARIA_COLOMBIA)
    julio = datetime(2026, 7, 15, 12, 0, tzinfo=ZONA_HORARIA_COLOMBIA)
    assert enero.utcoffset().total_seconds() == -5 * 3600
    assert julio.utcoffset().total_seconds() == -5 * 3600


def test_fecha_documento_colombia_sin_envio_usa_la_fecha_de_negocio():
    assert fecha_documento_colombia(None, date(2026, 9, 22)) == date(2026, 9, 22)


def test_fecha_documento_colombia_no_se_adelanta_un_dia_en_la_noche():
    """Caso real: una factura enviada a las 8:38pm hora Colombia (1:38am UTC
    del dia siguiente) debe mostrar el correo con la fecha de Colombia, no
    la de UTC."""
    from datetime import datetime

    enviado_8_38pm_colombia = datetime(2026, 9, 23, 1, 38, 0, tzinfo=timezone.utc)
    assert fecha_documento_colombia(enviado_8_38pm_colombia, date(2026, 9, 22)) == date(2026, 9, 22)


def test_fecha_documento_colombia_con_envio_en_la_manana_no_cambia():
    from datetime import datetime

    enviado_10am_colombia = datetime(2026, 9, 22, 15, 0, 0, tzinfo=timezone.utc)
    assert fecha_documento_colombia(enviado_10am_colombia, date(2026, 9, 22)) == date(2026, 9, 22)
