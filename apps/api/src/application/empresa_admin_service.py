import logging
import re
import uuid
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from src.application.suscripcion_service import contar_documentos_usados
from src.core.alegra_client import AlegraApiError, AlegraClient, AlegraTransientError
from src.core.alegra_errors import map_alegra_error
from src.core.config import get_settings
from src.core.email_client import EmailClient, EmailSendError
from src.core.email_templates import (
    plantilla_correo_acceso_cambiado_anterior,
    plantilla_correo_acceso_cambiado_nuevo,
)
from src.core.logo_empresa import decodificar_logo
from src.core.precio_paquete import precio_paquete
from src.domain.empresa import (
    ActualizarDatosContactoRequest,
    ActualizarEmpresaRequest,
    CambiarPlanRequest,
    EmpresaDetailResponse,
)
from src.infrastructure.db.models import Empresa, Suscripcion, UsuarioEmpresa, VentaPaquete

logger = logging.getLogger(__name__)

# Responsabilidad fiscal DIAN tal como la espera Alegra (R-99-PN, O-13...).
# Versiones viejas de sync-alegra guardaban "48"/"49" en `regimen`, que Alegra
# rechazaria; esas filas quedan asi hasta re-sincronizar (o si Alegra no trae
# regimeCode) -- a esas no se les manda regimeCode.
_CODIGO_RESPONSABILIDAD = re.compile(r"^[A-Z]-\d")


def _datos_alegra(empresa: Empresa) -> dict:
    """Campos de la empresa que tambien viven en Alegra. Si no se le mandan
    al editar, sync-alegra los pisa despues con los valores viejos."""
    datos = {
        "name": empresa.razon_social,
        "tradeName": empresa.nombre_comercial or empresa.razon_social,
        "email": empresa.correo_electronico,
        "phone": empresa.telefono or "",
    }
    if empresa.tipo_organizacion:
        datos["organizationType"] = int(empresa.tipo_organizacion)
    if empresa.regimen and _CODIGO_RESPONSABILIDAD.match(empresa.regimen):
        datos["regimeCode"] = empresa.regimen
    if empresa.direccion and empresa.departamento and empresa.municipio:
        datos["address"] = {
            "address": empresa.direccion,
            "department": empresa.departamento,
            "city": empresa.municipio,
            "country": "CO",
        }
    return datos


