import base64
from io import BytesIO

import pytest
from fastapi import HTTPException
from openpyxl import Workbook
from pydantic import ValidationError

from src.application.factura_recibida_service import FacturaRecibidaService
from src.core.alegra_client import AlegraApiError, AlegraTransientError
from src.core.reporte_dian_parser import ReporteDianInvalido, parsear_reporte_dian
from src.domain.factura_recibida import (
    MOTIVO_CONTADO,
    MOTIVO_EMITIDA_POR_EMPRESA,
    MOTIVO_NO_ES_FACTURA,
    MOTIVO_OTRO_RECEPTOR,
    MOTIVO_REPETIDA,
    MOTIVO_YA_REGISTRADA,
    CargarLoteFacturasRecibidasRequest,
    CrearFacturaRecibidaRequest,
    LeerReporteDianRequest,
)
from tests.test_factura_recibida_service import NIT_EMPRESA, _crear_empresa, _respuesta_dian, _xml_factura

# Mismos encabezados (y en el mismo orden) que exporta el portal de la DIAN.
ENCABEZADOS = (
    "Tipo de documento", "CUFE/CUDE", "Folio", "Prefijo", "Divisa", "Forma de Pago", "Medio de Pago",
    "Fecha Emisión", "Fecha Recepción", "NIT Emisor", "Nombre Emisor", "NIT Receptor", "Nombre Receptor",
    "IVA", "Total", "Estado", "Grupo",
)


def _fila(cufe, *, tipo="Factura electrónica", forma_pago="2", receptor=NIT_EMPRESA, grupo="Recibido",
          estado="Aprobado con notificación"):
    return (tipo, cufe, "45", "FEV", "COP", forma_pago, "10", "22-10-2026", "2026-10-22T16:19:10",
            "800123456", "Distribuidora Andina SAS", receptor, "Empresa Demo SAS", 0, 119000, estado, grupo)


def _excel(filas, encabezados=ENCABEZADOS) -> bytes:
    libro = Workbook()
    hoja = libro.active
    hoja.append(encabezados)
    for fila in filas:
        hoja.append(fila)
    salida = BytesIO()
    libro.save(salida)
    return salida.getvalue()


def _request(contenido: bytes, nombre="reporte.xlsx") -> LeerReporteDianRequest:
    return LeerReporteDianRequest(nombre_archivo=nombre, contenido_base64=base64.b64encode(contenido).decode())


class _FakeAlegraPorCufe:
    """Devuelve un documento distinto por CUFE; un valor Exception se lanza."""

    def __init__(self, documentos: dict):
        self._documentos = documentos
        self.consultados = []

    def get_document_by_track_id(self, track_id):
        self.consultados.append(track_id)
        documento = self._documentos[track_id]
        if isinstance(documento, Exception):
            raise documento
        return documento


def _servicio(db_session, documentos=None):
    fake = _FakeAlegraPorCufe(documentos or {})
    return FacturaRecibidaService(db_session, alegra_client=fake), fake


# --- Lector del Excel ---


def test_parser_lee_columnas_por_nombre_sin_importar_orden_ni_tildes():
    encabezados = ("grupo", "NIT RECEPTOR", "Forma de pago", "cufe/cude", "TIPO DE DOCUMENTO", "Fecha Emision")
    contenido = _excel([("Recibido", 900618467, 2, "abc", "Factura electrónica", "01-10-2026")], encabezados)

    filas = parsear_reporte_dian(contenido)

    assert len(filas) == 1
    assert filas[0].cufe == "abc"
    assert filas[0].nit_receptor == "900618467"
    assert filas[0].forma_pago == "2"
    assert filas[0].fecha_emision == "01-10-2026"


def test_parser_salta_filas_vacias():
    filas = parsear_reporte_dian(_excel([_fila("a"), (None,) * len(ENCABEZADOS), _fila("b")]))
    assert [f.cufe for f in filas] == ["a", "b"]


def test_parser_rechaza_un_archivo_que_no_es_excel():
    with pytest.raises(ReporteDianInvalido, match="no es un Excel"):
        parsear_reporte_dian(b"esto no es un xlsx")


def test_parser_rechaza_un_excel_sin_las_columnas_del_reporte():
    with pytest.raises(ReporteDianInvalido, match="no parece el reporte"):
        parsear_reporte_dian(_excel([("x", "y")], ("Nombre", "Valor")))


def test_request_exige_xlsx():
    with pytest.raises(ValidationError, match=r"\.xlsx"):
        _request(_excel([]), nombre="reporte.csv")


def test_lote_limita_la_cantidad_de_cufes():
    with pytest.raises(ValidationError, match="como máximo"):
        CargarLoteFacturasRecibidasRequest(cufes=[f"c{i}" for i in range(21)])


