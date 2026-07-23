import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        board: {
          wood: "#c9a45c",
          line: "#5c3d1e",
          dark: "#a8843f",
          frame: "#8b5e2a",
        },
      },
      boxShadow: {
        stone: "inset -2px -3px 6px rgba(0,0,0,0.35), inset 2px 2px 4px rgba(255,255,255,0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
