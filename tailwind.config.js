/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './screens/**/*.{ts,tsx}',
    './contexts/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
    './utils/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'base': '#0B1B3F',
        'surface': '#142952',
        'overlay': '#1E3A8A',
        'muted': '#93C5FD',
        'subtle': '#60A5FA',
        'text-primary': '#FFFFFF',
        'text-secondary': '#DBEAFE',
        'primary': '#007BFF',
        'primary-focus': '#0056b3',
        'accent': '#8A2BE2',
        'success': '#10B981',
        'danger': '#EF4444',
        'orange': '#F97316',
        'light-bg': '#F3F5F9',
        'light-text': '#0B1B3F',
        'light-card': '#FFFFFF',
      },
      fontFamily: {
        sans: ['"Orbitron"', 'Rajdhani', 'Exo 2', 'sans-serif'],
      },
      backgroundImage: {
        'nxtfino-gradient': 'linear-gradient(90deg, #007BFF 0%, #8A2BE2 100%)',
      },
      boxShadow: {
        'glow-blue': '0 0 10px rgba(0, 123, 255, 0.6)',
        'glow-purple': '0 0 12px rgba(138, 43, 226, 0.6)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'spin-slow': 'spin 3s linear infinite',
        'slide-in-right': 'slideInRight 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
