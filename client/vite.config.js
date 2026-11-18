import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const gateway = env.VITE_GATEWAY_URL || 'http://localhost:5005';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          target: gateway,
          changeOrigin: true
        },
        '/nlp': {
          target: env.VITE_NLP_URL || 'http://localhost:8000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/nlp/, '')
        }
      }
    },
    preview: {
      port: 4173
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 900
    }
  };
});
