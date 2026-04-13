import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://api.hasm.io',
        changeOrigin: true,
        secure: true,
      },
      '/uploads': {
        target: 'https://api.hasm.io',
        changeOrigin: true,
        secure: true,
      },
      '/ws': {
        target: 'https://api.hasm.io',
        ws: true,
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
