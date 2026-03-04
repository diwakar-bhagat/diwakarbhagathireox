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
            normalizedId.includes("/node_modules/scheduler/") ||
            normalizedId.includes("/node_modules/react-router/") ||
            normalizedId.includes("/node_modules/react-router-dom/") ||
            normalizedId.includes("/node_modules/@remix-run/router/")
          ) {
            return "react-vendor";
          }

          if (
            normalizedId.includes("/node_modules/firebase/") ||
            normalizedId.includes("/node_modules/@firebase/")
          ) {
            return "firebase";
          }

          if (
            normalizedId.includes("/node_modules/motion/") ||
            normalizedId.includes("/node_modules/motion-dom/")
          ) {
            return "motion";
          }

          if (
            normalizedId.includes("/node_modules/@reduxjs/toolkit/") ||
            normalizedId.includes("/node_modules/react-redux/") ||
            normalizedId.includes("/node_modules/redux/")
          ) {
            return "redux";
          }

          if (
            normalizedId.includes("/node_modules/jspdf/") ||
            normalizedId.includes("/node_modules/jspdf-autotable/") ||
            normalizedId.includes("/node_modules/html2canvas/")
          ) {
            return "pdf";
          }

          if (
            normalizedId.includes("/node_modules/recharts/") ||
            normalizedId.includes("/node_modules/react-circular-progressbar/") ||
            normalizedId.includes("/node_modules/d3-")
          ) {
            return "charts";
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
