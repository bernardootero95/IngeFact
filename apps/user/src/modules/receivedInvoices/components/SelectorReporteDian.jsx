import { useId, useRef, useState } from "react";
import { Button, FieldError, fieldA11y } from "@ingefact/ui";
import { MAX_MB_REPORTE } from "../cargaMasiva";

/**
 * Zona para elegir el Excel de la DIAN: se puede arrastrar el archivo o usar
 * el botón (alternativa sin arrastre, WCAG 2.5.7).
 */
export default function SelectorReporteDian({ onArchivo, error, ocupado }) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [arrastrando, setArrastrando] = useState(false);

  const elegir = (file) => {
    if (file && !ocupado) onArchivo(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setArrastrando(false);
    elegir(e.dataTransfer.files?.[0]);
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!ocupado) setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-3 px-6 py-10 text-center border-2 border-dashed rounded-brand-lg transition-colors duration-150 ${
          arrastrando
            ? "border-brand-400 bg-brand-50"
            : error
              ? "border-fiscal-danger bg-red-50"
              : "border-neutralCustom-200 bg-neutralCustom-50"
        }`}
      >
        <svg className="w-10 h-10 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <div>
          <p className="text-sm font-medium text-neutralCustom-800">Arrastra aquí el Excel del reporte</p>
          <p className="text-xs text-neutralCustom-500">Archivo .xlsx de máximo {MAX_MB_REPORTE} MB</p>
        </div>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => {
            elegir(e.target.files?.[0]);
            e.target.value = "";
          }}
          className="sr-only"
          aria-label="Reporte de documentos de la DIAN en Excel"
          {...fieldA11y(inputId, error)}
        />
        <Button onClick={() => inputRef.current?.click()} loading={ocupado} title="Elegir el Excel del reporte">
          Elegir archivo
        </Button>
        {ocupado && (
          <p role="status" className="text-xs text-neutralCustom-500">
            Leyendo el reporte...
          </p>
        )}
      </div>
      <FieldError fieldId={inputId}>{error}</FieldError>
    </div>
  );
}
