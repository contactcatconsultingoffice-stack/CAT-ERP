import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import electron from 'vite-plugin-electron/simple';
import { VitePWA } from 'vite-plugin-pwa';

const isElectron = process.env.BUILD_TARGET === 'electron';

export default defineConfig({
  plugins: [
    react(),
    ...(!isElectron ? [VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 // 5 MiB
      },
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'CAT ERP',
        short_name: 'CAT ERP',
        description: 'Système de gestion CAT Consulting Office',
        theme_color: '#0a1119',
        background_color: '#080d14',
        display: 'standalone',
        icons: [
          {
            src: '/logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })] : []),
    ...(isElectron ? [electron({
      main: {
        entry: 'electron/main.ts',
      },
      preload: {
        input: 'electron/preload.ts',
      },
    })] : []),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  }
});

