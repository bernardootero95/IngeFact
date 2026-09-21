import { useState, useRef, useEffect, useId } from "react";

/**
 * Select con búsqueda por texto, para catálogos largos (ej. unidades de
 * medida DIAN) donde un <select> nativo con cientos de opciones es incómodo
 * de recorrer. `options` es [{ code, value }]; se selecciona por `code`.
 */
const defaultFormatOption = (opt) => `${opt.code} - ${opt.value}`;

export default function SearchableSelect({
  id,
  options,
  value,
  onChange,
  placeholder = "Buscar...",
  error = false,
  disabled = false,
  formatOption = defaultFormatOption,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);
  const listId = useId();

  const selectedOption = options.find((opt) => opt.code === value);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = query
    ? options.filter(
        (opt) =>
          opt.value.toLowerCase().includes(query.toLowerCase()) ||
          opt.code.toLowerCase().includes(query.toLowerCase()),
      )
    : options;

  const handleSelect = (opt) => {
    onChange(opt.code);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <input
        type="text"
        id={id}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setIsOpen(false);
            setQuery("");
          }
        }}
        disabled={disabled}
        value={isOpen ? query : selectedOption ? formatOption(selectedOption) : ""}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          setIsOpen(true);
          setQuery("");
        }}
        placeholder={placeholder}
        className={`field w-full disabled:bg-neutralCustom-50 disabled:text-neutralCustom-400 ${
          error
            ? "border-fiscal-danger field-invalid"
            : ""
        }`}
      />
      {isOpen && (
        <div id={listId} role="listbox" className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-neutralCustom-200 rounded-brand-md shadow-lg">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <button
                type="button"
                role="option"
                aria-selected={opt.code === value}
                key={opt.code}
                onClick={() => handleSelect(opt)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-brand-50 transition-colors"
              >
                {formatOption(opt)}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-neutralCustom-500">
              Sin resultados
            </div>
          )}
        </div>
      )}
    </div>
  );
}
