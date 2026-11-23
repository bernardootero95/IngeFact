import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { descargarExcelEmpresa } from "@ingefact/core-api";
import { Button, ToastAlert } from "@ingefact/ui";
import { useAuthStore } from "../../auth/store/authStore";
import Footer from "../../../components/Footer";
import logo from "../../../assets/logo 2.png";
import PlanAvisoModal from "../components/PlanAvisoModal";
import DocumentosDescargables from "../components/DocumentosDescargables";
import { DownloadIcon, WhatsAppIcon } from "../components/iconos";
import { ESTADO_PLAN, avisoPendiente, enlaceCompraPaquete, formatoFecha, marcarAvisoVisto } from "../planEstado";

const CARD = "rounded-brand-lg border border-neutralCustom-100 bg-white p-6 shadow-sm";

function guardarArchivo(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/**
 * Lo unico que ve el cliente con el plan vencido, en cualquier ruta: un aviso
 * al ingresar y, al cerrarlo, su estado con la invitacion a comprar un
 * paquete y las descargas de su informacion (Excel y PDF/XML de sus
 * documentos). No hay menu: no puede explorar el resto de la app.
 */
export default function PlanVencidoPage({ empresa }) {
  const navigate = useNavigate();
  const { profile, logout } = useAuthStore();
  const suscripcion = empresa.suscripcion;
  const enlaceCompra = enlaceCompraPaquete(empresa);
  const [avisoAbierto, setAvisoAbierto] = useState(() => avisoPendiente(empresa.id, ESTADO_PLAN.VENCIDO));
  const [bajandoExcel, setBajandoExcel] = useState(false);
  const [toast, setToast] = useState({ message: null, type: "success" });

  const cerrarAviso = () => {
    marcarAvisoVisto(empresa.id, ESTADO_PLAN.VENCIDO);
    setAvisoAbierto(false);
  };

  const bajarExcel = async () => {
    setBajandoExcel(true);
    try {
      const blob = await descargarExcelEmpresa();
      const fecha = new Date().toISOString().slice(0, 10);
      guardarArchivo(blob, `ingefact-${empresa.numero_identificacion}-${fecha}.xlsx`);
    } catch (err) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setBajandoExcel(false);
    }
  };

  const salir = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const restantes = Math.max((suscripcion?.max_documentos ?? 0) - (suscripcion?.documentos_usados ?? 0), 0);

  return (
    <div className="flex min-h-screen flex-col bg-neutralCustom-50 font-sans">
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-neutralCustom-100 bg-white px-4 md:px-8">
        <div className="flex items-center gap-2">
          <img src={logo} alt="" className="h-8 w-8 object-contain" />
          <span className="text-lg font-semibold text-brand-700">IngeFact</span>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden truncate text-sm text-neutralCustom-500 sm:inline">{profile?.email}</span>
          <Button variant="ghost" size="sm" onClick={salir}>
            Cerrar sesión
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 p-4 md:p-8">
        <section aria-labelledby="estado-plan-titulo" className={`${CARD} border-t-4 border-t-fiscal-danger`}>
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutralCustom-500">{empresa.razon_social}</p>
              <h1 id="estado-plan-titulo" className="mt-1 text-2xl font-semibold text-neutralCustom-800">
                Tu plan está vencido
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutralCustom-600">
                Tu paquete venció el {formatoFecha(suscripcion?.fecha_fin)}. Mientras no adquieras uno nuevo no podrás
                emitir documentos ni usar el resto de IngeFact, pero tu información sigue guardada y puedes descargarla
                aquí.
              </p>
            </div>
            <Button
              as="a"
              href={enlaceCompra}
              target="_blank"
              rel="noopener noreferrer"
              variant="primary"
              size="lg"
              icon={WhatsAppIcon}
              className="shrink-0"
            >
              Adquirir paquete
            </Button>
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-neutralCustom-100 pt-6 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium uppercase text-neutralCustom-500">Vigencia</dt>
              <dd className="mt-1 text-sm font-medium tabular-nums text-neutralCustom-800">
                {formatoFecha(suscripcion?.fecha_inicio)} – {formatoFecha(suscripcion?.fecha_fin)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-neutralCustom-500">Documentos usados</dt>
              <dd className="mt-1 text-sm font-medium tabular-nums text-neutralCustom-800">
                {(suscripcion?.documentos_usados ?? 0).toLocaleString("es-CO")} de{" "}
                {(suscripcion?.max_documentos ?? 0).toLocaleString("es-CO")}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-neutralCustom-500">Documentos sin usar</dt>
              <dd className="mt-1 text-sm font-medium tabular-nums text-neutralCustom-800">
                {restantes.toLocaleString("es-CO")} (vencieron con el plan)
              </dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="excel-titulo" className={CARD}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="excel-titulo" className="text-base font-medium text-neutralCustom-800">
                Descarga tu información en Excel
              </h2>
              <p className="mt-1 text-sm text-neutralCustom-500">
                Facturas, notas, documentos soporte, nómina, eventos de tus facturas de compra, clientes, proveedores,
                empleados y productos, en un solo archivo.
              </p>
            </div>
            <Button variant="outline" icon={DownloadIcon} loading={bajandoExcel} onClick={bajarExcel} className="shrink-0">
              Descargar Excel
            </Button>
          </div>
        </section>

        <section aria-labelledby="archivos-titulo" className={CARD}>
          <h2 id="archivos-titulo" className="text-base font-medium text-neutralCustom-800">
            PDF y XML de tus documentos
          </h2>
          <p className="mb-4 mt-1 text-sm text-neutralCustom-500">
            Consérvalos: la DIAN te exige guardar tus documentos electrónicos.
          </p>
          <DocumentosDescargables onError={(message) => setToast({ message, type: "error" })} />
        </section>
      </main>

      <Footer />

      <PlanAvisoModal
        abierto={avisoAbierto}
        titulo="Tu plan venció"
        tono="danger"
        enlaceCompra={enlaceCompra}
        onCerrar={cerrarAviso}
      >
        <p>
          Tu paquete de documentos venció el {formatoFecha(suscripcion?.fecha_fin)}. Ya no tienes un plan activo, así
          que no puedes emitir documentos ni usar IngeFact.
        </p>
        <p>Puedes descargar tu información mientras tanto. Adquiere un nuevo paquete para seguir facturando.</p>
      </PlanAvisoModal>

      <ToastAlert message={toast.message} type={toast.type} onClose={() => setToast({ message: null, type: "success" })} />
    </div>
  );
}
