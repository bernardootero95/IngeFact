import { useId, useRef, useState } from "react";
import { actualizarDatosEmpresa, eliminarLogoEmpresa, subirLogoEmpresa } from "@ingefact/core-api";
import { Button } from "@ingefact/ui";
import { useLogoDocumentos } from "../../../hooks/useLogoDocumentos";
import { MAX_KB_LOGO, TIPOS_LOGO, validateLogoFile } from "./logoEmpresa.validation";

const leerComoDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });

/**
 * Logo que se imprime en el encabezado de las facturas y demás documentos.
 * Cada acción se guarda de inmediato (no depende del botón "Guardar" del
 * formulario de datos de contacto).
 */
export default function LogoEmpresaCard({ empresa, onActualizada }) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const logoGuardado = useLogoDocumentos(empresa?.tiene_logo ? { ...empresa, mostrar_logo: true } : null);
  const logoVisible = preview || logoGuardado;

  const ejecutar = async (accion) => {
    setOcupado(true);
    setError("");
    try {
      await accion();
      await onActualizada();
    } catch (err) {
      setError(err.message);
    } finally {
      setOcupado(false);
    }
  };

  const handleArchivo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const mensaje = validateLogoFile(file);
    if (mensaje) {
      setError(mensaje);
      return;
    }
    const dataUrl = await leerComoDataUrl(file);
    await ejecutar(async () => {
      await subirLogoEmpresa(dataUrl);
      setPreview(dataUrl);
    });
  };

  const handleEliminar = () =>
    ejecutar(async () => {
      await eliminarLogoEmpresa();
      setPreview(null);
    });

  const handleMostrar = (e) => {
    const mostrar = e.target.checked;
    // El PATCH reemplaza los datos de contacto: se reenvían los guardados.
    return ejecutar(() =>
      actualizarDatosEmpresa({
        nombre_comercial: empresa.nombre_comercial,
        telefono: empresa.telefono,
        direccion: empresa.direccion,
        mostrar_logo: mostrar,
      }),
    );
  };

  return (
    <section className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6" aria-labelledby={`${inputId}-titulo`}>
      <h3 id={`${inputId}-titulo`} className="text-base font-semibold text-neutralCustom-800 mb-1">
        Logo en tus documentos
      </h3>
      <p className="text-xs text-neutralCustom-500 mb-4">
        PNG o JPG de máximo {MAX_KB_LOGO} KB. Se imprime en el encabezado de tus facturas, notas y demás documentos.
      </p>

      {error && (
        <div role="alert" className="mb-4 p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-40 h-20 shrink-0 flex items-center justify-center border border-dashed border-neutralCustom-200 rounded-brand-md bg-neutralCustom-50">
          {logoVisible ? (
            <img src={logoVisible} alt="Logo actual de la empresa" className="max-h-16 max-w-[150px] object-contain" />
          ) : (
            <span className="text-xs text-neutralCustom-500">Sin logo</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={TIPOS_LOGO.join(",")}
            onChange={handleArchivo}
            className="sr-only"
          />
          <Button onClick={() => inputRef.current?.click()} loading={ocupado} disabled={ocupado}>
            {empresa?.tiene_logo ? "Cambiar logo" : "Subir logo"}
          </Button>
          {empresa?.tiene_logo && (
            <Button variant="ghost" onClick={handleEliminar} disabled={ocupado}>
              Quitar
            </Button>
          )}
        </div>
      </div>

      <label className="mt-5 flex items-start gap-3 text-sm text-neutralCustom-800">
        <input
          type="checkbox"
          checked={Boolean(empresa?.mostrar_logo)}
          onChange={handleMostrar}
          disabled={ocupado || !empresa?.tiene_logo}
          className="mt-0.5 h-4 w-4 accent-brand-600"
        />
        <span>
          Imprimir el logo en mis facturas y documentos
          {!empresa?.tiene_logo && (
            <span className="block text-xs text-neutralCustom-500">Primero sube el logo.</span>
          )}
        </span>
      </label>
    </section>
  );
}
