import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session, selectinload

from src.application.consecutivo import revertir_consecutivo
from src.application.suscripcion_service import revisar_alerta_cuota_sin_romper, verificar_cupo_disponible
from src.application.correo_documento import (
    construir_adjuntos,
    ejecutar_envio_reportando_errores,
    resolver_destinatario,
)
from src.core.alegra_client import AlegraApiError, AlegraClient, AlegraTransientError
from src.core.alegra_errors import map_alegra_error, map_government_response
from src.core.email_client import EmailClient
from src.core.email_templates import plantilla_nomina_empleado
from src.core.nomina_pdf import generar_representacion_pdf_nomina
from src.core.representacion_pdf_common import formatear_cop
from src.core.tiempo import fecha_documento_colombia
from src.domain.nomina import GuardarNominaRequest
from src.infrastructure.db.models import ConsecutivoNomina, Empleado, Empresa, Nomina
from src.infrastructure.db.models.nomina import PREFIJO_ANULACION_NOMINA, PREFIJO_NOMINA


def _construir_trabajador_snapshot(empleado: Empleado) -> dict:
    """Bloque "Trabajador" tal cual lo espera Alegra, copiado del Empleado
    al crear el borrador -- se reusa sin cambios al armar el payload de
    envio, asi que un cambio de sueldo/cargo posterior del empleado no
    altera nominas ya emitidas."""
    return {
        "TipoTrabajador": empleado.tipo_trabajador,
        "SubTipoTrabajador": empleado.subtipo_trabajador,
        "AltoRiesgoPension": empleado.alto_riesgo_pension,
        "TipoDocumento": empleado.tipo_documento,
        "NumeroDocumento": int(empleado.numero_documento),
        "PrimerApellido": empleado.primer_apellido,
        "SegundoApellido": empleado.segundo_apellido,
        "PrimerNombre": empleado.primer_nombre,
        "OtrosNombres": empleado.otros_nombres,
        "LugarTrabajoPais": empleado.lugar_trabajo_pais,
        "LugarTrabajoMunicipioCiudad": empleado.lugar_trabajo_municipio,
        "LugarTrabajoDireccion": empleado.lugar_trabajo_direccion,
        "SalarioIntegral": empleado.salario_integral,
        "TipoContrato": empleado.tipo_contrato,
        "Sueldo": float(empleado.sueldo),
        "CodigoTrabajador": empleado.codigo_trabajador,
    }


