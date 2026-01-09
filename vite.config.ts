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
        manualChunks: (id) => {
          // PDF utilities - only load when needed
          if (id.includes('pdf.ts') || id.includes('jspdf') || id.includes('html2canvas')) {
            return 'pdf-utils';
          }
          // Regular proposal components
          if (id.includes('ProposalViewer') || id.includes('StandaloneProposalViewer') || id.includes('PDFViewer')) {
            return 'proposal-viewer';
          }
          // Holiday proposal components - merge with main bundle to reduce requests
          if (id.includes('HolidayProposal') || id.includes('HolidayPage')) {
            return undefined; // Don't create separate chunk
          }
          // Vendor libraries
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor';
            }
            if (id.includes('supabase')) {
              return 'supabase';
            }
            return 'vendor-other';
          }
        }
      }
    }
  },
  server: {
    port: 5174,
    headers: {
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    },
    watch: {
      ignored: ['**/public/env-config.js']
    }
  },
  preview: {
    port: 4173,
    host: '127.0.0.1', // Force IPv4 to avoid permission issues with IPv6
    headers: {
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    }
  }
});
