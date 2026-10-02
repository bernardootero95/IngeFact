import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { consultarFacturaRecibida, crearFacturaRecibida } from "@ingefact/core-api";
import { Button, FieldError, fieldA11y } from "@ingefact/ui";
import Sidebar from "../../../components/Sidebar";
import Footer from "../../../components/Footer";
import ResumenFacturaRecibida from "../components/ResumenFacturaRecibida";
import { validateCufe } from "./ReceivedInvoiceFormPage.validation";

export default function ReceivedInvoiceFormPage() {
  const navigate = useNavigate();

  const [cufe, setCufe] = useState("");
  const [cufeError, setCufeError] = useState("");
  const [consulta, setConsulta] = useState(null);
  const [isConsulting, setIsConsulting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleCufeChange = (e) => {
    setCufe(e.target.value);
    setCufeError(validateCufe(e.target.value));
    // Cambiar el CUFE invalida la vista previa anterior.
    setConsulta(null);
    setError(null);
  };

  const handleConsultar = async (e) => {
    e.preventDefault();
    const mensaje = validateCufe(cufe);
    setCufeError(mensaje);
    if (mensaje) return;

    setIsConsulting(true);
    setError(null);
    setConsulta(null);
    try {
      setConsulta(await consultarFacturaRecibida(cufe.trim()));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsConsulting(false);
    }
  };

  const handleAgregar = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await crearFacturaRecibida({ cufe: consulta.cufe });
      navigate("/received-invoices");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="relative flex-1 min-w-0 flex flex-col md:h-screen md:overflow-hidden">
        <header className="min-h-16 py-2 md:py-0 md:h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between gap-3 px-4 md:px-8 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutralCustom-500 mb-0.5">
              <Button onClick={() => navigate("/received-invoices")} variant="link">
                Facturas recibidas
              </Button>
              <span>/</span>
              <span>Agregar</span>
            </div>
            <h2 className="text-lg font-medium text-neutralCustom-800">Agregar factura recibida</h2>
          </div>
        </header>

        <div className="p-4 md:p-8 flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto space-y-6">
            <form
              onSubmit={handleConsultar}
              noValidate
              className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6 space-y-3"
            >
              <label htmlFor="cufe" className="block text-sm font-medium text-neutralCustom-800">
                CUFE de la factura <span className="text-fiscal-danger" aria-hidden="true">*</span>
                <span className="sr-only"> (obligatorio)</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  id="cufe"
                  value={cufe}
                  onChange={handleCufeChange}
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Pega aquí el CUFE que viene en el XML o PDF del proveedor"
                  className={`field flex-1 font-mono text-xs ${cufeError ? "border-fiscal-danger field-invalid" : ""}`}
                  {...fieldA11y("cufe", cufeError)}
                />
                <Button type="submit" variant="primary" loading={isConsulting} title="Consultar la factura en la DIAN">
                  Consultar
                </Button>
              </div>
              {cufeError && <FieldError fieldId="cufe">{cufeError}</FieldError>}
              <p className="text-xs text-neutralCustom-500">
                Solo se cargan facturas a crédito: la DIAN no permite registrar eventos sobre facturas de contado.
              </p>
            </form>

            {error && (
              <div role="alert" className="p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
                {error}
              </div>
            )}

            {consulta && (
              <section
                aria-label="Resumen de la factura"
                className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6 space-y-5"
              >
                <h3 className="text-base font-semibold text-neutralCustom-800">Resumen de la factura</h3>
                <ResumenFacturaRecibida factura={consulta} />

                {consulta.puede_registrar ? null : (
                  <div role="alert" className="p-3 bg-amber-50 border border-fiscal-warning text-amber-800 text-sm rounded-brand-md">
                    {consulta.motivo_bloqueo}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-neutralCustom-100">
                  <Button variant="ghost" onClick={() => navigate("/received-invoices")} disabled={isSaving}>
                    Cancelar
                  </Button>
                  {consulta.puede_registrar && (
                    <Button variant="primary" onClick={handleAgregar} loading={isSaving} title="Agregar a facturas recibidas">
                      Agregar
                    </Button>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
        <Footer />
      </main>
    </div>
  );
}
