import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const base = process.env.VITE_BASE_PATH || '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@markwylde/gramadoc-react/styles.css': resolve(
        __dirname,
        '../../packages/gramadoc-react/src/gramadoc/GramadocInput.css',
      ),
      '@markwylde/gramadoc': resolve(
        __dirname,
        '../../packages/gramadoc/src/index.ts',
      ),
      '@markwylde/gramadoc-react': resolve(
        __dirname,
        '../../packages/gramadoc-react/src/gramadoc/index.ts',
      ),
    },
  },
  plugins: [
    react(),
    VitePWA({
      base,
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logo.svg'],
      manifest: {
        name: 'Gramadoc',
        short_name: 'Gramadoc',
        description: 'Modern writing with real-time grammar and style analysis',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'logo.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
