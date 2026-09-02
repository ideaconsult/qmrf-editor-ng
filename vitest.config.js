import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.js'],
    // A whole editable report takes a few hundred ms to render in jsdom, which is nothing; what
    // costs seconds is a named `getByRole` query, because testing-library computes the accessible
    // name of every candidate and jsdom's `getComputedStyle` — with no style sheet in the test
    // document, so purely its own per-element cost — runs about 4ms a time over the ~330 buttons
    // an editing session puts on screen. Measured: one such query 1.2-2.2s, one React commit
    // 0.2-0.35s. Tests that switch modes therefore run several seconds each.
    testTimeout: 20000
  }
})
