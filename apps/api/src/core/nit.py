def nit_check_digit(nit: str) -> str:
    """Algoritmo oficial DIAN para el digito de verificacion (DV) de un NIT colombiano."""
    weights = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71]
    digits = [int(d) for d in nit.zfill(15)]
    total = sum(d * w for d, w in zip(reversed(digits), weights))
    remainder = total % 11
    return str(remainder) if remainder in (0, 1) else str(11 - remainder)


def is_valid_dv(nit: str, dv: str) -> bool:
    return nit.isdigit() and nit_check_digit(nit) == dv.strip()


NIT_IDENTIFICATION_TYPE = "31"


def dv_para_customer_alegra(tipo_identificacion: str, numero_identificacion: str) -> str | None:
    """Alegra exige "dv" en el customer de facturas/notas cuando el
    adquiriente se identifica con NIT (tipo "31") -- el DV es un digito de
    verificacion derivable matematicamente del NIT (algoritmo DIAN), no un
    dato independiente, asi que se calcula aqui en vez de pedirlo en el
    formulario de Clientes. None para los demas tipos de identificacion
    (cedula, pasaporte, etc.), que no lo requieren."""
    if tipo_identificacion != NIT_IDENTIFICATION_TYPE or not numero_identificacion.isdigit():
        return None
    return nit_check_digit(numero_identificacion)
