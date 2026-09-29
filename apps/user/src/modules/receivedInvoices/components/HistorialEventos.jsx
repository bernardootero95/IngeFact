import { LEGAL_STATUS_BADGE } from "../eventos";

const LEGAL_STATUS_LABEL = {
  ACCEPTED: "Aceptado por la DIAN",
  ACCEPTED_WITH_OBSERVATIONS: "Aceptado con observaciones",
  REJECTED: "Rechazado por la DIAN",
};

export default function HistorialEventos({ eventos }) {
  if (eventos.length === 0) {
    return (
      <p className="text-sm text-neutralCustom-500 text-center py-6 border-2 border-dashed border-neutralCustom-200 rounded-brand-md">
        Aún no has registrado ningún evento sobre esta factura.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {eventos.map((evento) => (
        <li key={evento.id} className="border border-neutralCustom-100 rounded-brand-md p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-neutralCustom-800">{evento.tipo_label}</span>
            <span className="text-xs text-neutralCustom-500">{new Date(evento.creado).toLocaleString("es-CO")}</span>
          </div>
          <span
            className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              LEGAL_STATUS_BADGE[evento.legal_status] || "bg-neutralCustom-100 text-neutralCustom-600"
            }`}
          >
            {LEGAL_STATUS_LABEL[evento.legal_status] || evento.legal_status || "Sin respuesta de la DIAN"}
          </span>
          {evento.razon_rechazo && <p className="text-sm text-fiscal-danger mt-2">{evento.razon_rechazo}</p>}
          {evento.notas && <p className="text-xs text-neutralCustom-600 mt-2">{evento.notas}</p>}
          {evento.cude && <p className="text-xs text-neutralCustom-500 mt-1 font-mono break-all">CUDE: {evento.cude}</p>}
        </li>
      ))}
    </ol>
  );
}
