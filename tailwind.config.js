/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        up: {
          navy: '#0B1215',
          charcoal: '#0F1720',
          surface: '#151D24',
          'surface-raised': '#1A2530',
          border: '#243040',
          'border-subtle': '#1E293B',
          accent: '#10B981',
          'accent-muted': '#059669',
          'accent-glow': 'rgba(16, 185, 129, 0.15)',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'Fira Sans',
          'Droid Sans',
          'Helvetica Neue',
          'sans-serif',
        ],
      },
      boxShadow: {
        'up-sm': '0 1px 2px rgba(0, 0, 0, 0.35)',
        'up-md': '0 4px 12px rgba(0, 0, 0, 0.4)',
        'up-accent': '0 0 0 1px rgba(16, 185, 129, 0.25)',
      },
    },
  },
  plugins: [],
};
