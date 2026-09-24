"""Version vigente de los textos legales publicados en la landing
(/terminos y /privacidad). Al cambiarlos de forma sustancial se sube esta
version: todos los usuarios tenant tendran que volver a aceptarlos en su
siguiente ingreso (ver AceptacionLegalService)."""

VERSION_TERMINOS_VIGENTE = "2026-09-24"

# Resolucion DIAN 000165 de 2023, art. 11, numeral 18: la representacion
# grafica debe identificar al fabricante del software (nombre y NIT), el nombre
# del software y el proveedor tecnologico. NITs verificados con nit_check_digit.
# Mismo texto en apps/user/src/utils/pieLegalDocumento.js (vista en pantalla).
PIE_SOFTWARE_DOCUMENTO = (
    "Software: IngeFact. Fabricante del software: Bernardo Andrés Otero Jiménez "
    "(TecnoIngenieria B.O.), NIT 1083000777-7. Proveedor tecnológico: Soluciones "
    "Alegra S.A.S., NIT 900.559.088-2."
)

URL_SITIO = "https://ingefact.com"
URL_TERMINOS = f"{URL_SITIO}/terminos"
URL_POLITICA_DATOS = f"{URL_SITIO}/privacidad"
