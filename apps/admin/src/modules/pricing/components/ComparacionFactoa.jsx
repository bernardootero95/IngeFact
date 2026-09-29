import { precioFactoa } from "../pricingCalculator";
import { formatoPesos } from "../format";

export default function ComparacionFactoa({ documentos, precio }) {
  const factoa = precioFactoa(documentos);
  const diferencia = factoa ? ((precio - factoa.precio) / factoa.precio) * 100 : null;
  const masBarato = diferencia !== null && diferencia < 0;

  return (
    <section
      aria-labelledby="calc-factoa"
      className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6"
    >
      <h3 id="calc-factoa" className="text-base font-medium text-neutralCustom-800 mb-3">
        Referencia de mercado
      </h3>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs text-neutralCustom-500">Tu precio</p>
          <p className="text-lg tabular-nums text-neutralCustom-800">{formatoPesos(precio)}</p>
        </div>
        <div>
          <p className="text-xs text-neutralCustom-500">Factoa, mismo volumen</p>
          <p className="text-lg tabular-nums text-neutralCustom-800">{factoa ? formatoPesos(factoa.precio) : "—"}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1.5 text-sm font-medium ${
            diferencia === null
              ? "bg-neutralCustom-100 text-neutralCustom-600"
              : masBarato
                ? "bg-green-50 text-green-700"
                : "bg-orange-50 text-orange-700"
          }`}
        >
          {diferencia === null
            ? "Sin dato"
            : `${Math.abs(diferencia).toFixed(0)} % ${masBarato ? "más barato" : "más caro"}`}
        </span>
      </div>
      <p className="mt-3 text-xs text-neutralCustom-500">
        {factoa === null && "Factoa no publica planes de menos de 25 documentos. "}
        {factoa?.extrapolado && "Valor extrapolado: Factoa no publica planes de más de 10.000 documentos. "}
        Planes anuales &quot;G&quot; de Factoa consultados en septiembre de 2026; verifícalos antes de una decisión
        grande.
      </p>
    </section>
  );
}
