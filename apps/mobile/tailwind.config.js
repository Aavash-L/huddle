/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Huddle brand colors
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#667EEA',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        // Theme gradients (approximated as single colors for Tailwind)
        sunset: {
          from: '#FF6B6B',
          to: '#FFE66D',
        },
        ocean: {
          from: '#667EEA',
          to: '#764BA2',
        },
        neon: {
          from: '#11998E',
          to: '#38EF7D',
        },
        forest: {
          from: '#134E5E',
          to: '#71B280',
        },
        candy: {
          from: '#F857A6',
          to: '#FF5858',
        },
        midnight: {
          from: '#0F2027',
          mid: '#203A43',
          to: '#2C5364',
        },
        // Commitment status colors
        commit: {
          in: '#22C55E',
          wavering: '#EAB308',
          out: '#EF4444',
          pending: '#6B7280',
        },
      },
      fontFamily: {
        sans: ['System'],
        mono: ['SpaceMono'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
    },
  },
  plugins: [],
};
