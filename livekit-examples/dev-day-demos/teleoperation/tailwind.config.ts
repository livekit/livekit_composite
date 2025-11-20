import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg0: "var(--bg0)",
        bg1: "var(--bg1)",
        bg2: "var(--bg2)",
        bg3: "var(--bg3)",
        panel: "var(--bg-panel)",
        panelSubtle: "var(--bg-panel-subtle)",
        fg0: "var(--fg0)",
        fg1: "var(--fg1)",
        fg2: "var(--fg2)",
        fg3: "var(--fg3)",
        borderStrong: "var(--border-strong)",
        accent: "var(--accent)",
        accentStrong: "var(--accent-strong)",
        accentSubtle: "var(--accent-subtle)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
      },
      fontFamily: {
        sans: [
          "var(--font-public-sans)",
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "sans-serif",
        ],
        display: [
          "var(--font-space-grotesk)",
          "var(--font-public-sans)",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
      },
      animation: {
        wiggle: "wiggle 1s ease-in-out infinite",
      },
      keyframes: {
        wiggle: {
          "0%, 100%": { transform: "rotate(-15deg)" },
          "50%": { transform: "rotate(15deg)" },
        },
      },
      backgroundImage: {
        "aurora-grid":
          "radial-gradient(circle at 20% 20%, rgba(138, 125, 255, 0.2), transparent 42%), radial-gradient(circle at 80% 0%, rgba(30, 213, 249, 0.18), transparent 38%), linear-gradient(135deg, #030712 0%, #050c1f 45%, #091736 100%)",
      },
      boxShadow: {
        glow: "0 25px 80px rgba(3, 10, 30, 0.6)",
        card: "0 12px 45px rgba(2, 6, 23, 0.55)",
      },
      borderRadius: {
        xl: "var(--radius-xl)",
      },
    },
  },
  plugins: [],
};
export default config;
