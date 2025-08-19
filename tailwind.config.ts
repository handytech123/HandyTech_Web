import type { Config } from "tailwindcss";

export default {
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        'brand-red': '#BB0000',
        'brand-red-dark': '#9A0000',
        'charcoal': '#404040',
        'light-gray': '#f5f5f5',
      },
    },
  },
  plugins: [],
} satisfies Config;
