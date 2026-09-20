/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,jsx}",
  ],
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
          danger: "#E24B4A",
          warning: "#EF9F27",
          info: "#378ADD",
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
  plugins: [],
};
