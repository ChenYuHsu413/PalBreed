import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  // GitHub Pages 專案站台在 /PalBreed/ 子路徑；dev 維持根路徑
  base: command === 'build' ? '/PalBreed/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api/paldb': {
        target: 'https://paldb.cc',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/paldb/, '/tw/api'),
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'X-Requested-With': 'XMLHttpRequest',
        },
      },
    },
  },
}));
