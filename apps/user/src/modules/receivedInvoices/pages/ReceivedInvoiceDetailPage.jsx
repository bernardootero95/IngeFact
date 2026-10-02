import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getFacturaRecibida, registrarEventoReceptor, listPublicReferenceTable } from "@ingefact/core-api";
import { Button, ToastAlert } from "@ingefact/ui";
import Sidebar from "../../../components/Sidebar";
import Footer from "../../../components/Footer";
import ResumenFacturaRecibida from "../components/ResumenFacturaRecibida";
import EstadoBadge from "../components/EstadoBadge";
import DescargarXmlButton from "../components/DescargarXmlButton";
import HistorialEventos from "../components/HistorialEventos";
import RegistrarEventoForm from "../components/RegistrarEventoForm";
import { tipoInicial } from "../eventos";

function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-neutralCustom-50 font-sans">
      <Sidebar />
      {children}
    </div>
  );
}

export default function ReceivedInvoiceDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  const [factura, setFactura] = useState(null);
  const [tiposIdentificacion, setTiposIdentificacion] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [toast, setToast] = useState(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [facturaData, tiposIdentificacionData] = await Promise.all([
        getFacturaRecibida(id),
        listPublicReferenceTable("tipos_identificacion"),
      ]);
      setFactura(facturaData);
      setTiposIdentificacion(tiposIdentificacionData);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleRegistrar = async (payload) => {
    const actualizada = await registrarEventoReceptor(id, payload);
    setFactura(actualizada);
    const ultimo = actualizada.eventos[actualizada.eventos.length - 1];
    setToast(
      actualizada.ultimo_evento_rechazado
        ? { type: "error", message: `La DIAN rechazó el evento: ${ultimo?.razon_rechazo || "revisa el historial."}` }
        : { type: "success", message: `${ultimo?.tipo_label || "Evento"} registrado ante la DIAN.` }
    );
  };

  if (loading) {
    return (
      <Layout>
        <main className="flex-1 p-12 text-center text-sm text-neutralCustom-500 animate-pulse">Cargando...</main>
      </Layout>
    );
  }

  if (loadError || !factura) {
    return (
      <Layout>
        <main className="flex-1 p-8">
          <div role="alert" className="p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
            {loadError || "Factura recibida no encontrada."}
          </div>
        </main>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="relative flex-1 min-w-0 flex flex-col md:h-screen md:overflow-hidden">
        <header className="min-h-16 py-2 md:py-0 md:h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between gap-3 px-4 md:px-8 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutralCustom-500 mb-0.5">
              <Button onClick={() => navigate("/received-invoices")} variant="link">
                Facturas recibidas
              </Button>
              <span>/</span>
              <span>{factura.numero || "Detalle"}</span>
            </div>
            <h2 className="text-lg font-medium text-neutralCustom-800">{factura.proveedor_nombre}</h2>
          </div>
          <div className="flex items-center gap-2">
            <EstadoBadge estado={factura.estado} label={factura.estado_label} />
            <DescargarXmlButton facturaId={factura.id} onError={(message) => setToast({ message, type: "error" })} />
          </div>
        </header>

        {toast && <ToastAlert message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <div className="p-4 md:p-8 flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto space-y-6">
            <section className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6 space-y-4">
              <ResumenFacturaRecibida factura={factura} />
              <div className="border-t border-neutralCustom-100 pt-3">
                <span className="text-xs text-neutralCustom-500">CUFE</span>
                <p className="font-mono text-xs break-all text-neutralCustom-800">{factura.cufe}</p>
              </div>
            </section>

            {factura.eventos_permitidos.length > 0 ? (
              <RegistrarEventoForm
                // Se reinicia al cambiar de estado para ofrecer el siguiente evento.
                key={`${factura.estado}-${factura.eventos.length}`}
                eventosPermitidos={factura.eventos_permitidos}
                tipoInicial={tipoInicial(searchParams.get("evento"), factura.eventos_permitidos)}
                tiposIdentificacion={tiposIdentificacion}
                onRegistrar={handleRegistrar}
              />
            ) : (
              <p className="text-sm text-neutralCustom-600 bg-white border border-neutralCustom-100 rounded-brand-lg p-4">
                El proceso de esta factura terminó: {factura.estado_label.toLowerCase()}.
              </p>
            )}

            <section className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6">
              <h3 className="text-base font-semibold text-neutralCustom-800 mb-4">Historial de eventos</h3>
              <HistorialEventos eventos={factura.eventos} />
            </section>
          </div>
        </div>
        <Footer />
      </main>
    </Layout>
  );
}
