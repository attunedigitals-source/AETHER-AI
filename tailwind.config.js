/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        warm: {
          50: '#FAF9F5',
          100: '#F5F4EE',
          150: '#EFECE2',
          200: '#E5E2D5',
          300: '#D5D0C0',
          400: '#AFA997',
          500: '#8A8473',
          600: '#656052',
          700: '#48443A',
          800: '#2E2B25',
          850: '#26241F',
          900: '#1C1B18',
          950: '#141311',
        },
        claude: {
          coral: '#D96B43',
          'coral-hover': '#C65B33',
          'coral-light': '#F8EBE6',
          'coral-dark': '#38231C',
          sand: '#ECE8DF',
          parchment: '#FBFBFA',
          charcoal: '#1A1917',
          ash: '#282724',
          border: '#E8E5DC',
          'border-dark': '#34332F',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        serif: ['"Tiempos Headline"', 'Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'warm-sm': '0 1px 2px 0 rgba(28, 27, 24, 0.05)',
        'warm-md': '0 4px 6px -1px rgba(28, 27, 24, 0.08), 0 2px 4px -1px rgba(28, 27, 24, 0.04)',
        'warm-lg': '0 10px 15px -3px rgba(28, 27, 24, 0.08), 0 4px 6px -2px rgba(28, 27, 24, 0.04)',
      }
    },
  },
  plugins: [],
}

