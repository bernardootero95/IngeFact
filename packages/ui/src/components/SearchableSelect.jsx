import { useState, useRef, useEffect, useId } from "react";
import { fieldA11y } from "./FormFeedback.jsx";

/**
 * Select con búsqueda por texto, para catálogos largos (ej. unidades de
 * medida DIAN) donde un <select> nativo con cientos de opciones es incómodo
 * de recorrer. `options` es [{ code, value }]; se selecciona por `code`.
 *
 * Teclado (patrón ARIA combobox): flechas para recorrer, Enter para elegir,
 * Escape para cerrar. `error` puede ser un booleano o el mensaje: si hay
 * error y `id`, el campo queda vinculado a <FieldError fieldId={id}>.
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
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();
  const optionId = (index) => `${listId}-opcion-${index}`;

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

  // Mantener visible la opcion activa al recorrer con flechas.
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    listRef.current.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex, isOpen]);

  const close = () => {
    setIsOpen(false);
    setQuery("");
  };

  const handleSelect = (opt) => {
    onChange(opt.code);
    close();
  };

  const handleKeyDown = (e) => {
    const last = filteredOptions.length - 1;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) setIsOpen(true);
      else setActiveIndex((i) => Math.min(i + 1, last));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && isOpen) {
      // Evita enviar el formulario al elegir una opcion con Enter.
      e.preventDefault();
      const opt = filteredOptions[activeIndex];
      if (opt) handleSelect(opt);
    } else if (e.key === "Escape") {
      close();
    } else if (e.key === "Tab") {
      close();
    }
  };

  const activeOptionId = isOpen && filteredOptions[activeIndex] ? optionId(activeIndex) : undefined;

  return (
    <div className="relative" ref={containerRef}>
      <input
        type="text"
        id={id}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeOptionId}
        autoComplete="off"
        onKeyDown={handleKeyDown}
        disabled={disabled}
        value={isOpen ? query : selectedOption ? formatOption(selectedOption) : ""}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(0);
          setIsOpen(true);
        }}
        onFocus={() => {
          setIsOpen(true);
          setQuery("");
          const selectedIndex = options.findIndex((opt) => opt.code === value);
          setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
        }}
        placeholder={placeholder}
        className={`field w-full disabled:bg-neutralCustom-50 disabled:text-neutralCustom-400 ${
          error
            ? "border-fiscal-danger field-invalid"
            : ""
        }`}
        {...(id ? fieldA11y(id, error) : { "aria-invalid": error ? true : undefined })}
      />
      {isOpen && (
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-neutralCustom-200 rounded-brand-md shadow-lg"
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, index) => (
              <li
                id={optionId(index)}
                data-index={index}
                role="option"
                aria-selected={opt.code === value}
                key={opt.code}
                // mousedown en vez de click: se elige antes de que el input pierda el foco.
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(opt);
                }}
                onMouseEnter={() => setActiveIndex(index)}
                className={`w-full cursor-pointer px-3 py-2 text-left text-sm transition-colors ${
                  index === activeIndex ? "bg-brand-50" : ""
                }`}
              >
                {formatOption(opt)}
              </li>
            ))
          ) : (
            <li role="presentation" className="px-3 py-2 text-sm text-neutralCustom-500">
              Sin resultados
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
