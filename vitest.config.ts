import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    exclude: ['tests/e2e/**', 'node_modules', 'dist', '.next'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
