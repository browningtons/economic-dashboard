import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/economic-dashboard/", 
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "charts-vendor": ["recharts"],
          "icons-vendor": ["lucide-react"],
        },
      },
    },
  },
});
