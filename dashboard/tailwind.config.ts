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
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        primary: "var(--primary)",
        accent: "var(--accent)",
        "text-muted": "var(--text-muted)",
      },
      boxShadow: {
        'primary-glow': '0 0 20px -5px var(--primary-glow)',
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      animation: {
        'fluid': 'fluid-fade 0.4s cubic-bezier(0.2, 0, 0, 1) forwards',
      },
      keyframes: {
        'fluid-fade': {
          '0%': { opacity: '0', transform: 'scale(0.98) translateY(10px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        }
      }
    },
  },
  plugins: [],
};
export default config;
