import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { copyFileSync, writeFileSync } from 'fs';

function netlifySpaFallback() {
  return {
    name: 'netlify-spa-fallback',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      const redirects = '/*    /index.html   200\n';
      writeFileSync(path.join(distDir, '_redirects'), redirects);
      try {
        copyFileSync(path.join(distDir, 'index.html'), path.join(distDir, '404.html'));
      } catch {
        /* index.html missing — build failed */
      }
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), netlifySpaFallback()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;

            if (id.includes('@mui')) return 'mui';
            if (id.includes('leaflet') || id.includes('react-leaflet')) return 'maps-leaflet';
            if (id.includes('@react-google-maps')) return 'maps-google';
            if (id.includes('framer-motion')) return 'motion';
            if (id.includes('socket.io-client')) return 'socket';
            if (
              id.includes('react-dom') ||
              id.includes('react-router') ||
              id.includes('/react/')
            ) {
              return 'react-vendor';
            }
          }
        }
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
