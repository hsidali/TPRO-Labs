import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Windows quirk: when the shell's cwd is "e:\project" (lower-case drive, as
    // VS Code terminals often use) but Node reports "E:\project", the default
    // "forks"/"threads" pools load `vitest` under two module identities and every
    // test file fails with "Cannot read properties of undefined (reading 'config')".
    // The vm pool is immune to that and is plenty fast for these pure-TS tests.
    pool: 'vmThreads',
  },
})
