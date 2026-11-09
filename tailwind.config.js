/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: '#090D16',
          muted: '#0d1321',
          surface: '#111827',
          card: '#161F30',
        },
        para: {
          projects: '#EF4444',
          areas: '#3B82F6',
          resources: '#10B981',
          archives: '#6B7280',
        },
        accent: {
          cyan: '#38BDF8',
          indigo: '#818CF8',
          violet: '#A855F7',
        },
      },
    },
  },
  plugins: [],
};
