import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The fallback must match the server's own default in apps/server/src/config.ts.
const serverPort = Number(process.env.KATA_PORT ?? 8317);

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5317,
    strictPort: true,
    proxy: {
      '/api': { target: `http://127.0.0.1:${serverPort}`, changeOrigin: false },
    },
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
