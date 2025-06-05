import type { Config } from "tailwindcss";

const colors = require("tailwindcss/colors");

const groq = {
  "accent-bg": "#434343",
};

const customColors = {
  groq,
};

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      black: colors.black,
      white: colors.white,
      gray: colors.neutral,
      ...colors,
      ...customColors,
    },
    extend: {
      borderRadius: {
        sm: "calc(var(--radius) - 4px)",
        md: "calc(var(--radius) - 2px)",
        lg: "var(--radius)",
      },
    },
  },
} satisfies Config;

export default config;
