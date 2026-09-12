import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f9f0",
          100: "#dcf1dc",
          200: "#bbe3bb",
          300: "#8fce8f",
          400: "#5fb35f",
          500: "#3d9640",
          600: "#2c7a30",
          700: "#256128",
          800: "#214e24",
          900: "#1c4120",
          950: "#0c2410",
        },
      },
    },
  },
  plugins: [],
};

export default config;