class NominaService:
    """Comprobante de Nomina Electronica -- mismo patron que
    NotaCreditoService (consecutivo interno via ConsecutivoNomina, sin
    resolucion DIAN con rango, confirmado en vivo que Nomina no la exige)."""

    def __init__(self, db: Session, alegra_client: AlegraClient | None = None):
        self.db = db
        self._alegra_client = alegra_client or AlegraClient()

    def listar(self, empresa_id: uuid.UUID, empleado_id: uuid.UUID | None = None) -> list[Nomina]:
        query = (
            select(Nomina)
            .where(Nomina.empresa_id == empresa_id, Nomina.eliminado.is_(None))
            .options(selectinload(Nomina.empleado))
            .order_by(Nomina.creado.desc())
        )
        if empleado_id:
            query = query.where(Nomina.empleado_id == empleado_id)
        return list(self.db.execute(query).scalars().all())

    def obtener(self, empresa_id: uuid.UUID, nomina_id: uuid.UUID) -> Nomina:
        nomina = self.db.execute(
            select(Nomina)
            .where(Nomina.id == nomina_id, Nomina.empresa_id == empresa_id, Nomina.eliminado.is_(None))
            .options(selectinload(Nomina.empleado))
        ).scalar_one_or_none()
        if nomina is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Nomina no encontrada.")
        return nomina

    def _obtener_editable(self, empresa_id: uuid.UUID, nomina_id: uuid.UUID) -> Nomina:
        nomina = self.obtener(empresa_id, nomina_id)
        if nomina.estado not in ("borrador", "rechazada"):
            raise HTTPException(status.HTTP_409_CONFLICT, "Solo se puede editar una nomina en estado borrador o rechazada.")
        return nomina

    def _validar_empleado(self, empresa_id: uuid.UUID, empleado_id: uuid.UUID) -> Empleado:
        empleado = self.db.execute(
            select(Empleado).where(
                Empleado.id == empleado_id, Empleado.empresa_id == empresa_id, Empleado.eliminado.is_(None)
            )
        ).scalar_one_or_none()
        if empleado is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Empleado no encontrado.")
        return empleado

    def crear_borrador(self, empresa_id: uuid.UUID, data: GuardarNominaRequest) -> Nomina:
        empleado = self._validar_empleado(empresa_id, uuid.UUID(data.empleado_id))

        nomina = Nomina(
            empresa_id=empresa_id,
            empleado_id=empleado.id,
            estado="borrador",
            empleado_snapshot=_construir_trabajador_snapshot(empleado),
            **self._campos_editables(data),
        )
        self.db.add(nomina)
        self.db.commit()
        self.db.refresh(nomina)
        return self.obtener(empresa_id, nomina.id)

    def actualizar_borrador(self, empresa_id: uuid.UUID, nomina_id: uuid.UUID, data: GuardarNominaRequest) -> Nomina:
        nomina = self._obtener_editable(empresa_id, nomina_id)
        empleado = self._validar_empleado(empresa_id, uuid.UUID(data.empleado_id))

        if nomina.estado == "rechazada":
            # Corregir una nomina rechazada la vuelve a dejar como borrador.
            # consecutivo/numero_completo NO se limpian -- se reenvia con el
            # MISMO numero (mismo criterio ya aplicado a Factura/Notas/
            # Documento Soporte). El resto si son datos del intento anterior.
            nomina.estado = "borrador"
            nomina.alegra_payroll_id = None
            nomina.cune = None
            nomina.qr_code_content = None
            nomina.firma_digital = None
            nomina.razon_rechazo = None
            nomina.notificaciones_dian = None
            nomina.fecha_envio = None
            nomina.fecha_respuesta = None

        nomina.empleado_id = empleado.id
        nomina.empleado_snapshot = _construir_trabajador_snapshot(empleado)
        for campo, valor in self._campos_editables(data).items():
            setattr(nomina, campo, valor)

        self.db.add(nomina)
        self.db.commit()
        self.db.refresh(nomina)
        return self.obtener(empresa_id, nomina.id)

    @staticmethod
    def _campos_editables(data: GuardarNominaRequest) -> dict:
        return {
            "periodo_nomina": data.periodo_nomina,
            "fecha_liquidacion_inicio": data.fecha_liquidacion_inicio,
            "fecha_liquidacion_fin": data.fecha_liquidacion_fin,
            "fecha_pago": [d.isoformat() for d in data.fecha_pago],
            "forma_pago": data.forma_pago,
            "metodo_pago": data.metodo_pago,
            "banco": data.banco,
            "tipo_cuenta": data.tipo_cuenta,
            "numero_cuenta": data.numero_cuenta,
            "devengados": data.devengados,
            "deducciones": data.deducciones,
            "devengados_total": data.devengados_total,
            "deducciones_total": data.deducciones_total,
            "comprobante_total": data.comprobante_total,
            "notas": data.notas,
        }

    def eliminar_borrador(self, empresa_id: uuid.UUID, nomina_id: uuid.UUID) -> None:
        nomina = self._obtener_editable(empresa_id, nomina_id)
        nomina.eliminado = datetime.now(timezone.utc)
        self.db.add(nomina)
        self.db.commit()

    def _incrementar_consecutivo(self, empresa_id: uuid.UUID, tipo: str) -> int:
        stmt = insert(ConsecutivoNomina).values(empresa_id=empresa_id, tipo=tipo, consecutivo_actual=1)
        stmt = stmt.on_conflict_do_update(
            index_elements=["empresa_id", "tipo"], set_={"consecutivo_actual": ConsecutivoNomina.consecutivo_actual + 1}
        ).returning(ConsecutivoNomina.consecutivo_actual)
        consecutivo = self.db.execute(stmt).scalar_one()
        self.db.commit()
        return consecutivo

    def _revertir_consecutivo(self, empresa_id: uuid.UUID, consecutivo: int, tipo: str) -> bool:
        return revertir_consecutivo(
            self.db,
            ConsecutivoNomina,
            consecutivo,
            ConsecutivoNomina.empresa_id == empresa_id,
            ConsecutivoNomina.tipo == tipo,
            empresa_id=empresa_id,
        )

    def enviar(self, empresa_id: uuid.UUID, nomina_id: uuid.UUID) -> Nomina:
        nomina = self._obtener_editable(empresa_id, nomina_id)
        empresa = self.db.get(Empresa, empresa_id)
        if not empresa or not empresa.id_alegra:
            raise HTTPException(status.HTTP_409_CONFLICT, "Tu empresa todavía no está habilitada para emitir documentos electrónicos. Escríbenos para activarla.")
        verificar_cupo_disponible(self.db, empresa_id)

        # Reenvio de una nomina rechazada: reutiliza el numero ya asignado
        # (ver actualizar_borrador) en vez de pedir uno nuevo.
        es_reenvio = nomina.consecutivo is not None
        consecutivo = nomina.consecutivo if es_reenvio else self._incrementar_consecutivo(empresa_id, "nomina")
        payload = self._construir_payload_alegra(empresa, nomina, consecutivo)

        try:
            respuesta = self._alegra_client.create_payroll(payload)
        except AlegraApiError as exc:
            if not es_reenvio:
                self._revertir_consecutivo(empresa_id, consecutivo, "nomina")
            raise HTTPException(status.HTTP_400_BAD_REQUEST, map_alegra_error(exc.status_code, exc.body)) from exc
        except AlegraTransientError as exc:
            raise HTTPException(
                status.HTTP_502_BAD_GATEWAY,
                "El servicio de facturación electrónica no está respondiendo en este momento. Intenta de nuevo en unos minutos.",
            ) from exc

        self._aplicar_respuesta_envio(nomina, consecutivo, respuesta)

        self.db.add(nomina)
        self.db.commit()
        self.db.refresh(nomina)
        if nomina.estado == "aceptada":
            revisar_alerta_cuota_sin_romper(self.db, empresa_id)
        return self.obtener(empresa_id, nomina.id)

    def anular(self, empresa_id: uuid.UUID, nomina_id: uuid.UUID) -> Nomina:
        """Nomina Individual de Eliminacion -- lleva su propia numeracion,
        independiente de la nomina que anula (confirmado en vivo, ver
        AlegraClient.cancel_payroll)."""
        nomina = self.obtener(empresa_id, nomina_id)
        if nomina.estado != "aceptada":
            raise HTTPException(status.HTTP_409_CONFLICT, "Solo se puede anular una nomina aceptada por la DIAN.")
        # La nota de eliminacion tambien se transmite a la DIAN.
        verificar_cupo_disponible(self.db, empresa_id)

        consecutivo_anulacion = self._incrementar_consecutivo(empresa_id, "anulacion")
        try:
            respuesta = self._alegra_client.cancel_payroll(
                nomina.alegra_payroll_id, PREFIJO_ANULACION_NOMINA, consecutivo_anulacion
            )
        except AlegraApiError as exc:
            self._revertir_consecutivo(empresa_id, consecutivo_anulacion, "anulacion")
            raise HTTPException(status.HTTP_400_BAD_REQUEST, map_alegra_error(exc.status_code, exc.body)) from exc
        except AlegraTransientError as exc:
            raise HTTPException(
                status.HTTP_502_BAD_GATEWAY,
                "El servicio de facturación electrónica no está respondiendo en este momento. Intenta de nuevo en unos minutos.",
            ) from exc

        cancelacion = respuesta.get("cancellation") or {}
        nomina.estado = "anulada"
        nomina.consecutivo_anulacion = consecutivo_anulacion
        nomina.numero_completo_anulacion = cancelacion.get("fullNumber") or f"{PREFIJO_ANULACION_NOMINA}{consecutivo_anulacion}"
        nomina.cune_anulacion = cancelacion.get("cune")
        nomina.fecha_anulacion = datetime.now(timezone.utc)

        self.db.add(nomina)
        self.db.commit()
        self.db.refresh(nomina)
        revisar_alerta_cuota_sin_romper(self.db, empresa_id)
        return self.obtener(empresa_id, nomina.id)

    def obtener_url_xml(self, empresa_id: uuid.UUID, nomina_id: uuid.UUID) -> str:
        """URL S3 firmada (temporal) del XML -- se pide fresca a Alegra en
        cada llamada, nunca se persiste."""
        nomina = self.obtener(empresa_id, nomina_id)
        if not nomina.alegra_payroll_id:
            raise HTTPException(status.HTTP_409_CONFLICT, "Esta nómina todavía no fue enviada a la DIAN.")
        try:
            respuesta = self._alegra_client.get_payroll(nomina.alegra_payroll_id)
        except AlegraApiError as exc:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, map_alegra_error(exc.status_code, exc.body)) from exc
        url = (respuesta.get("files") or {}).get("xml")
        if not url:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "El XML de este documento todavía no está disponible. Intenta de nuevo en unos minutos.")
        return url

    def generar_pdf_representacion(self, empresa_id: uuid.UUID, nomina_id: uuid.UUID) -> bytes:
        """PDF real del comprobante -- solo tiene sentido para una nomina ya
        aceptada (CUNE/QR/firma reales)."""
        nomina = self.obtener(empresa_id, nomina_id)
        if nomina.estado not in ("aceptada", "anulada"):
            raise HTTPException(status.HTTP_409_CONFLICT, "Solo se puede generar el PDF de una nomina ya aceptada por la DIAN.")
        return generar_representacion_pdf_nomina(self.db, nomina)

    def enviar_por_correo(self, empresa_id: uuid.UUID, nomina_id: uuid.UUID, destinatario: str | None = None) -> None:
        nomina = self.obtener(empresa_id, nomina_id)
        if nomina.estado != "aceptada":
            raise HTTPException(status.HTTP_409_CONFLICT, "Solo se puede enviar por correo una nomina aceptada.")
        correo = resolver_destinatario(
            destinatario, nomina.empleado.correo_electronico if nomina.empleado else None, "El empleado de esta nomina"
        )
        ejecutar_envio_reportando_errores(
            lambda: _enviar_correo_nomina(self.db, nomina, self._alegra_client, EmailClient(), correo),
            "No se pudo preparar el correo de la nomina.",
        )

    @staticmethod
    def _aplicar_respuesta_envio(nomina: Nomina, consecutivo: int, respuesta: dict) -> None:
        payroll = respuesta.get("payroll") or respuesta.get("emission") or {}
        nomina.consecutivo = consecutivo
        nomina.numero_completo = payroll.get("fullNumber") or f"{PREFIJO_NOMINA}{consecutivo}"
        nomina.alegra_payroll_id = payroll.get("id")
        nomina.cune = payroll.get("cune")
        nomina.qr_code_content = payroll.get("qrCodeContent")
        nomina.firma_digital = payroll.get("signatureValue")
        nomina.fecha_envio = datetime.now(timezone.utc)

        government_response = payroll.get("governmentResponse") or {}
        nomina.notificaciones_dian = government_response.get("errorMessages") or None

        legal_status = payroll.get("legalStatus")
        if legal_status in ("ACCEPTED", "ACCEPTED_WITH_OBSERVATIONS"):
            nomina.estado = "aceptada"
            nomina.razon_rechazo = None
            nomina.fecha_respuesta = datetime.now(timezone.utc)
        elif legal_status == "REJECTED":
            nomina.estado = "rechazada"
            nomina.razon_rechazo = map_government_response(
                government_response.get("code", ""), government_response.get("message") or "La DIAN rechazo la nomina."
            )
            nomina.fecha_respuesta = datetime.now(timezone.utc)
        else:
            nomina.estado = "enviada"
            nomina.razon_rechazo = None

    @staticmethod
    def _construir_payload_alegra(empresa: Empresa, nomina: Nomina, consecutivo: int) -> dict:
        pago = {"Forma": nomina.forma_pago, "Metodo": nomina.metodo_pago}
        if nomina.banco:
            pago["Banco"] = nomina.banco
        if nomina.tipo_cuenta:
            pago["TipoCuenta"] = nomina.tipo_cuenta
        if nomina.numero_cuenta:
            pago["NumeroCuenta"] = nomina.numero_cuenta

        periodo = {
            "FechaIngreso": nomina.empleado.fecha_ingreso.isoformat(),
            "FechaLiquidacionInicio": nomina.fecha_liquidacion_inicio.isoformat(),
            "FechaLiquidacionFin": nomina.fecha_liquidacion_fin.isoformat(),
        }
        if nomina.empleado.fecha_retiro:
            periodo["FechaRetiro"] = nomina.empleado.fecha_retiro.isoformat()

        government_data = {
            "Periodo": periodo,
            "LugarGeneracionXML": {"Pais": "CO", "MunicipioCiudad": empresa.municipio or "11001"},
            "InformacionGeneral": {"PeriodoNomina": nomina.periodo_nomina, "TipoMoneda": "COP"},
            "Empleador": {
                "NIT": int(empresa.numero_identificacion),
                "DV": int(empresa.digito_verificacion),
                "Pais": "CO",
                "MunicipioCiudad": empresa.municipio or "11001",
                "Direccion": empresa.direccion or "No registrada",
            },
            "Trabajador": nomina.empleado_snapshot,
            "Pago": pago,
            "FechasPagos": {"FechaPago": list(nomina.fecha_pago)},
            "Devengados": nomina.devengados,
            "Deducciones": nomina.deducciones,
            "DevengadosTotal": float(nomina.devengados_total),
            "DeduccionesTotal": float(nomina.deducciones_total),
            "ComprobanteTotal": float(nomina.comprobante_total),
        }

        return {
            "company": {"id": empresa.id_alegra},
            "prefix": PREFIJO_NOMINA,
            "number": consecutivo,
            "governmentData": government_data,
        }


