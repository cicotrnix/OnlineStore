import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    exclude: ['node_modules', '.next', 'tests/e2e/**'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', '.next', 'tests', '**/*.config.*'],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './') },
  },
})
