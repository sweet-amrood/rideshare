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
      900: '#0b0f19',
      800: '#161d30',
      700: '#212a44',
      600: '#344061',
      500: '#455576'
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
    xl: '20px'
  },
  boxShadow: {
    brand: '0 10px 30px -10px rgba(79, 94, 244, 0.25)',
    panel: '0 4px 24px rgba(0, 0, 0, 0.35)'
  },
  spacing: {
    layout: {
      sidebar: '16rem',
      header: '4rem'
    }
  }
};

export default tokens;