# --- Paso 1: leer y clasificar ---


def test_leer_reporte_deja_solo_facturas_recibidas_a_credito_de_la_empresa(db_session):
    empresa = _crear_empresa(db_session)
    service, fake = _servicio(db_session)
    contenido = _excel([
        _fila("credito-1"),
        _fila("contado-1", forma_pago="1"),
        _fila("nota-1", tipo="Nota de crédito electrónica"),
        _fila("nomina-1", tipo="Nomina Individual", forma_pago=""),
        _fila("emitida-1", grupo="Emitido", receptor="12623519"),
        _fila("otro-comprador", receptor="111111111"),
        _fila("credito-2"),
        _fila("credito-1"),
    ])

    lectura = service.leer_reporte_dian(empresa.id, _request(contenido))

    assert lectura.total_filas == 8
    assert [c.cufe for c in lectura.candidatas] == ["credito-1", "credito-2"]
    assert lectura.candidatas[0].numero == "FEV45"
    assert lectura.candidatas[0].proveedor_nombre == "Distribuidora Andina SAS"
    assert {o.motivo: o.cantidad for o in lectura.omitidas} == {
        MOTIVO_CONTADO: 1,
        MOTIVO_NO_ES_FACTURA: 2,
        MOTIVO_EMITIDA_POR_EMPRESA: 1,
        MOTIVO_OTRO_RECEPTOR: 1,
        MOTIVO_REPETIDA: 1,
    }
    assert fake.consultados == []  # leer no llama a la DIAN


def test_leer_reporte_omite_las_ya_registradas(db_session):
    empresa = _crear_empresa(db_session)
    service, _ = _servicio(db_session, {"credito-1": _respuesta_dian()})
    service.crear(empresa.id, CrearFacturaRecibidaRequest(cufe="credito-1"))

    lectura = service.leer_reporte_dian(empresa.id, _request(_excel([_fila("credito-1"), _fila("credito-2")])))

    assert [c.cufe for c in lectura.candidatas] == ["credito-2"]
    assert {o.motivo: o.cantidad for o in lectura.omitidas} == {MOTIVO_YA_REGISTRADA: 1}


def test_leer_reporte_compara_el_nit_sin_digito_de_verificacion_ni_puntos(db_session):
    empresa = _crear_empresa(db_session)
    service, _ = _servicio(db_session)

    lectura = service.leer_reporte_dian(empresa.id, _request(_excel([_fila("c1", receptor="900.618.467")])))

    assert [c.cufe for c in lectura.candidatas] == ["c1"]


def test_leer_reporte_invalido_responde_422(db_session):
    empresa = _crear_empresa(db_session)
    service, _ = _servicio(db_session)

    with pytest.raises(HTTPException) as exc:
        service.leer_reporte_dian(empresa.id, _request(b"no es excel"))

    assert exc.value.status_code == 422


# --- Paso 2: cargar un lote ---


def test_cargar_lote_registra_cada_cufe_y_reporta_lo_que_no_se_pudo(db_session):
    empresa = _crear_empresa(db_session)
    service, fake = _servicio(db_session, {
        "ok": _respuesta_dian(),
        "contado": _respuesta_dian(_xml_factura(forma_pago="1")),
        "ajena": _respuesta_dian(_xml_factura(adquiriente="111111111")),
        "caida": AlegraTransientError("timeout"),
        "inexistente": AlegraApiError(404, {}),
    })

    resultados = service.cargar_lote(empresa.id, ["ok", "contado", "ajena", "caida", "inexistente"])

    por_cufe = {r.cufe: r for r in resultados}
    assert por_cufe["ok"].resultado == "cargada"
    assert por_cufe["ok"].factura.numero == "FEV123"
    assert por_cufe["contado"].resultado == "omitida"
    assert "contado" in por_cufe["contado"].mensaje
    assert por_cufe["ajena"].resultado == "omitida"
    assert por_cufe["caida"].resultado == "error"
    assert por_cufe["inexistente"].resultado == "error"
    assert fake.consultados == ["ok", "contado", "ajena", "caida", "inexistente"]
    assert [f.cufe for f in service.listar(empresa.id)] == ["ok"]


def test_cargar_lote_dos_veces_no_duplica(db_session):
    empresa = _crear_empresa(db_session)
    service, _ = _servicio(db_session, {"ok": _respuesta_dian()})

    service.cargar_lote(empresa.id, ["ok"])
    segundo = service.cargar_lote(empresa.id, ["ok"])

    assert segundo[0].resultado == "omitida"
    assert segundo[0].mensaje == "Ya registraste esta factura."
    assert len(service.listar(empresa.id)) == 1
