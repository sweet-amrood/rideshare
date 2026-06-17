import { tokens } from './src/theme/tokens.js';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // MUI CssBaseline handles resets; Tailwind supplies utilities
  corePlugins: {
    preflight: false
  },
  important: '#root',
  theme: {
    extend: {
      colors: {
        brand: tokens.colors.brand,
        slateCustom: tokens.colors.slateCustom
      },
      fontFamily: {
        sans: tokens.fontFamily.sans
      },
      borderRadius: tokens.borderRadius,
      boxShadow: tokens.boxShadow
    }
  },
  plugins: []
};
