import { ESTADO_BADGE } from "../eventos";

export default function EstadoBadge({ estado, label, ultimoEventoRechazado = false }) {
  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <span
        className={`inline-flex items-center whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-medium ${
          ESTADO_BADGE[estado] || ESTADO_BADGE.sin_evento
        }`}
      >
        {label}
      </span>
      {ultimoEventoRechazado && (
        <span className="text-[11px] text-fiscal-danger">Último evento rechazado por la DIAN</span>
      )}
    </span>
  );
}
