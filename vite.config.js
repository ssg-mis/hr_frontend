import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "lucide-react",
      "recharts",
      "date-fns",
    ],
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api/v1": {
        // Overridable so the Vite dev server can reach the backend when both run in Docker
        // (e.g. API_PROXY_TARGET=http://host.docker.internal:5006).
        target: process.env.API_PROXY_TARGET || "http://127.0.0.1:5006",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    strictPort: true,
  },
});
