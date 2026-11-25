import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { gitApiPlugin } from './vite-plugin-git.js';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), gitApiPlugin()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/typescript')) {
            return 'typescript-compiler';
          }
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'icons-vendor';
          }
        },
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 3000,
    open: false,
  },
  preview: {
    host: '127.0.0.1',
    port: 3000,
  },
});

