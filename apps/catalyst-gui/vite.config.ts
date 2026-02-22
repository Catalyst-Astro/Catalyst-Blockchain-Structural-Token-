import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  envDir: path.resolve(__dirname, '..', '..'),
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: 'dist/renderer',
    sourcemap: true,
    emptyOutDir: true
  },
  server: {
    port: 5173,
    strictPort: true
  }
});
