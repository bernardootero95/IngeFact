import uuid
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from src.application.suscripcion_service import contar_documentos_usados
from src.domain.empresa import (
    ActualizarDatosContactoRequest,
    ActualizarEmpresaRequest,
    CambiarPlanRequest,
    EmpresaDetailResponse,
)
from src.infrastructure.db.models import Empresa, Suscripcion


class EmpresaAdminService:
    """CRUD administrativo de empresas (listar/ver/editar/cambiar plan).

    Separado de CreateEmpresaAlegraService a proposito: ese servicio se ocupa
    solo de la provision inicial (y reintento) contra Alegra, este de la
    gestion administrativa una vez la empresa ya existe.
    """

    def __init__(self, db: Session):
        self.db = db

    def construir_respuesta_detalle(self, empresa: Empresa) -> EmpresaDetailResponse:
        """Wrapper de EmpresaDetailResponse.from_empresa que resuelve el
        conteo real de documentos usados (requiere DB, por eso no vive en el
        modulo de dominio) -- usado por todas las rutas admin/tenant que
        exponen el detalle de una empresa."""
        activa = next((s for s in empresa.suscripciones if s.estado == "activa"), None)
        documentos_usados = contar_documentos_usados(self.db, activa) if activa else None
        return EmpresaDetailResponse.from_empresa(empresa, documentos_usados=documentos_usados)

    def listar(
        self,
        estado: str | None = None,
        fecha_desde: date | None = None,
        fecha_hasta: date | None = None,
    ) -> list[Empresa]:
        query = select(Empresa).options(joinedload(Empresa.suscripciones)).order_by(Empresa.creado.desc())
        if estado:
            query = query.where(Empresa.estado == estado)
        if fecha_desde:
            query = query.where(Empresa.creado >= fecha_desde)
        if fecha_hasta:
            query = query.where(Empresa.creado <= fecha_hasta)
        return list(self.db.execute(query).unique().scalars().all())

    def obtener(self, empresa_id: uuid.UUID) -> Empresa:
        empresa = (
            self.db.execute(
                select(Empresa).options(joinedload(Empresa.suscripciones)).where(Empresa.id == empresa_id)
            )
            .unique()
            .scalar_one_or_none()
        )
        if empresa is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Empresa no encontrada.")
        return empresa

    def actualizar(self, empresa_id: uuid.UUID, data: ActualizarEmpresaRequest) -> Empresa:
        empresa = self.obtener(empresa_id)
        empresa.razon_social = data.razon_social
        empresa.nombre_comercial = data.nombre_comercial
        empresa.direccion = data.direccion
        empresa.departamento = data.departamento
        empresa.municipio = data.municipio
        empresa.regimen = data.regimen
        empresa.regimen_fiscal = data.regimen_fiscal
        empresa.tipo_organizacion = data.tipo_organizacion
        empresa.telefono = data.telefono
        empresa.notificacion_correo = data.notificacion_correo
        empresa.estado = data.estado
        self.db.add(empresa)
        self.db.commit()
        self.db.refresh(empresa)
        return empresa

    def actualizar_datos_contacto(self, empresa_id: uuid.UUID, data: ActualizarDatosContactoRequest) -> Empresa:
        """Edicion propia del tenant -- solo datos informativos, no toca
        razon_social/NIT/correo (esos los administra staff, ver `actualizar`)."""
        empresa = self.obtener(empresa_id)
        empresa.nombre_comercial = data.nombre_comercial
        empresa.telefono = data.telefono
        empresa.direccion = data.direccion
        self.db.add(empresa)
        self.db.commit()
        self.db.refresh(empresa)
        return empresa

    def cambiar_plan(self, empresa_id: uuid.UUID, data: CambiarPlanRequest) -> Suscripcion:
        """Upsert de la suscripcion activa de la empresa -- misma regla que
        usaba create-tenant: actualiza la que ya esta 'activa' si existe, si
        no crea una nueva."""
        empresa = self.obtener(empresa_id)

        activa = self.db.execute(
            select(Suscripcion).where(Suscripcion.empresa_id == empresa.id, Suscripcion.estado == "activa")
        ).scalar_one_or_none()

        if activa is None:
            activa = Suscripcion(empresa_id=empresa.id, estado="activa")

        activa.max_documentos = data.max_documentos
        activa.fecha_inicio = data.fecha_inicio
        activa.fecha_fin = data.fecha_fin
        # Un cambio de plan (nuevo o ampliado) es motivo para volver a avisar
        # si se vuelve a cruzar el umbral -- sin esto, una empresa que ya
        # recibio el aviso una vez nunca mas se enteraria tras renovar.
        activa.alerta_cuota_enviada = False

        self.db.add(activa)
        self.db.commit()
        self.db.refresh(activa)
        return activa
