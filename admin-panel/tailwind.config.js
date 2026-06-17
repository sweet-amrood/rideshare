/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        admin: {
          primary: '#6366f1',
          accent: '#22d3ee',
          surface: '#0f172a',
          card: '#1e293b'
        }
      }
    }
  },
  plugins: []
};
