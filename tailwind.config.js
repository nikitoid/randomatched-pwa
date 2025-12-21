/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          50: 'rgb(var(--primary-50) / <alpha-value>)',
          100: 'rgb(var(--primary-100) / <alpha-value>)',
          200: 'rgb(var(--primary-200) / <alpha-value>)',
          300: 'rgb(var(--primary-300) / <alpha-value>)',
          400: 'rgb(var(--primary-400) / <alpha-value>)',
          500: 'rgb(var(--primary-500) / <alpha-value>)',
          600: 'rgb(var(--primary-600) / <alpha-value>)',
          700: 'rgb(var(--primary-700) / <alpha-value>)',
          800: 'rgb(var(--primary-800) / <alpha-value>)',
          900: 'rgb(var(--primary-900) / <alpha-value>)',
          950: 'rgb(var(--primary-950) / <alpha-value>)',
        },
        secondary: {
          50: 'rgb(var(--secondary-50) / <alpha-value>)',
          100: 'rgb(var(--secondary-100) / <alpha-value>)',
          200: 'rgb(var(--secondary-200) / <alpha-value>)',
          300: 'rgb(var(--secondary-300) / <alpha-value>)',
          400: 'rgb(var(--secondary-400) / <alpha-value>)',
          500: 'rgb(var(--secondary-500) / <alpha-value>)',
          600: 'rgb(var(--secondary-600) / <alpha-value>)',
          700: 'rgb(var(--secondary-700) / <alpha-value>)',
          800: 'rgb(var(--secondary-800) / <alpha-value>)',
          900: 'rgb(var(--secondary-900) / <alpha-value>)',
          950: 'rgb(var(--secondary-950) / <alpha-value>)',
        }
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      keyframes: {
          fadeIn: {
              '0%': { opacity: '0' },
              '100%': { opacity: '1' },
          },
          menuIn: {
              '0%': { opacity: '0', transform: 'scale(0.95) translateY(-4px)' },
              '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
          },
          menuInUp: {
              '0%': { opacity: '0', transform: 'scale(0.95) translateY(4px)' },
              '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
          },
          heroIn: {
              '0%': { opacity: '0', transform: 'scale(0.5) translateY(10px)' },
              '60%': { transform: 'scale(1.1) translateY(-2px)' }, 
              '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
          },
          pulseSoft: {
              '0%, 100%': { opacity: '1', transform: 'scale(1)' },
              '50%': { opacity: '0.5', transform: 'scale(0.95)' },
          }
      },
      animation: {
          'fade-in': 'fadeIn 0.2s ease-out forwards',
          'menu-in': 'menuIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          'menu-in-up': 'menuInUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          'hero-reveal': 'heroIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      }
    }
  }
}