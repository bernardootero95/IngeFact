import pytest

from src.core.precio_paquete import costo_alegra_mes, precio_paquete


@pytest.mark.parametrize(
    "documentos,precio",
    [(0, 0), (1, 20000), (25, 46000), (50, 92000), (150, 142000), (500, 317000), (1500, 650000), (5000, 1350000)],
)
def test_precio_coincide_con_la_calculadora_del_admin(documentos, precio):
    assert precio_paquete(documentos) == precio


def test_costo_alegra_solo_mensualidad_dentro_de_los_incluidos():
    assert costo_alegra_mes(0) == 120000
    assert costo_alegra_mes(1000) == 120000


def test_costo_alegra_cobra_tarifa_por_el_excedente():
    assert costo_alegra_mes(1500) == 120000 + 500 * 14


def test_costo_alegra_cambia_de_tarifa_por_volumen():
    assert costo_alegra_mes(200010) == 120000 + (200000 - 1000) * 14 + 10 * 10
