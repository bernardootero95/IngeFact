import xml.etree.ElementTree as ET


def extraer_firma_digital(xml_bytes: bytes) -> str | None:
    """Busca <ds:SignatureValue> en un XML firmado por Alegra, por
    local-name namespace-agnostico (el prefijo puede variar) -- verificado
    contra XML reales de facturas y notas credito en el sandbox. Compartido
    entre FacturaService/NotaCreditoService/NotaDebitoService."""
    root = ET.fromstring(xml_bytes)
    for elem in root.iter():
        local_name = elem.tag.rsplit("}", 1)[-1]
        if local_name == "SignatureValue" and elem.text:
            return elem.text.strip()
    return None
