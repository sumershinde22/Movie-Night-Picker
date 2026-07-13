import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During local development the React dev server (5173) proxies /api calls to
// the Express backend (4000). This keeps requests same-origin so no CORS is
// needed. In production the backend serves the built files directly.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
