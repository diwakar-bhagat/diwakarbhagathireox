import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, "/");

          if (!normalizedId.includes("/node_modules/")) {
            return;
          }

          if (
            normalizedId.includes("/node_modules/react/") ||
            normalizedId.includes("/node_modules/react-dom/") ||
            normalizedId.includes("/node_modules/scheduler/")
          ) {
            return "vendor-react";
          }

          if (normalizedId.includes("/node_modules/firebase/")) {
            return "vendor-firebase";
          }

          if (
            normalizedId.includes("/node_modules/motion/") ||
            normalizedId.includes("/node_modules/motion-dom/")
          ) {
            return "vendor-motion";
          }

          if (
            normalizedId.includes("/node_modules/@reduxjs/toolkit/") ||
            normalizedId.includes("/node_modules/react-redux/") ||
            normalizedId.includes("/node_modules/redux/")
          ) {
            return "vendor-redux";
          }

          if (
            normalizedId.includes("/node_modules/react-router/") ||
            normalizedId.includes("/node_modules/react-router-dom/") ||
            normalizedId.includes("/node_modules/@remix-run/router/")
          ) {
            return "vendor-router";
          }

          if (normalizedId.includes("/node_modules/react-icons/")) {
            return "vendor-icons";
          }
        },
      },
    },
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups"
    }
  }
})
