import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: [
      'src/**/*.test.{ts,tsx}',
      'apps/**/*.test.{ts,tsx}',
      'packages/**/*.test.{ts,tsx}',
      'tests/integration/**/*.test.{ts,tsx}',
      'tests/benchmark/**/*.test.{ts,tsx}',
    ],
    setupFiles: ['./apps/web/src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html', 'lcov'],
      thresholds: {
        branches: 70,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
})
