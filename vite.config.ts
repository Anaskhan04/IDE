import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { gitApiPlugin } from './vite-plugin-git.js';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), gitApiPlugin()],
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

