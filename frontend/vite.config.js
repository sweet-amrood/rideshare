import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: env.VITE_DEV_API_PROXY || 'http://localhost:5000',
          changeOrigin: true,
          secure: false
        },
        // Socket.io: prefer VITE_SOCKET_URL=http://localhost:5000 in dev (see useAppSocket.js)
        '/socket.io': {
          target: env.VITE_DEV_API_PROXY || 'http://localhost:5000',
          changeOrigin: true,
          ws: true,
          configure: (proxy) => {
            proxy.on('error', (err) => {
              if (err.code === 'ECONNABORTED' || err.code === 'ECONNRESET') return;
              console.error('[vite] socket.io proxy:', err.message);
            });
          }
        }
      }
    }
  };
});
