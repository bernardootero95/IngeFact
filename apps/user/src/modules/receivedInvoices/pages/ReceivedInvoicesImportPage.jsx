import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cargarLoteFacturasRecibidas, leerReporteDian } from "@ingefact/core-api";
import { Button } from "@ingefact/ui";
import Sidebar from "../../../components/Sidebar";
import Footer from "../../../components/Footer";
import SelectorReporteDian from "../components/SelectorReporteDian";
import ResumenReporteDian from "../components/ResumenReporteDian";
import ResultadosCargaMasiva from "../components/ResultadosCargaMasiva";
import { contarResultados, partirEnLotes, plural, resultadosDeLoteFallido, validateReporteFile } from "../cargaMasiva";

const leerComoBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });

/**
 * Carga masiva de facturas recibidas desde el reporte de documentos de la
 * DIAN. Pasos: elegir el Excel -> revisar lo que se va a cargar -> cargar
 * por lotes (cada CUFE se consulta en la DIAN) -> resultado por factura.
 */
export default function ReceivedInvoicesImportPage() {
  const navigate = useNavigate();
  const [archivoError, setArchivoError] = useState("");
  const [leyendo, setLeyendo] = useState(false);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [lectura, setLectura] = useState(null);
  const [resultados, setResultados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [iniciada, setIniciada] = useState(false);

  const handleArchivo = async (file) => {
    const mensaje = validateReporteFile(file);
    setArchivoError(mensaje);
    if (mensaje) return;

    setLeyendo(true);
    try {
      const contenido = await leerComoBase64(file);
      setLectura(await leerReporteDian({ nombre_archivo: file.name, contenido_base64: contenido }));
      setNombreArchivo(file.name);
    } catch (err) {
      setArchivoError(err.message);
    } finally {
      setLeyendo(false);
    }
  };

  const cargar = async (cufes) => {
    setIniciada(true);
    setCargando(true);
    for (const lote of partirEnLotes(cufes)) {
      let respuesta;
      try {
        respuesta = await cargarLoteFacturasRecibidas(lote);
      } catch (err) {
        respuesta = resultadosDeLoteFallido(lote, err.message);
      }
      setResultados((previos) => [...previos, ...respuesta]);
    }
    setCargando(false);
  };

  const handleCargar = () => cargar(lectura.candidatas.map((c) => c.cufe));

  const handleReintentar = () => {
    const fallidos = resultados.filter((r) => r.resultado === "error").map((r) => r.cufe);
    setResultados((previos) => previos.filter((r) => r.resultado !== "error"));
    cargar(fallidos);
  };

  const reiniciar = () => {
    setLectura(null);
    setNombreArchivo("");
    setResultados([]);
    setIniciada(false);
    setArchivoError("");
  };

  const conteo = contarResultados(resultados);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="relative flex-1 min-w-0 flex flex-col md:h-screen md:overflow-hidden">
        <header className="min-h-16 py-2 md:py-0 md:h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between gap-3 px-4 md:px-8 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutralCustom-500 mb-0.5">
              <Button onClick={() => navigate("/received-invoices")} variant="link" disabled={cargando}>
                Facturas recibidas
              </Button>
              <span>/</span>
              <span>Carga masiva</span>
            </div>
            <h2 className="text-lg font-medium text-neutralCustom-800">Cargar desde el reporte de la DIAN</h2>
          </div>
        </header>

        <div className="p-4 md:p-8 flex-1 overflow-y-auto">
          <section className="max-w-3xl mx-auto bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6 space-y-6">
            {!lectura ? (
              <>
                <div className="space-y-2 text-sm text-neutralCustom-600">
                  <p>
                    En el portal de facturación de la DIAN, descarga en Excel el reporte de documentos del periodo y
                    súbelo aquí.
                  </p>
                  <p className="text-xs text-neutralCustom-500">
                    Solo se cargan las facturas electrónicas a crédito emitidas a tu empresa. Las notas, la nómina, los
                    documentos soporte, las facturas de contado y las que ya registraste se omiten. Antes de cargar
                    cada factura la consultamos en la DIAN.
                  </p>
                </div>
                <SelectorReporteDian onArchivo={handleArchivo} error={archivoError} ocupado={leyendo} />
              </>
            ) : !iniciada ? (
              <>
                <ResumenReporteDian lectura={lectura} nombreArchivo={nombreArchivo} />
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-neutralCustom-100">
                  <Button variant="ghost" onClick={reiniciar}>
                    Elegir otro archivo
                  </Button>
                  {lectura.candidatas.length > 0 && (
                    <Button variant="primary" onClick={handleCargar}>
                      Cargar {plural(lectura.candidatas.length, "factura", "facturas")}
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <>
                <ResultadosCargaMasiva candidatas={lectura.candidatas} resultados={resultados} cargando={cargando} />
                {cargando ? (
                  <p className="p-3 bg-amber-50 border border-fiscal-warning text-amber-800 text-sm rounded-brand-md">
                    No cierres esta página hasta que termine la carga.
                  </p>
                ) : (
                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-neutralCustom-100">
                    <Button variant="ghost" onClick={reiniciar}>
                      Cargar otro reporte
                    </Button>
                    {conteo.error > 0 && (
                      <Button variant="secondary" onClick={handleReintentar}>
                        Reintentar {plural(conteo.error, "fallida", "fallidas")}
                      </Button>
                    )}
                    <Button variant="primary" onClick={() => navigate("/received-invoices")}>
                      Ir a facturas recibidas
                    </Button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
        <Footer />
      </main>
    </div>
  );
}
