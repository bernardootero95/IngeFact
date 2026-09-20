/**
 * Boton solo-icono para las columnas de acciones de las tablas. Siempre lleva
 * `title` (tooltip + aria-label), porque no tiene texto visible.
 */
const VARIANTS = {
  default: "text-neutralCustom-500 hover:text-brand-600 hover:bg-brand-50",
  danger: "text-neutralCustom-500 hover:text-red-600 hover:bg-red-50",
};

export default function IconButton({ title, onClick, disabled = false, variant = "default", children }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-brand-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]}`}
    >
      {children}
    </button>
  );
}
