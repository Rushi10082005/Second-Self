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
          DEFAULT: 'var(--bg-canvas)',
          muted: 'var(--bg-canvas-muted)',
          surface: 'var(--bg-canvas-surface)',
          card: 'var(--bg-canvas-card)',
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
