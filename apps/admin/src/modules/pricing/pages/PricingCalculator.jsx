import { useMemo, useState } from "react";
import Sidebar from "../../../components/Sidebar";
import { calcularResultado, DEFAULT_COSTOS, DEFAULT_PARAMS } from "../pricingCalculator";
import DocumentosInput from "../components/DocumentosInput";
import ResultadoResumen from "../components/ResultadoResumen";
import Desglose from "../components/Desglose";
import ComparacionFactoa from "../components/ComparacionFactoa";
import TablaPaquetes from "../components/TablaPaquetes";
import ParametrosFormula from "../components/ParametrosFormula";

/**
 * Herramienta interna para cotizar paquetes: precio de venta, comisión,
 * costo ante el proveedor tecnológico y neto. No guarda nada: los
 * parámetros editados vuelven a los valores por defecto al recargar.
 */
export default function PricingCalculator() {
  const [documentos, setDocumentos] = useState(150);
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [costos, setCostos] = useState(DEFAULT_COSTOS);

  const resultado = useMemo(() => calcularResultado(documentos, params, costos), [documentos, params, costos]);

  const seleccionar = (n) => {
    setDocumentos(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="min-h-16 py-2 md:py-0 md:h-16 bg-white border-b border-neutralCustom-100 flex items-center px-4 md:px-8">
          <h2 className="text-lg font-medium text-neutralCustom-800">Calculadora de precios</h2>
        </header>

        <div className="p-4 md:p-8 space-y-6 max-w-[960px] w-full">
          <p className="text-sm text-neutralCustom-500">
            Escribe cuántos documentos tendrá el paquete para ver su precio, el costo ante el proveedor tecnológico y lo
            que te queda después de la comisión.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DocumentosInput documentos={documentos} onChange={setDocumentos} />
            <ResultadoResumen resultado={resultado} />
          </div>

          <Desglose resultado={resultado} params={params} costos={costos} />
          <ComparacionFactoa documentos={documentos} precio={resultado.precio} />
          <TablaPaquetes params={params} costos={costos} onSelect={seleccionar} />
          <ParametrosFormula
            params={params}
            costos={costos}
            onParams={setParams}
            onCostos={setCostos}
            onRestaurar={() => {
              setParams(DEFAULT_PARAMS);
              setCostos(DEFAULT_COSTOS);
            }}
          />
        </div>
      </main>
    </div>
  );
}
