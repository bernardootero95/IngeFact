/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#EAF5E9",
          400: "#3D9E3A",
          600: "#1E7A1B",
        },
        neutralCustom: {
          50: "#F7F8F9",
          100: "#EEEEF0",
          500: "#6B6E7A",
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
    },
  },
  plugins: [],
};
