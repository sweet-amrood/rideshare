import { tokens } from './src/theme/tokens.js';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  corePlugins: {
    preflight: false
  },
  important: '#root',
  theme: {
    extend: {
      colors: {
        brand: tokens.colors.brand,
        slateCustom: tokens.colors.slateCustom,
        cyan: tokens.colors.cyan,
        violet: tokens.colors.violet
      },
      fontFamily: {
        sans: tokens.fontFamily.sans
      },
      borderRadius: tokens.borderRadius,
      boxShadow: {
        ...tokens.boxShadow,
        'inner-brand': 'inset 0 1px 0 rgba(79,94,244,0.15)'
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #4f5ef4 0%, #8b5cf6 100%)',
        'gradient-brand-r': 'linear-gradient(to right, #4f5ef4, #8b5cf6)',
        'gradient-cyan': 'linear-gradient(135deg, #06b6d4 0%, #4f5ef4 100%)',
        'gradient-emerald': 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'mesh-brand':
          'radial-gradient(at 40% 20%, rgba(79,94,244,0.15) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(139,92,246,0.1) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(6,182,212,0.08) 0px, transparent 50%)'
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' }
        },
        'orbit': {
          '0%': { transform: 'rotate(0deg) translateX(28px) rotate(0deg)' },
          '100%': { transform: 'rotate(360deg) translateX(28px) rotate(-360deg)' }
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' }
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(79,94,244,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(79,94,244,0.6)' }
        }
      },
      animation: {
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
        float: 'float 4s ease-in-out infinite',
        orbit: 'orbit 3s linear infinite',
        'gradient-shift': 'gradient-shift 4s ease infinite',
        'slide-up': 'slide-up 0.4s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite'
      }
    }
  },
  plugins: []
};
