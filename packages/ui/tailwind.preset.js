/**
 * Preset de Tailwind compartido por las apps (user, admin). Es la unica fuente
 * de los tokens de diseno: si un color/animacion se usa en un componente de
 * packages/ui o en una pagina, debe existir aqui.
 *
 * Contraste (WCAG AA, 4.5:1 para texto normal):
 * - fiscal.danger #C62828 -> 5.6:1 sobre blanco, 4.8:1 sobre danger/10.
 * - fiscal.info   #2B6CB0 -> 5.4:1 sobre blanco, 4.7:1 sobre info/10.
 * - fiscal.warning es solo para fondos/bordes; para TEXTO usar text-amber-700.
 * - brand.400 y neutralCustom.400 no llegan a 4.5:1 sobre blanco: usarlos para
 *   bordes/iconos decorativos, no para texto sobre fondo claro.
 */
/**
 * Estilo unico de inputs/selects/textareas. Alturas iguales a las del Button:
 * field = 38px, field-sm = 30px, field-lg = 44px. Lleva foco visible (outline de
 * 2px, no solo cambio de borde) y placeholder con contraste 4.5:1. Para marcar
 * un error se agrega `field-invalid` (borde y foco en rojo).
 */
const fieldComponents = ({ addComponents, theme }) => {
  addComponents({
    ".field": {
      backgroundColor: "#fff",
      color: theme("colors.neutralCustom.800"),
      border: `1px solid ${theme("colors.neutralCustom.200")}`,
      borderRadius: theme("borderRadius.brand-md"),
      padding: "0.5rem 0.75rem",
      minHeight: "2.375rem",
      fontSize: "0.875rem",
      lineHeight: "1.25rem",
      transition: "border-color 150ms ease, outline-color 150ms ease",
      "&::placeholder": { color: theme("colors.neutralCustom.500") },
      // Chrome agrega alto propio a los campos de fecha/hora por el icono del selector.
      "&[type='date'], &[type='time'], &[type='datetime-local'], &[type='month']": {
        height: "2.375rem",
        paddingTop: "0",
        paddingBottom: "0",
      },
      // Sin flechitas de incremento en campos numericos (se hacia clic en ellas por error).
      "&[type='number']": { MozAppearance: "textfield" },
      "&[type='number']::-webkit-inner-spin-button, &[type='number']::-webkit-outer-spin-button": {
        WebkitAppearance: "none",
        margin: "0",
      },
      "&:focus": {
        outline: `2px solid ${theme("colors.brand.400")}`,
        outlineOffset: "0px",
        borderColor: theme("colors.brand.400"),
      },
      "&:disabled": {
        backgroundColor: theme("colors.neutralCustom.50"),
        color: theme("colors.neutralCustom.500"),
        cursor: "not-allowed",
      },
    },
    ".field-sm": { padding: "0.25rem 0.5rem", minHeight: "1.875rem" },
    ".field-lg": { padding: "0.6875rem 1rem", minHeight: "2.75rem" },
    ".field-invalid": {
      borderColor: theme("colors.fiscal.danger"),
      "&:focus": {
        outlineColor: theme("colors.fiscal.danger"),
        borderColor: theme("colors.fiscal.danger"),
      },
    },
  });
};

export default {
  plugins: [fieldComponents],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#EAF5E9",
          100: "#D3EBD1",
          200: "#A9D8A6",
          400: "#3D9E3A",
          500: "#2E8A2B",
          600: "#1E7A1B",
          700: "#176015",
          800: "#114810",
        },
        neutralCustom: {
          50: "#F7F8F9",
          100: "#EEEEF0",
          200: "#E1E2E6",
          300: "#C9CBD2",
          400: "#8A8D99",
          500: "#6B6E7A",
          600: "#4E515C",
          700: "#363842",
          800: "#1A1C23",
        },
        fiscal: {
          danger: "#C62828",
          warning: "#EF9F27",
          info: "#2B6CB0",
        },
      },
      borderRadius: {
        "brand-md": "10px",
        "brand-lg": "14px",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      keyframes: {
        "bounce-in": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "none" },
        },
      },
      animation: {
        "bounce-in": "bounce-in 0.25s ease-out",
      },
    },
  },
};
