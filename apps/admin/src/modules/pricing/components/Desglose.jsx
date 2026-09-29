import { formatoNumero, formatoPesos } from "../format";

function Linea({ concepto, detalle, valor, destacada, positiva }) {
  return (
    <div
      className={`flex justify-between gap-4 py-2.5 text-sm ${
        destacada ? "border-t border-neutralCustom-200 mt-1 pt-3 font-semibold" : "border-b border-dashed border-neutralCustom-100"
      }`}
    >
      <span className={destacada ? "text-neutralCustom-800" : "text-neutralCustom-600"}>
        {concepto}
        {detalle && <small className="block text-xs text-neutralCustom-500 mt-0.5 font-normal">{detalle}</small>}
      </span>
      <span className={`tabular-nums whitespace-nowrap ${positiva ? "text-green-700" : "text-neutralCustom-800"}`}>
        {valor}
      </span>
    </div>
  );
}

export default function Desglose({ resultado, params, costos }) {
  if (resultado.precio === 0) return null;
  const { costo } = resultado;

  return (
    <section
      aria-labelledby="calc-desglose"
      className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6"
    >
      <h3 id="calc-desglose" className="text-base font-medium text-neutralCustom-800 mb-3">
        Desglose
      </h3>
      {resultado.lineas.map((l) => (
        <Linea key={l.concepto} concepto={l.concepto} detalle={l.detalle} valor={formatoPesos(l.valor)} destacada={l.total} />
      ))}
      <Linea
        concepto="Comisión del vendedor"
        detalle={`${params.comisionPct} % del precio`}
        valor={`– ${formatoPesos(resultado.comision)}`}
      />
      <Linea
        concepto="Costo del proveedor tecnológico"
        detalle={`${formatoNumero(costo.promedioMes)} documentos al mes en promedio · ${formatoPesos(costo.costoMes)} al mes × 12`}
        valor={`– ${formatoPesos(costo.costoAnual)}`}
      />
      <Linea concepto="Neto para IngeFact" valor={formatoPesos(resultado.neto)} destacada positiva />
      {resultado.paquetesParaCubrirMensualidad && (
        <p className="mt-3 text-xs text-neutralCustom-500">
          Con {formatoNumero(resultado.paquetesParaCubrirMensualidad)}{" "}
          {resultado.paquetesParaCubrirMensualidad === 1 ? "paquete" : "paquetes"} como este al año cubres la
          mensualidad del proveedor ({formatoPesos(costos.mensualidad)} al mes).
        </p>
      )}
    </section>
  );
}
