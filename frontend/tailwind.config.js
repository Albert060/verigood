/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Cuaderno del Catedrático (clean off-white canvas) ──
        papel: '#FFFEF9',
        'papel-hover': '#F4EFE0',
        tinta: '#14182B',
        marino: '#1F2A4D',
        granate: '#6B1F2A',
        amarillo: '#E8D89A',
        linea: '#C9B998',
        marron: '#3F2E1A',
        'marron-soft': '#5C4A33',
        'card-bg': '#FFFFFF',
        'sidebar-bg': '#F4EFE0',
      },
      fontFamily: {
        display: ['"Libre Baskerville"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        caveat: ['Caveat', 'cursive'],
        mono: ['"JetBrains Mono"', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['11px', { lineHeight: '15px' }],
      },
      borderRadius: {
        DEFAULT: '10px',
        none: '0',
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '18px',
        '2xl': '24px',
        '3xl': '32px',
        full: '9999px',
      },
      boxShadow: {
        card: '0 2px 6px rgba(63,46,26,0.06), 0 1px 2px rgba(63,46,26,0.04)',
        'card-hover': '0 8px 22px rgba(63,46,26,0.12), 0 2px 4px rgba(63,46,26,0.06)',
        soft: '0 4px 12px rgba(63,46,26,0.08)',
        none: 'none',
      },
      backgroundImage: {
        'grid-paper':
          'linear-gradient(var(--linea-faint) 1px, transparent 1px), linear-gradient(90deg, var(--linea-faint) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid-24': '24px 24px',
      },
      keyframes: {
        'slide-in': { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        'highlight-sweep': { '0%': { width: '0%' }, '100%': { width: '100%' } },
        'stamp-in': { '0%': { opacity: 0, transform: 'scale(1.3) rotate(-3deg)' }, '100%': { opacity: 0.85, transform: 'scale(1) rotate(-2deg)' } },
        'draw-circle': { '0%': { strokeDashoffset: 300 }, '100%': { strokeDashoffset: 0 } },
      },
      animation: {
        'slide-in': 'slide-in 300ms ease-out',
        'highlight-sweep': 'highlight-sweep 200ms ease-out forwards',
        'stamp-in': 'stamp-in 400ms ease-out forwards',
        'draw-circle': 'draw-circle 600ms ease-out forwards',
      },
    },
  },
  plugins: [],
};
