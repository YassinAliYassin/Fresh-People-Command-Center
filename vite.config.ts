import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Gemini key resolution order: explicit Gemini var -> generic VITE_API_KEY -> AI Studio's API_KEY/GEMINI_API_KEY
  const geminiKey =
    env.VITE_GEMINI_API_KEY ||
    env.VITE_API_KEY ||
    env.GEMINI_API_KEY ||
    env.API_KEY ||
    '';
  return {
    plugins: [react(), tailwindcss()],
    // Expose the key as process.env.API_KEY so the SAME code path works in
    // Google AI Studio Build (which injects process.env.API_KEY) and in local/Firebase builds.
    define: {
      'process.env.API_KEY': JSON.stringify(geminiKey),
      'process.env.GEMINI_API_KEY': JSON.stringify(geminiKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? (null as any) : {},
      // Proxy API requests to Express backend
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        }
      }
    },
    preview: {},
  };
});
