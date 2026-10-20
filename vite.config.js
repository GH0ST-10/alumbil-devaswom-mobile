import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Injected by GitHub Actions; 0 in local dev (update banner won't show)
    __APP_BUILD_NUMBER__: Number(process.env.APP_BUILD_NUMBER || 0),
  },
})

