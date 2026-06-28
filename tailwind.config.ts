import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        whitewash: "#FAF9F5",
        bottle: "#2F4030",
        sage: "#5C7A5E",
        pine: "#1E2B1F",
        mist: "#9CA89C",
        brass: "#B5824A",
        "brass-bg": "#FBF3E9",
      },
      fontFamily: {
        fraunces: ['Fraunces', 'serif'],
        sans: ['Source Sans 3', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
