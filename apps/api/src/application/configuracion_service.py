import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.core.config import get_settings
from src.domain.configuracion import ConfiguracionNegocioRequest
from src.infrastructure.db.models import ConfiguracionNegocio, Empresa


class ConfiguracionService:
    """Parametros del negocio editables por el admin (TRM, servidor, comision
    y empresa que factura los paquetes). Sin fila guardada se usan los
    valores por defecto de Settings (variables de entorno), asi el dashboard
    funciona antes de que el admin los edite."""

    def __init__(self, db: Session):
        self.db = db

    def obtener(self) -> dict:
        fila = self.db.get(ConfiguracionNegocio, 1)
        facturadora = self.empresa_facturadora()
        datos = {
            "empresa_facturadora_id": str(facturadora.id) if facturadora else None,
            "empresa_facturadora_nombre": facturadora.razon_social if facturadora else None,
        }
        if fila is not None:
            return {
                "costo_servidor_usd": float(fila.costo_servidor_usd),
                "trm_usd_cop": float(fila.trm_usd_cop),
                "comision_paquetes_pct": float(fila.comision_paquetes_pct),
                **datos,
            }
        settings = get_settings()
        return {
            "costo_servidor_usd": settings.costo_servidor_usd,
            "trm_usd_cop": settings.trm_usd_cop,
            "comision_paquetes_pct": settings.comision_paquetes_pct,
            **datos,
        }

    def guardar(self, data: ConfiguracionNegocioRequest) -> dict:
        fila = self._fila_o_nueva()
        fila.costo_servidor_usd = data.costo_servidor_usd
        fila.trm_usd_cop = data.trm_usd_cop
        fila.comision_paquetes_pct = data.comision_paquetes_pct
        if data.empresa_facturadora_id is not None:
            fila.empresa_facturadora_id = self._validar_empresa(data.empresa_facturadora_id).id
        self.db.add(fila)
        self.db.commit()
        return self.obtener()

    def empresa_facturadora(self) -> Empresa | None:
        """Empresa que emite la factura de los paquetes vendidos: la elegida
        en Configuracion o, si no hay, la del NIT de Settings."""
        fila = self.db.get(ConfiguracionNegocio, 1)
        if fila is not None and fila.empresa_facturadora_id is not None:
            empresa = self.db.get(Empresa, fila.empresa_facturadora_id)
            if empresa is not None and empresa.eliminado is None:
                return empresa
        return self.db.execute(
            select(Empresa).where(
                Empresa.numero_identificacion == get_settings().empresa_facturadora_nit,
                Empresa.eliminado.is_(None),
            )
        ).scalar_one_or_none()

    def _fila_o_nueva(self) -> ConfiguracionNegocio:
        fila = self.db.get(ConfiguracionNegocio, 1)
        if fila is not None:
            return fila
        settings = get_settings()
        return ConfiguracionNegocio(
            id=1,
            costo_servidor_usd=settings.costo_servidor_usd,
            trm_usd_cop=settings.trm_usd_cop,
            comision_paquetes_pct=settings.comision_paquetes_pct,
        )

    def _validar_empresa(self, empresa_id: uuid.UUID) -> Empresa:
        empresa = self.db.get(Empresa, empresa_id)
        if empresa is None or empresa.eliminado is not None:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "La empresa facturadora no existe.")
        return empresa
