import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import packageJson from './package.json'

// https://vite.dev/config/
export default defineConfig({
  define: {
    '__APP_VERSION__': JSON.stringify(packageJson.version),
  },
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: true,
  },

  // Base URL for assets - use '/' for root deployment
  base: '/',

  build: {
    // Output directory
    outDir: 'dist',

    // Generate source maps for production debugging (optional)
    sourcemap: false,

    // Chunk size warnings
    chunkSizeWarningLimit: 1000,

    // Optimize dependencies
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor code for better caching
          'react-vendor': ['react', 'react-dom'],
          'opentype': ['opentype.js'],
        },
      },
    },
  },

  // Preview server configuration (for local testing)
  preview: {
    port: 4173,
    strictPort: false,
  },
})
