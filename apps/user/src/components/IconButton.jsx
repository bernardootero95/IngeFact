/** Boton de icono de las columnas de acciones de las tablas de documentos. */
export default function IconButton({ title, onClick, disabled = false, children }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className="p-1.5 text-neutralCustom-500 hover:text-brand-600 hover:bg-brand-50 rounded-brand-md transition-colors disabled:opacity-50"
    >
      {children}
    </button>
  );
}
