/**
 * Design tokens — single source of truth for Tailwind & MUI
 */
export const tokens = {
  colors: {
    brand: {
      50: '#f0f3ff',
      100: '#e1e7fe',
      200: '#c8d3fd',
      300: '#a3b5fc',
      400: '#798df9',
      500: '#4f5ef4',
      600: '#3c42e8',
      700: '#3030d4',
      800: '#2a2aa7',
      900: '#272985',
      950: '#17174e'
    },
    slateCustom: {
      900: '#080c14',
      800: '#111827',
      700: '#1a2338',
      600: '#263046',
      500: '#374460'
    },
    cyan: {
      300: '#67e8f9',
      400: '#22d3ee',
      500: '#06b6d4',
      600: '#0891b2'
    },
    violet: {
      300: '#c4b5fd',
      400: '#a78bfa',
      500: '#8b5cf6',
      600: '#7c3aed'
    },
    electric: {
      blue: '#3b82f6',
      indigo: '#4f5ef4',
      purple: '#8b5cf6',
      cyan: '#06b6d4'
    },
    semantic: {
      success: '#22c55e',
      warning: '#eab308',
      error: '#ef4444',
      info: '#3b82f6'
    }
  },
  fontFamily: {
    sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif']
  },
  borderRadius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px'
  },
  boxShadow: {
    brand: '0 10px 40px -10px rgba(79, 94, 244, 0.4)',
    'brand-sm': '0 4px 20px -4px rgba(79, 94, 244, 0.3)',
    panel: '0 4px 24px rgba(0, 0, 0, 0.5)',
    glow: '0 0 30px rgba(79, 94, 244, 0.25)',
    'glow-lg': '0 0 60px rgba(79, 94, 244, 0.2)',
    cyan: '0 0 30px rgba(6, 182, 212, 0.25)',
    emerald: '0 10px 40px -10px rgba(16, 185, 129, 0.4)'
  },
  spacing: {
    layout: {
      sidebar: '16rem',
      header: '4rem'
    }
  }
};

export default tokens;
