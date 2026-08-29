def nit_check_digit(nit: str) -> str:
    """Algoritmo oficial DIAN para el digito de verificacion (DV) de un NIT colombiano."""
    weights = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71]
    digits = [int(d) for d in nit.zfill(15)]
    total = sum(d * w for d, w in zip(reversed(digits), weights))
    remainder = total % 11
    return str(remainder) if remainder in (0, 1) else str(11 - remainder)


def is_valid_dv(nit: str, dv: str) -> bool:
    return nit.isdigit() and nit_check_digit(nit) == dv.strip()
