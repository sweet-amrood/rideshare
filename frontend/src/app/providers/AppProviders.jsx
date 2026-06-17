import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Toaster } from 'react-hot-toast';
import { store } from '@/store';
import { muiTheme } from '@/theme';
import { initializeAuth } from '@/store/slices/authSlice';
import { useAppDispatch } from '@/store/hooks';
import { SocketProvider } from '@/context/SocketContext';
import AppRouter from '@/app/router';

function Bootstrap({ children }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  return children;
}

export default function AppProviders() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline enableColorScheme />
        <BrowserRouter>
          <Bootstrap>
            <SocketProvider>
              <AppRouter />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#161d30',
                    color: '#f1f5f9',
                    border: '1px solid rgba(255,255,255,0.08)'
                  },
                  success: { iconTheme: { primary: '#4f5ef4', secondary: '#fff' } },
                  error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } }
                }}
              />
            </SocketProvider>
          </Bootstrap>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  );
}
