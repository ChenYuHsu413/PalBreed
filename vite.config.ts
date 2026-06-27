import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
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
});
