import type { Config } from "tailwindcss";

// Simple Tailwind config like 7 days ago
export default {
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        'buckeye-red': '#BB0000',
        'buckeye-red-dark': '#9A0000', 
        'charcoal-gray': '#404040',
        'home-depot-orange': '#F96302',
      },
      fontFamily: {
        'sans': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;