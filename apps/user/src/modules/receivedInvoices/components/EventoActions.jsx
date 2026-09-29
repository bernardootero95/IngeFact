import { useNavigate } from "react-router-dom";
import { IconButton } from "@ingefact/ui";
import { ACCIONES_EVENTO } from "../eventos";

const MOTIVO_DESHABILITADO = {
  "030": "Acuse de recibo: ya registrado",
  "032": "Recibo de mercancía: primero registra el acuse de recibo",
  "033": "Aceptar: primero registra el recibo de la mercancía",
  "031": "Rechazar: primero registra el recibo de la mercancía",
};

const ICONOS = {
  // Sobre abierto: la factura llego.
  "030": "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  // Caja: la mercancia llego.
  "032": "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  // Circulo con check: aceptar.
  "033": "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  // Circulo con X: rechazar.
  "031": "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z",
};

/**
 * Un boton por evento RADIAN, siempre visibles y en orden para que se vea el
 * proceso completo, pero solo habilitados los que el backend permite
 * (`eventosPermitidos`). Cada uno lleva al detalle con ese evento elegido,
 * donde se completan los datos que la DIAN exige.
 */
export default function EventoActions({ facturaId, eventosPermitidos }) {
  const navigate = useNavigate();

  return (
    <>
      {ACCIONES_EVENTO.map((accion) => {
        const habilitado = eventosPermitidos.includes(accion.tipo);
        return (
          <IconButton
            key={accion.tipo}
            title={habilitado ? accion.label : MOTIVO_DESHABILITADO[accion.tipo]}
            variant={accion.peligro ? "danger" : "default"}
            disabled={!habilitado}
            onClick={() => navigate(`/received-invoices/${facturaId}?evento=${accion.tipo}`)}
          >
            <svg
              className={`w-4 h-4 ${habilitado && !accion.peligro ? "text-brand-600" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={ICONOS[accion.tipo]} />
            </svg>
          </IconButton>
        );
      })}
    </>
  );
}
