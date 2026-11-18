/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        page: 'var(--page)',
        app: 'var(--app)',
        surface: {
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)'
        },
        hairline: 'var(--border)',
        ink: {
          DEFAULT: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)'
        },
        accent: {
          DEFAULT: 'var(--accent)',
          strong: 'var(--accent-strong)',
          soft: 'var(--accent-soft)',
          ring: 'var(--accent-ring)'
        },
        positive: {
          DEFAULT: 'var(--positive)',
          soft: 'var(--positive-soft)'
        },
        negative: {
          DEFAULT: 'var(--negative)',
          soft: 'var(--negative-soft)'
        },
        warn: {
          DEFAULT: 'var(--warning)',
          soft: 'var(--warning-soft)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Devanagari', 'Noto Sans Gujarati', 'system-ui', 'sans-serif'],
        devanagari: ['Noto Sans Devanagari', 'Inter', 'sans-serif'],
        gujarati: ['Noto Sans Gujarati', 'Inter', 'sans-serif']
      },
      borderRadius: {
        sm: '10px',
        md: '14px',
        lg: '20px',
        xl: '26px',
        pill: '999px'
      },
      boxShadow: {
        soft: '0 1px 2px rgba(0,0,0,.16), 0 8px 24px -12px rgba(0,0,0,.45)',
        lift: '0 18px 40px -20px rgba(0,0,0,.65)',
        glow: '0 0 0 1px var(--accent-ring), 0 16px 48px -16px rgba(212,103,63,.55)'
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.22, 1, 0.36, 1)'
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' }
        },
        'tassel-swing': {
          '0%': { transform: 'rotate(-26deg)' },
          '55%': { transform: 'rotate(10deg)' },
          '78%': { transform: 'rotate(-5deg)' },
          '100%': { transform: 'rotate(0deg)' }
        },
        'pulse-dot': {
          '0%, 80%, 100%': { opacity: '0.25', transform: 'translateY(0)' },
          '40%': { opacity: '1', transform: 'translateY(-3px)' }
        }
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        'tassel-swing': 'tassel-swing 900ms cubic-bezier(0.22, 1, 0.36, 1) 220ms 1 both',
        'pulse-dot': 'pulse-dot 1.2s infinite ease-in-out'
      }
    }
  },
  plugins: []
};
