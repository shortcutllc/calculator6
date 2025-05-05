import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'public/env-config.js',
          dest: ''
        }
      ]
    })
  ],
  base: '/',
  build: {
    sourcemap: true,
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase': ['@supabase/supabase-js']
        }
      }
    }
  },
  server: {
    headers: {
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    },
    watch: {
      ignored: ['**/public/env-config.js']
    }
  }
});