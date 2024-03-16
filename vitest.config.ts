import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    clearMocks: true,
    environment: 'node',
    coverage: {
      enabled: true,
      reporter: ['json-summary', 'text', 'lcov']
    }
  }
})
