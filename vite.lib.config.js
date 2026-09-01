import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Library build: emits an ESM bundle + a single style.css under dist/.
// React stays a peer (provided by the host); dompurify is bundled so consumers only
// need React. Hosts embedding this package must dedupe react/react-dom and add
// '@ideaconsult/qmrf-viewer' to optimizeDeps.include.
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: fileURLToPath(new URL('src/index.js', import.meta.url)),
      name: 'QMRFViewer',
      formats: ['es'],
      fileName: () => 'qmrf-viewer.js'
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: { assetFileNames: 'style.css' }
    },
    outDir: 'dist',
    emptyOutDir: true,
    cssCodeSplit: false
  }
})
