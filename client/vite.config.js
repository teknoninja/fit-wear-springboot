import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // This correctly forwards your API calls
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
    // // This block is needed to fix the WebSocket connection issues
    // hmr: {
    //   host: 'localhost',
    // }
  },
})