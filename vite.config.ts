import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { gitApiPlugin } from './vite-plugin-git.js';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), gitApiPlugin()],
  server: {
    port: 3000,
    open: false,
  },
  preview: {
    port: 3000,
  },
});

