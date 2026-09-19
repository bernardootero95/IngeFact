from pydantic import BaseModel, EmailStr


class EnviarPorCorreoRequest(BaseModel):
    """Cuerpo opcional de los endpoints "enviar por correo". Sin `correo`, el
    documento se envia al correo registrado del cliente/proveedor."""

    correo: EmailStr | None = None
