import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/festivals": {
        target: "http://localhost:8000",
        timeout: 900_000,
      },
      "/health": "http://localhost:8000",
    },
  },
});
