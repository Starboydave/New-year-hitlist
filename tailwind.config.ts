import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sage: {
          50: "#f4f7f4", 100: "#e6ede6", 200: "#cddbcd", 300: "#a9c1a9",
          400: "#82a182", 500: "#628464", 600: "#4c6a4e", 700: "#3e553f",
          800: "#334534", 900: "#2b392c",
        },
        slate: {
          50: "#f6f7f8", 100: "#eceef0", 200: "#d6dade", 300: "#b4bbc3",
          400: "#8b95a1", 500: "#6c7783", 600: "#566069", 700: "#464e56",
          800: "#2f353b", 900: "#1f2428",
        },
      },
      fontFamily: { sans: ["ui-sans-serif", "system-ui", "Segoe UI", "Inter", "sans-serif"] },
      keyframes: {
        fadeUp: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "none" } },
      },
      animation: { fadeUp: "fadeUp .35s ease-out both" },
    },
  },
  plugins: [],
};
export default config;
