import pytest

from src.core.nit import is_valid_dv, nit_check_digit


@pytest.mark.parametrize(
    "nit,dv",
    [
        # NITs generados por este mismo algoritmo y ACEPTADOS por Alegra en Sprint 0
        # (POST /companies respondio 201) -- confirmacion real, no solo teorica.
        ("900618467", "4"),
        ("900025934", "7"),
    ],
)
def test_nit_check_digit_matches_alegra_accepted_values(nit, dv):
    assert nit_check_digit(nit) == dv
    assert is_valid_dv(nit, dv)


def test_is_valid_dv_rejects_wrong_digit():
    assert not is_valid_dv("900618467", "9")


def test_is_valid_dv_rejects_non_numeric():
    assert not is_valid_dv("900abc467", "4")
