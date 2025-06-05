import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const groq = {
  "accent-bg": "#434343",
};

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class"],
  theme: {
    colors: {
      ...colors,
      groq,
    },
  },
  plugins: [],
} satisfies Config;
