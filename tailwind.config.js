/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0f172a',
          panel: '#1e293b',
          card: '#27374d',
        },
        accent: {
          DEFAULT: '#38bdf8',
          good: '#22c55e',
          warn: '#f59e0b',
          bad: '#ef4444',
        },
      },
    },
  },
  plugins: [],
};
