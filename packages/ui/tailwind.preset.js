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
export default {
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
