import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Mirror the TS `@/*` path alias for runtime module resolution.
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to the backend during development so the browser
      // talks to a single origin (avoids CORS friction and keeps cookies simple).
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy, rarely-changing libraries into their own chunks for
        // better long-term caching and a smaller main bundle.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query', 'axios'],
          markdown: ['react-markdown', 'remark-gfm'],
          highlighter: ['react-syntax-highlighter'],
        },
      },
    },
  },
});