class EmpresaAdminService:
    """CRUD administrativo de empresas (listar/ver/editar/cambiar plan).

    Separado de CreateEmpresaAlegraService a proposito: ese servicio se ocupa
    solo de la provision inicial (y reintento) contra Alegra, este de la
    gestion administrativa una vez la empresa ya existe.
    """

    def __init__(self, db: Session, alegra_client: AlegraClient | None = None, email_client: EmailClient | None = None):
        self.db = db
        # Perezosos: la mayoria de operaciones (y las rutas tenant que reusan
        # este servicio) no hablan con Alegra ni mandan correos.
        self._alegra = alegra_client
        self._email_client = email_client

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
        """Alegra va primero: si rechaza el cambio no se guarda nada, asi
        IngeFact y Alegra no quedan con datos distintos."""
        empresa = self.obtener(empresa_id)
        usuarios = self.db.query(UsuarioEmpresa).filter(UsuarioEmpresa.empresa_id == empresa.id).all()
        correo_anterior = usuarios[0].email if usuarios else empresa.correo_electronico
        cambia_correo = data.correo_electronico is not None and data.correo_electronico != empresa.correo_electronico
        if cambia_correo:
            self._validar_correo_disponible(data.correo_electronico, empresa.id)

        datos_alegra_antes = _datos_alegra(empresa)
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
        if cambia_correo:
            empresa.correo_electronico = data.correo_electronico
            for usuario in usuarios:
                usuario.email = data.correo_electronico

        datos_alegra = _datos_alegra(empresa)
        if empresa.id_alegra and datos_alegra != datos_alegra_antes:
            self._actualizar_en_alegra(empresa.id_alegra, datos_alegra)

        self.db.add(empresa)
        try:
            self.db.commit()
        except IntegrityError as exc:
            # Carrera con otro alta/edicion que tomo el mismo correo entre la
            # validacion y el commit.
            self.db.rollback()
            raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe un usuario con ese correo.") from exc
        self.db.refresh(empresa)

        if cambia_correo:
            nombre = usuarios[0].nombre if usuarios else empresa.razon_social
            self._avisar_cambio_correo(nombre, correo_anterior, empresa.correo_electronico)
        return empresa

    def _validar_correo_disponible(self, correo: str, empresa_id: uuid.UUID) -> None:
        ocupado = (
            self.db.query(UsuarioEmpresa)
            .filter(UsuarioEmpresa.email == correo, UsuarioEmpresa.empresa_id != empresa_id)
            .first()
        )
        if ocupado is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe un usuario con ese correo.")

    def _actualizar_en_alegra(self, company_id: str, datos: dict) -> None:
        alegra = self._alegra or AlegraClient()
        try:
            alegra.update_company(company_id, datos)
        except AlegraApiError as exc:
            self.db.rollback()
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, map_alegra_error(exc.status_code, exc.body)) from exc
        except AlegraTransientError as exc:
            self.db.rollback()
            raise HTTPException(
                status.HTTP_502_BAD_GATEWAY,
                "Alegra no respondio. No se guardo ningun cambio; intenta de nuevo en unos minutos.",
            ) from exc

    def _avisar_cambio_correo(self, nombre: str, correo_anterior: str | None, correo_nuevo: str) -> None:
        """Un fallo de envio no deshace el cambio (ya esta en IngeFact y en
        Alegra) -- solo se registra."""
        email_client = self._email_client or EmailClient()
        login_url = f"{get_settings().user_app_url}/login"
        envios = [(correo_nuevo, plantilla_correo_acceso_cambiado_nuevo(nombre, correo_nuevo, login_url))]
        if correo_anterior and correo_anterior != correo_nuevo:
            envios.insert(0, (correo_anterior, plantilla_correo_acceso_cambiado_anterior(nombre, correo_nuevo)))
        for destinatario, (subject, html) in envios:
            try:
                email_client.send(to=destinatario, subject=subject, html=html)
            except EmailSendError as exc:
                logger.error("No se pudo enviar el aviso de cambio de correo a %s: %s", destinatario, exc)

    def actualizar_datos_contacto(self, empresa_id: uuid.UUID, data: ActualizarDatosContactoRequest) -> Empresa:
        """Edicion propia del tenant -- solo datos informativos, no toca
        razon_social/NIT/correo (esos los administra staff, ver `actualizar`)."""
        empresa = self.obtener(empresa_id)
        empresa.nombre_comercial = data.nombre_comercial
        empresa.telefono = data.telefono
        empresa.direccion = data.direccion
        if data.mostrar_logo is not None:
            if data.mostrar_logo and empresa.logo_mime is None:
                raise HTTPException(status.HTTP_409_CONFLICT, "Primero sube el logo de tu empresa.")
            empresa.mostrar_logo = data.mostrar_logo
        self.db.add(empresa)
        self.db.commit()
        self.db.refresh(empresa)
        return empresa

    def guardar_logo(self, empresa_id: uuid.UUID, data_url: str) -> Empresa:
        try:
            datos, mime = decodificar_logo(data_url)
        except ValueError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
        empresa = self.obtener(empresa_id)
        empresa.logo = datos
        empresa.logo_mime = mime
        self.db.add(empresa)
        self.db.commit()
        self.db.refresh(empresa)
        return empresa

    def eliminar_logo(self, empresa_id: uuid.UUID) -> Empresa:
        empresa = self.obtener(empresa_id)
        empresa.logo = None
        empresa.logo_mime = None
        empresa.mostrar_logo = False
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

        # Venta = paquete nuevo, mas/menos documentos o nuevo periodo. Solo
        # extender fecha_fin o reguardar el mismo plan no es una venta.
        es_venta = (
            activa is None
            or activa.max_documentos != data.max_documentos
            or activa.fecha_inicio != data.fecha_inicio
        )

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
        if es_venta:
            self.db.add(
                VentaPaquete(
                    empresa_id=empresa.id,
                    max_documentos=data.max_documentos,
                    precio=data.precio if data.precio is not None else precio_paquete(data.max_documentos),
                    fecha_inicio=data.fecha_inicio,
                    fecha_fin=data.fecha_fin,
                )
            )
        self.db.commit()
        self.db.refresh(activa)
        return activa
