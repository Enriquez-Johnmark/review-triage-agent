import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// In development the dashboard runs on Vite's server and passes /api to the
// agent's server (`pnpm cli serve`, port 4317).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    proxy: { "/api": "http://127.0.0.1:4317" },
  },
  build: { sourcemap: false },
})
