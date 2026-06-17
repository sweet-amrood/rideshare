import { createTheme } from '@mui/material/styles';
import { tokens } from './tokens';

export const muiTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: tokens.colors.brand[500],
      light: tokens.colors.brand[400],
      dark: tokens.colors.brand[700],
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#6366f1',
      contrastText: '#ffffff'
    },
    background: {
      default: tokens.colors.slateCustom[900],
      paper: tokens.colors.slateCustom[800]
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#94a3b8'
    },
    success: { main: tokens.colors.semantic.success },
    warning: { main: tokens.colors.semantic.warning },
    error: { main: tokens.colors.semantic.error },
    divider: 'rgba(255, 255, 255, 0.08)'
  },
  typography: {
    fontFamily: tokens.fontFamily.sans.join(', '),
    h1: { fontWeight: 800 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 500 },
    button: { textTransform: 'none', fontWeight: 600 }
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: tokens.colors.slateCustom[900],
          color: '#f1f5f9'
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          boxShadow: 'none',
          border: 'none',
          outline: 'none',
          '&:hover': { boxShadow: 'none' },
          '&:focus': { outline: 'none' },
          '&:focus-visible': { outline: 'none', boxShadow: 'none' }
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${tokens.colors.brand[500]} 0%, ${tokens.colors.brand[700]} 100%)`,
          '&:hover': {
            background: `linear-gradient(135deg, ${tokens.colors.brand[600]} 0%, ${tokens.colors.brand[800]} 100%)`
          }
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': { borderRadius: 10 }
        }
      }
    }
  }
});

export default muiTheme;
