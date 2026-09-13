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
        // Navy — sidebar / chrome color. Anchored on Joel's requested
        // #150252 (a near-black indigo/violet) at the 700 step, the shade
        // the sidebar itself uses; other steps are tints/shades of the
        // same hue for hover states, text, and borders. Green (brand-*)
        // stays the accent color for active states, links, and figures.
        navy: {
          50: "#f5f4fb",
          100: "#e8e3f7",
          200: "#cabdf4",
          300: "#a187f2",
          400: "#693df5",
          500: "#3b06e5",
          600: "#2b04a9",
          700: "#150252",
          800: "#170453",
          900: "#0f052e",
          950: "#080415",
        },
      },
    },
  },
  plugins: [],
};

export default config;
