import { useState } from "react";
import { SpinnerLoading } from "@ingefact/ui";
import { useCurrentEmpresa } from "../../../context/useCurrentEmpresa";
import PlanAvisoModal from "./PlanAvisoModal";
import PlanVencidoPage from "../pages/PlanVencidoPage";
import {
  ESTADO_PLAN,
  alertasPorVencer,
  avisoPendiente,
  enlaceCompraPaquete,
  estadoPlanDe,
  formatoFecha,
  marcarAvisoVisto,
  textoDocumentos,
  textoVencimiento,
  tituloPorVencer,
} from "../planEstado";

// Clave del aviso de "por vencer" en sessionStorage (no es un estado_plan de la API).
const AVISO_POR_VENCER = "por_vencer";

/**
 * Decide que ve el cliente segun su plan, en cualquier ruta protegida:
 * - vencido: solo la pantalla de plan vencido (estado + descargas), sin menu.
 * - sin cupo: la app normal, con un aviso al ingresar que lo lleva a comprar.
 * - por vencer (fecha o documentos): la app normal, con un aviso al ingresar
 *   que lo invita a renovar.
 * Cada aviso sale una vez por ingreso. La API refuerza lo mismo: con plan
 * vencido rechaza toda escritura y sin cupo no deja enviar nada a la DIAN.
 */
export default function PlanGate({ children }) {
  const { empresa, loading } = useCurrentEmpresa();
  const estado = estadoPlanDe(empresa);
  const [avisoAbierto, setAvisoAbierto] = useState(true);

  if (loading && !empresa) return <SpinnerLoading text="Cargando tu cuenta..." />;
  if (estado === ESTADO_PLAN.VENCIDO) return <PlanVencidoPage empresa={empresa} />;

  const alertas = alertasPorVencer(empresa);
  const claveAviso = estado === ESTADO_PLAN.SIN_CUPO ? estado : alertas ? AVISO_POR_VENCER : null;
  const mostrarAviso = claveAviso && avisoAbierto && avisoPendiente(empresa.id, claveAviso);
  const cerrarAviso = () => {
    marcarAvisoVisto(empresa.id, claveAviso);
    setAvisoAbierto(false);
  };

  return (
    <>
      {children}
      {mostrarAviso && claveAviso === ESTADO_PLAN.SIN_CUPO && (
        <PlanAvisoModal
          abierto
          titulo="Te quedaste sin documentos"
          tono="warning"
          enlaceCompra={enlaceCompraPaquete(empresa)}
          onCerrar={cerrarAviso}
        >
          <p>
            Usaste todos los documentos de tu paquete. Puedes seguir consultando tu información, pero no podrás emitir
            ninguna factura ni otro documento ante la DIAN hasta que adquieras un nuevo paquete.
          </p>
          {empresa.suscripcion?.fecha_fin && (
            <p>Tu plan sigue vigente hasta el {formatoFecha(empresa.suscripcion.fecha_fin)}.</p>
          )}
        </PlanAvisoModal>
      )}
      {mostrarAviso && claveAviso === AVISO_POR_VENCER && (
        <PlanAvisoModal
          abierto
          titulo={tituloPorVencer(alertas)}
          tono="info"
          enlaceCompra={enlaceCompraPaquete(empresa, { renovar: true })}
          textoAccion="Renovar paquete"
          onCerrar={cerrarAviso}
        >
          {alertas.fecha && <p>{textoVencimiento(alertas.fecha)}</p>}
          {alertas.documentos && <p>{textoDocumentos(alertas.documentos)}</p>}
          <p>
            {alertas.fecha
              ? "Al vencer el plan pierdes los documentos que no hayas usado y solo podrás descargar tu información."
              : "Cuando se acaben no podrás emitir documentos ante la DIAN."}{" "}
            Renueva a tiempo para seguir facturando sin interrupciones.
          </p>
        </PlanAvisoModal>
      )}
    </>
  );
}
