import { formatoNumero } from "../format";

const ATAJOS = [10, 25, 50, 150, 500, 1500, 5000, 10000, 20000, 50000];

export default function DocumentosInput({ documentos, onChange }) {
  const maxSlider = Math.max(50000, documentos);

  return (
    <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6 space-y-4">
      <div>
        <label htmlFor="calc-documentos" className="block text-sm font-medium text-neutralCustom-800 mb-1.5">
          Documentos del paquete (vigencia 12 meses)
        </label>
        <input
          id="calc-documentos"
          type="number"
          min="0"
          step="1"
          value={documentos}
          onChange={(e) => onChange(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
          className="field w-full text-lg tabular-nums"
        />
      </div>
      <input
        type="range"
        min="0"
        max={maxSlider}
        step="10"
        value={documentos}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Ajustar documentos del paquete"
        className="w-full accent-brand-600"
      />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Tamaños frecuentes">
        {ATAJOS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-pressed={documentos === n}
            className={`rounded-full border px-3 py-1 text-xs tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
              documentos === n
                ? "border-brand-600 bg-brand-50 text-brand-700"
                : "border-neutralCustom-200 text-neutralCustom-600 hover:border-brand-400"
            }`}
          >
            {formatoNumero(n)}
          </button>
        ))}
      </div>
    </div>
  );
}
