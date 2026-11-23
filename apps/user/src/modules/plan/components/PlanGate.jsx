import { useState } from "react";
import { SpinnerLoading } from "@ingefact/ui";
import { useCurrentEmpresa } from "../../../context/useCurrentEmpresa";
import PlanAvisoModal from "./PlanAvisoModal";
import PlanVencidoPage from "../pages/PlanVencidoPage";
import { ESTADO_PLAN, avisoPendiente, enlaceCompraPaquete, estadoPlanDe, formatoFecha, marcarAvisoVisto } from "../planEstado";

/**
 * Decide que ve el cliente segun su plan, en cualquier ruta protegida:
 * - vencido: solo la pantalla de plan vencido (estado + descargas), sin menu.
 * - sin cupo: la app normal, con un aviso al ingresar que lo lleva a comprar.
 * La API refuerza lo mismo: con plan vencido rechaza toda escritura y sin
 * cupo no deja enviar nada a la DIAN.
 */
export default function PlanGate({ children }) {
  const { empresa, loading } = useCurrentEmpresa();
  const estado = estadoPlanDe(empresa);
  const [avisoAbierto, setAvisoAbierto] = useState(true);

  if (loading && !empresa) return <SpinnerLoading text="Cargando tu cuenta..." />;
  if (estado === ESTADO_PLAN.VENCIDO) return <PlanVencidoPage empresa={empresa} />;

  const mostrarAviso = estado === ESTADO_PLAN.SIN_CUPO && avisoAbierto && avisoPendiente(empresa.id, estado);
  const cerrarAviso = () => {
    marcarAvisoVisto(empresa.id, estado);
    setAvisoAbierto(false);
  };

  return (
    <>
      {children}
      {mostrarAviso && (
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
    </>
  );
}
