/**
 * Boton unico de la plataforma. Concentra tamanos, variantes y estados para
 * que todas las pantallas de las apps compartan la misma altura y apariencia.
 *
 * - Todas las variantes llevan borde (transparente en primary/ghost) para que
 *   midan exactamente lo mismo que los inputs (38px) y no salten al mezclarse.
 * - `loading` deshabilita el boton y muestra un spinner centrado sin cambiar
 *   el texto, asi el ancho no varia entre "Guardar" y "Guardando...".
 * - Las etiquetas deben ser cortas (1-2 palabras); el detalle va en `title`.
 */
const BASE =
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-brand-md border font-medium transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-1 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

const SIZES = {
  sm: "h-[30px] px-3 text-sm",
  md: "h-[38px] px-4 text-sm",
  lg: "h-11 px-6 text-sm",
};

const VARIANTS = {
  primary: "border-brand-600 bg-brand-600 text-white hover:bg-brand-700 hover:border-brand-700",
  secondary: "border-neutralCustom-200 bg-white text-neutralCustom-800 hover:bg-neutralCustom-50",
  outline: "border-brand-600 bg-white text-brand-600 hover:bg-brand-50",
  danger: "border-red-600 bg-white text-red-600 hover:bg-red-50",
  "danger-solid": "border-red-600 bg-red-600 text-white hover:bg-red-700 hover:border-red-700",
  ghost: "border-transparent bg-transparent text-neutralCustom-600 hover:bg-neutralCustom-100",
};

// Enlaces de texto: heredan el tamano de fuente del contexto y no tienen altura fija.
const LINK_VARIANTS = {
  link: "border-transparent text-brand-600 hover:underline underline-offset-2",
  "link-danger": "border-transparent text-red-600 hover:underline underline-offset-2",
};

function Spinner() {
  return (
    <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
    </span>
  );
}

export default function Button({
  as: Component = "button",
  variant = "secondary",
  size = "md",
  loading = false,
  fullWidth = false,
  icon: Icon,
  className = "",
  disabled = false,
  children,
  ...rest
}) {
  const isLink = variant in LINK_VARIANTS;
  const isNativeButton = Component === "button";
  const classes = [
    BASE,
    isLink ? LINK_VARIANTS[variant] : `${SIZES[size]} ${VARIANTS[variant]}`,
    isLink ? "rounded-sm px-0.5" : "",
    fullWidth ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const nativeProps = isNativeButton
    ? { type: rest.type ?? "button", disabled: disabled || loading }
    : { "aria-disabled": disabled || loading || undefined };

  return (
    <Component {...rest} {...nativeProps} aria-busy={loading || undefined} className={classes}>
      <span className={`inline-flex items-center justify-center gap-2 ${loading ? "invisible" : ""}`}>
        {Icon && <Icon className="h-4 w-4 shrink-0" />}
        {children}
      </span>
      {loading && (
        <>
          <Spinner />
          <span className="sr-only">Procesando...</span>
        </>
      )}
    </Component>
  );
}
