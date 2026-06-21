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
        // Light civic-planning palette (redesign/civic-planning-ui, Phase 1). Deliberately a
        // distinct namespace from `up.*` above — nothing in `up.*` is renamed or removed yet;
        // see design-system/MASTER.md for the full token audit and migration plan.
        civic: {
          bg: '#F4F6F3',
          surface: '#FFFFFF',
          'surface-secondary': '#F8FAF8',
          border: '#DDE3DF',
          text: '#17201C',
          'text-muted': '#65706A',
          accent: '#167A59',
          accessibility: '#3975A8',
          housing: '#B7791F',
          'risk-low': '#167A59',
          'risk-moderate': '#B7791F',
          'risk-high': '#C2410C',
          'risk-critical': '#B91C1C',
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
        // Single subtle elevation step for the light civic palette — no colored glow.
        'civic-sm': '0 1px 2px rgba(23, 32, 28, 0.06)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        shimmer: 'shimmer 3s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
