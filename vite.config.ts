import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8000,
    strictPort: true, // do not auto-increment when busy
  },
  preview: {
    port: 8000,
    strictPort: true,
  },
})