def _enviar_correo_nomina(
    db: Session, nomina: Nomina, alegra_client: AlegraClient | None, email_client: EmailClient, destinatario: str
) -> None:
    """Arma y envia el correo con QR + PDF + XML al empleado -- deja
    propagar cualquier error para que cada llamador decida si es
    best-effort o debe reportarse. Asume que la nomina esta aceptada y que
    `destinatario` ya esta resuelto -- eso lo valida el llamador."""
    servicio = NominaService(db, alegra_client)
    url_xml = servicio.obtener_url_xml(nomina.empresa_id, nomina.id)
    xml_bytes = servicio._alegra_client.fetch_raw(url_xml)
    pdf_bytes = generar_representacion_pdf_nomina(db, nomina)

    empresa = db.get(Empresa, nomina.empresa_id)
    fecha_mostrar = fecha_documento_colombia(nomina.fecha_envio, nomina.fecha_liquidacion_fin)
    nombre_empleado = " ".join(filter(None, [nomina.empleado.primer_nombre, nomina.empleado.primer_apellido]))
    subject, html = plantilla_nomina_empleado(
        razon_social_empleador=empresa.razon_social,
        nombre_empleado=nombre_empleado,
        numero_completo=nomina.numero_completo or "",
        fecha=fecha_mostrar.strftime("%d/%m/%Y"),
        total_formateado=formatear_cop(float(nomina.comprobante_total)),
        cune=nomina.cune or "",
    )
    numero = nomina.numero_completo or str(nomina.id)
    attachments = construir_adjuntos(numero, nomina.qr_code_content, pdf_bytes, xml_bytes)
    email_client.send(to=destinatario, subject=subject, html=html, attachments=attachments)
