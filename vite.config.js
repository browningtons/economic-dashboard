import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// [https://vitejs.dev/config/](https://vitejs.dev/config/)
export default defineConfig({
  plugins: [react()],
  base: "/economic-dashboard/",
  // This fixes the Recharts/Rolldown compatibility error
  optimizeDeps: {
    include: ['recharts', 'react-dom'],
  },
})
