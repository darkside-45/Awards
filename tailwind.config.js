/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6eaf3',
          100: '#c2cce6',
          200: '#9ea9d9',
          300: '#7a86cc',
          400: '#5663bf',
          500: '#3240b2',
          600: '#28338d',
          700: '#1e2668',
          800: '#141943',
          900: '#002060',
          950: '#001540',
        },
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        lato: ['Lato', 'sans-serif'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulse_glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 32, 96, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(0, 32, 96, 0.6)' },
        },
        confetti: {
          '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(-100px) rotate(720deg)', opacity: '0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.6s ease-out forwards',
        'slide-up': 'slide-up 0.8s ease-out forwards',
        'scale-in': 'scale-in 0.5s ease-out forwards',
        shimmer: 'shimmer 2s linear infinite',
        pulse_glow: 'pulse_glow 2s ease-in-out infinite',
        confetti: 'confetti 1s ease-out forwards',
      },
    },
  },
  plugins: [],
};
