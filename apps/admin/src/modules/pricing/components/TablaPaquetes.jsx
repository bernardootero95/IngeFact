import { calcularResultado } from "../pricingCalculator";
import { formatoNumero, formatoPesos } from "../format";

// Paquetes publicados en la landing (apps/landing/src/data/pricing.ts) y
// tamaños grandes para evaluar. El de 10.000 se publica redondeado.
const PUBLICADOS = [10, 25, 50, 150, 500, 1500, 5000, 10000];
const PRECIO_PUBLICADO_REDONDEADO = { 10000: 2000000 };
const GRANDES = [20000, 50000];

export default function TablaPaquetes({ params, costos, onSelect }) {
  const filas = [...PUBLICADOS, ...GRANDES].map((documentos) => ({
    documentos,
    publicado: PUBLICADOS.includes(documentos),
    ...calcularResultado(documentos, params, costos),
  }));

  return (
    <section
      aria-labelledby="calc-tabla"
      className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6"
    >
      <h3 id="calc-tabla" className="text-base font-medium text-neutralCustom-800">
        Todos los paquetes con estos parámetros
      </h3>
      <p className="text-xs text-neutralCustom-500 mt-0.5 mb-4">
        Los primeros ocho son los publicados en la página (el de 10.000 se publica redondeado a $2.000.000); los demás
        sirven para evaluar paquetes grandes.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr className="text-left text-xs text-neutralCustom-500 border-b border-neutralCustom-100">
              <th scope="col" className="py-2 pr-4 font-medium">Documentos</th>
              <th scope="col" className="py-2 pr-4 font-medium text-right">Precio</th>
              <th scope="col" className="py-2 pr-4 font-medium text-right">Por documento</th>
              <th scope="col" className="py-2 pr-4 font-medium text-right">Costo proveedor</th>
              <th scope="col" className="py-2 font-medium text-right">Neto</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.documentos} className="border-b border-neutralCustom-100 last:border-0">
                <td className="py-2 pr-4">
                  <button
                    type="button"
                    onClick={() => onSelect(f.documentos)}
                    className="text-brand-600 hover:underline underline-offset-2"
                    title="Ver el desglose de este paquete"
                  >
                    {formatoNumero(f.documentos)}
                  </button>
                  {!f.publicado && (
                    <span className="ml-2 rounded-full bg-neutralCustom-100 px-2 py-0.5 text-[11px] text-neutralCustom-600">
                      no publicado
                    </span>
                  )}
                </td>
                <td className="py-2 pr-4 text-right">
                  {formatoPesos(f.precio)}
                  {PRECIO_PUBLICADO_REDONDEADO[f.documentos] && (
                    <small className="block text-[11px] text-neutralCustom-500">
                      publicado {formatoPesos(PRECIO_PUBLICADO_REDONDEADO[f.documentos])}
                    </small>
                  )}
                </td>
                <td className="py-2 pr-4 text-right">{formatoPesos(f.precioPorDocumento)}</td>
                <td className="py-2 pr-4 text-right">{formatoPesos(f.costo.costoAnual)}</td>
                <td className="py-2 text-right">
                  {formatoPesos(f.neto)}{" "}
                  <span className="text-xs text-neutralCustom-500">({f.margenNetoPct.toFixed(0)} %)</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
