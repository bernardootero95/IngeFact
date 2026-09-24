import uuid
from datetime import date

import pytest
from fastapi import HTTPException

from src.application.empleado_service import EmpleadoService
from src.domain.empleado import ActualizarEmpleadoRequest, CrearEmpleadoRequest
from src.infrastructure.db.models import Empresa


def _crear_empresa(db_session, **overrides) -> Empresa:
    data = {
        "razon_social": "Empresa Demo SAS",
        "numero_identificacion": "900618467",
        "digito_verificacion": "4",
        "correo_electronico": "demo@example.com",
        "estado": "activo",
    }
    data.update(overrides)
    empresa = Empresa(**data)
    db_session.add(empresa)
    db_session.commit()
    db_session.refresh(empresa)
    return empresa


def _payload(**overrides) -> CrearEmpleadoRequest:
    data = {
        "tipo_documento": "13",
        "numero_documento": "1000000000",
        "primer_apellido": "Perez",
        "primer_nombre": "Juan",
        "tipo_trabajador": "01",
        "subtipo_trabajador": "00",
        "tipo_contrato": "1",
        "sueldo": 2000000,
        "lugar_trabajo_municipio": "11001",
        "lugar_trabajo_direccion": "Calle 1 # 2-3",
        "fecha_ingreso": date(2024, 1, 15),
    }
    data.update(overrides)
    return CrearEmpleadoRequest(**data)


def test_crear_y_listar(db_session):
    empresa = _crear_empresa(db_session)
    service = EmpleadoService(db_session)

    service.crear(empresa.id, _payload())

    empleados = service.listar(empresa.id)
    assert len(empleados) == 1
    assert empleados[0].primer_nombre == "Juan"
    assert empleados[0].lugar_trabajo_pais == "CO"  # default


def test_sueldo_debe_ser_positivo():
    with pytest.raises(ValueError, match="sueldo debe ser mayor a 0"):
        _payload(sueldo=0)


def test_fecha_retiro_no_puede_ser_anterior_al_ingreso():
    with pytest.raises(ValueError, match="fecha de retiro no puede ser anterior"):
        _payload(fecha_ingreso=date(2024, 1, 15), fecha_retiro=date(2023, 1, 1))


def test_crear_documento_duplicado_lanza_409(db_session):
    empresa = _crear_empresa(db_session)
    service = EmpleadoService(db_session)
    service.crear(empresa.id, _payload())

    with pytest.raises(HTTPException) as exc_info:
        service.crear(empresa.id, _payload(primer_nombre="Otro"))
    assert exc_info.value.status_code == 409


def test_mismo_numero_documento_con_tipo_distinto_no_choca(db_session):
    """El documento unico es (tipo_documento, numero_documento) junto -- un
    NIT y una cedula con el mismo numero (caso raro pero posible) no deben
    chocar entre si."""
    empresa = _crear_empresa(db_session)
    service = EmpleadoService(db_session)
    service.crear(empresa.id, _payload(tipo_documento="13", numero_documento="1000000000"))

    empleado_2 = service.crear(empresa.id, _payload(tipo_documento="31", numero_documento="1000000000"))
    assert empleado_2.tipo_documento == "31"


def test_listar_no_mezcla_empleados_de_otro_tenant(db_session):
    empresa_a = _crear_empresa(db_session, numero_identificacion="900618467")
    empresa_b = _crear_empresa(db_session, numero_identificacion="900618468")
    service = EmpleadoService(db_session)
    service.crear(empresa_a.id, _payload())

    assert len(service.listar(empresa_a.id)) == 1
    assert len(service.listar(empresa_b.id)) == 0


def test_listar_busca_por_nombre_apellido_o_documento(db_session):
    empresa = _crear_empresa(db_session)
    service = EmpleadoService(db_session)
    service.crear(empresa.id, _payload(numero_documento="1000000000", primer_nombre="Ana", primer_apellido="Gomez"))
    service.crear(empresa.id, _payload(numero_documento="1000000001", primer_nombre="Luis", primer_apellido="Diaz"))

    por_nombre = service.listar(empresa.id, search="ana")
    assert len(por_nombre) == 1
    assert por_nombre[0].primer_apellido == "Gomez"

    por_documento = service.listar(empresa.id, search="1000000001")
    assert len(por_documento) == 1
    assert por_documento[0].primer_nombre == "Luis"


def test_obtener_404_si_no_existe_o_es_de_otro_tenant(db_session):
    empresa_a = _crear_empresa(db_session, numero_identificacion="900618467")
    empresa_b = _crear_empresa(db_session, numero_identificacion="900618468")
    service = EmpleadoService(db_session)
    empleado = service.crear(empresa_a.id, _payload())

    with pytest.raises(HTTPException) as exc_info:
        service.obtener(empresa_b.id, empleado.id)
    assert exc_info.value.status_code == 404

    with pytest.raises(HTTPException):
        service.obtener(empresa_a.id, uuid.uuid4())


def test_actualizar_cambia_los_datos(db_session):
    empresa = _crear_empresa(db_session)
    service = EmpleadoService(db_session)
    empleado = service.crear(empresa.id, _payload())

    actualizado = service.actualizar(
        empresa.id,
        empleado.id,
        ActualizarEmpleadoRequest(
            **{**_payload().model_dump(), "sueldo": 2500000, "primer_nombre": "Juan Carlos"}
        ),
    )

    assert actualizado.primer_nombre == "Juan Carlos"
    assert float(actualizado.sueldo) == 2500000


def test_eliminar_es_soft_delete_y_libera_el_documento(db_session):
    empresa = _crear_empresa(db_session)
    service = EmpleadoService(db_session)
    empleado = service.crear(empresa.id, _payload())

    service.eliminar(empresa.id, empleado.id)

    assert service.listar(empresa.id) == []
    with pytest.raises(HTTPException):
        service.obtener(empresa.id, empleado.id)

    nuevo = service.crear(empresa.id, _payload(primer_nombre="Reencarnado"))
    assert nuevo.numero_documento == "1000000000"
