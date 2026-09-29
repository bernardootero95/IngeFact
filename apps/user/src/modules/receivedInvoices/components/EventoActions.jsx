import { useNavigate } from "react-router-dom";
import { Button } from "@ingefact/ui";
import { ACCIONES_EVENTO } from "../eventos";

const MOTIVO_DESHABILITADO = {
  "030": "La factura ya tiene acuse de recibo.",
  "032": "Primero registra el acuse de recibo de la factura.",
  "033": "Primero registra el recibo de la mercancía o servicio.",
  "031": "Primero registra el recibo de la mercancía o servicio.",
};

/**
 * Un boton por evento RADIAN, siempre visibles para que el usuario vea el
 * orden del proceso, pero solo habilitados los que el backend permite
 * (`eventosPermitidos`). Cada boton lleva al detalle con el evento elegido,
 * donde se completan los datos que la DIAN exige.
 */
export default function EventoActions({ facturaId, eventosPermitidos, finalizada }) {
  const navigate = useNavigate();

  if (finalizada) {
    return <span className="text-xs text-neutralCustom-500">Proceso terminado</span>;
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {ACCIONES_EVENTO.map((accion) => {
        const habilitado = eventosPermitidos.includes(accion.tipo);
        return (
          <Button
            key={accion.tipo}
            size="sm"
            variant={habilitado ? (accion.peligro ? "danger" : "outline") : "secondary"}
            disabled={!habilitado}
            title={habilitado ? accion.titulo : MOTIVO_DESHABILITADO[accion.tipo]}
            onClick={() => navigate(`/received-invoices/${facturaId}?evento=${accion.tipo}`)}
          >
            {accion.corto}
          </Button>
        );
      })}
    </div>
  );
}
