import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    // Initialises Angular's TestBed before every test file runs
    setupFiles: ['src/test-setup.ts'],
    // pool / forks: run one worker at a time for stability on Windows
    pool: 'forks',
    maxWorkers: 1,
    minWorkers: 1,
    include: ['src/**/*.spec.ts']
  }
});
