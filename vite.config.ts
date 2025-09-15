import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8000,
    strictPort: true, // do not auto-increment when busy
    proxy: {
      // Proxy API calls to the Node backend during dev
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 8000,
    strictPort: true,
  },
})
