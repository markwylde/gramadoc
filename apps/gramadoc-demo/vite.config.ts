import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3001,
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
  plugins: [react()],
})
