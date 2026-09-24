from src.core.email_templates import (
    plantilla_alerta_cuota,
    plantilla_documento_soporte_proveedor,
    plantilla_factura_cliente,
    plantilla_invitacion_tenant,
    plantilla_nomina_empleado,
    plantilla_nota_cliente,
    plantilla_reset_password,
)
from src.core.legal import URL_POLITICA_DATOS

_MALICIOSO = '<a href="https://phishing.example">Paga aqui</a>'


def _todas_las_plantillas(valor: str) -> list[tuple[str, str]]:
    return [
        plantilla_reset_password(valor, "https://app.ingefact.com/reset-password?token=x"),
        plantilla_invitacion_tenant(valor, "a@example.com", "Temp123", "https://app.ingefact.com/login"),
        plantilla_factura_cliente(
            razon_social_emisor=valor, nombre_cliente=valor, numero_completo="FE1", fecha="2026-09-24",
            total_formateado="$1", cufe="abc",
        ),
        plantilla_nota_cliente(
            tipo="credito", razon_social_emisor=valor, nombre_cliente=valor, numero_completo="NC1",
            factura_afectada="FE1", fecha="2026-09-24", total_formateado="$1", cude="abc",
        ),
        plantilla_documento_soporte_proveedor(
            razon_social_adquiriente=valor, nombre_proveedor=valor, numero_completo="DS1", fecha="2026-09-24",
            total_formateado="$1", cuds="abc",
        ),
        plantilla_nomina_empleado(
            razon_social_empleador=valor, nombre_empleado=valor, numero_completo="NE1", fecha="2026-09-24",
            total_formateado="$1", cune="abc",
        ),
        plantilla_alerta_cuota(valor, 9, 10),
    ]


def test_ninguna_plantilla_permite_inyectar_html_con_datos_del_tenant():
    for _subject, html in _todas_las_plantillas(_MALICIOSO):
        assert "phishing.example\">" not in html
        assert "&lt;a href=&quot;https://phishing.example&quot;&gt;" in html


def test_todas_las_plantillas_enlazan_la_politica_de_datos_y_explican_el_motivo():
    for _subject, html in _todas_las_plantillas("Empresa Demo SAS"):
        assert URL_POLITICA_DATOS in html
        assert "Recibes este correo porque" in html


def test_correos_a_terceros_indican_que_el_emisor_es_el_responsable():
    _subject, html = plantilla_factura_cliente(
        razon_social_emisor="Empresa Demo SAS", nombre_cliente="Cliente", numero_completo="FE1",
        fecha="2026-09-24", total_formateado="$1", cufe="abc",
    )
    assert "Empresa Demo SAS es responsable de tus datos personales" in html


def test_alerta_de_cupo_describe_lo_que_se_bloquea_hoy():
    _subject, html = plantilla_alerta_cuota("Empresa", 9, 10)

    assert "no podrás enviar ningún documento a la DIAN" in html
    assert "eventos sobre facturas recibidas" in html
