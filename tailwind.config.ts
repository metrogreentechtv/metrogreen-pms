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
          50: "#f4f6fa",
 	 100: "#e5eaf5",
  	 200: "#c3cfef",
  	 300: "#92aae8",
 	 400: "#4f79e3",
  	 500: "#1c4ecf",
 	 600: "#153a99",
  	 700: "#0b1f52",
 	 800: "#0c1e4b",
 	 900: "#09122a",
 	 950: "#060a14",
        },
      },
    },
  },
  plugins: [],
};

export default config;
