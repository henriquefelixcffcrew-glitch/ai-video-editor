/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        editor: {
          bg: '#0a0a0f',
          panel: '#12121a',
          surface: '#1a1a25',
          border: '#2a2a3a',
          accent: '#6366f1',
          'accent-hover': '#818cf8',
          text: '#e2e8f0',
          'text-dim': '#94a3b8',
        },
      },
    },
  },
  plugins: [],
};
