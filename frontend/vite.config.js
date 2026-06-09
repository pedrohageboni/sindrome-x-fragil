import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Encaminha chamadas /api para o Flask, evitando problemas de CORS em dev
    proxy: {
      "/api": "http://localhost:5000",
    },
  },
});
