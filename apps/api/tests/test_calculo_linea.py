import pytest

from src.core.calculo_linea import base_gravable_iva, calcular_linea, excluido_proporcional


def test_sin_excluido_se_comporta_como_antes():
    calculo = calcular_linea(cantidad=2, precio_unitario=100000, tarifa=19)

    assert calculo.subtotal_linea == 200000
    assert calculo.valor_impuesto_excluido == 0
    assert calculo.base_gravable_iva == 200000
    assert calculo.impuesto_linea == 38000
    assert calculo.total_linea == 238000


def test_excluido_reduce_solo_la_base_del_iva():
    """Caso real: 60.000 al cliente = base 42.857,14 + IVA 8.142,86 + ICL 9.000
    embebido que no se factura como tributo."""
    calculo = calcular_linea(cantidad=1, precio_unitario=51857.14, tarifa=19, valor_impuesto_excluido=9000)

    assert calculo.subtotal_linea == 51857.14
    assert calculo.base_gravable_iva == 42857.14
    assert calculo.impuesto_linea == 8142.86
    assert calculo.total_linea == 60000.00


def test_excluido_con_cantidad_mayor_a_uno_es_valor_total_de_la_linea():
    calculo = calcular_linea(cantidad=3, precio_unitario=50000, tarifa=19, valor_impuesto_excluido=27000)

    assert calculo.subtotal_linea == 150000
    assert calculo.base_gravable_iva == 123000
    assert calculo.impuesto_linea == 23370
    assert calculo.total_linea == 173370


def test_excluido_igual_al_subtotal_deja_iva_en_cero():
    calculo = calcular_linea(cantidad=1, precio_unitario=9000, tarifa=19, valor_impuesto_excluido=9000)

    assert calculo.base_gravable_iva == 0
    assert calculo.impuesto_linea == 0
    assert calculo.total_linea == 9000


@pytest.mark.parametrize("excluido", [-1, 100001])
def test_excluido_negativo_o_mayor_al_subtotal_lanza_error(excluido):
    with pytest.raises(ValueError):
        calcular_linea(cantidad=1, precio_unitario=100000, tarifa=19, valor_impuesto_excluido=excluido)


def test_base_gravable_iva_resta_el_excluido():
    assert base_gravable_iva(51857.14, 9000) == 42857.14
    assert base_gravable_iva(100, 0) == 100


def test_excluido_proporcional_reparte_por_cantidad():
    assert excluido_proporcional(18000, cantidad_origen=2, cantidad=1, subtotal_linea=51857.14) == 9000
    assert excluido_proporcional(18000, cantidad_origen=2, cantidad=2, subtotal_linea=103714.28) == 18000


def test_excluido_proporcional_no_supera_el_subtotal():
    assert excluido_proporcional(10, cantidad_origen=3, cantidad=1, subtotal_linea=3.33) == 3.33


def test_excluido_proporcional_sin_cantidad_origen_es_cero():
    assert excluido_proporcional(100, cantidad_origen=0, cantidad=1, subtotal_linea=50) == 0
