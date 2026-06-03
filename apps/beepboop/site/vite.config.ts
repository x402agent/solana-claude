import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        wallet: resolve(__dirname, "wallet.html"),
        hub: resolve(__dirname, "hub.html"),
        p: resolve(__dirname, "p/index.html")
      }
    }
  }
});
