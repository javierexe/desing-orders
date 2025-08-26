// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Usa .env(.local) para setear la IP/host del backend en desarrollo:
// VITE_PROXY_TARGET=http://192.168.1.23:8000
const proxyTarget = process.env.VITE_PROXY_TARGET || "http://127.0.0.1:8000";

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  server: {
    host: true,          // expone en la LAN (equivale a --host)
    port: 5173,
    proxy: {
      "/api": {
        target: proxyTarget,
        changeOrigin: true,
        rewrite: p => p.replace(/^\/api/, ""), // /api/orders -> /orders
      },
    },
  },
});

