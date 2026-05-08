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
        brand: {
          50:  "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        gold: {
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          900: "#451a03",
        },
        surface: {
          0: "#080c14",
          1: "#0d1220",
          2: "#111827",
          3: "#1a2235",
          border: "rgba(255,255,255,0.06)",
        },
      },
      animation: {
        "xp-pulse":     "xp-pulse 0.6s ease-out",
        "level-up":     "level-up 0.8s ease-out",
        "boss-shake":   "boss-shake 0.4s ease-in-out",
        "streak-glow":  "streak-glow 1s ease-in-out infinite alternate",
        "fade-in":      "fade-in 0.3s ease-out",
        "slide-up":     "slide-up 0.4s ease-out",
      },
      keyframes: {
        "xp-pulse": {
          "0%":   { transform: "scale(1)",   opacity: "1" },
          "50%":  { transform: "scale(1.3)", opacity: "0.8" },
          "100%": { transform: "scale(1)",   opacity: "1" },
        },
        "level-up": {
          "0%":   { transform: "scale(0.5) translateY(20px)", opacity: "0" },
          "60%":  { transform: "scale(1.1) translateY(-5px)", opacity: "1" },
          "100%": { transform: "scale(1)   translateY(0)",    opacity: "1" },
        },
        "boss-shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "25%":      { transform: "translateX(-4px)" },
          "75%":      { transform: "translateX(4px)" },
        },
        "streak-glow": {
          "0%":   { boxShadow: "0 0 4px #f59e0b" },
          "100%": { boxShadow: "0 0 16px #f59e0b, 0 0 32px #f59e0b" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(12px)", opacity: "0" },
          to:   { transform: "translateY(0)",    opacity: "1" },
        },
      },
      backgroundImage: {
        "grid-dark": "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
      },
      backgroundSize: {
        "grid-dark": "32px 32px",
      },
    },
  },
  plugins: [],
};

export default config;
