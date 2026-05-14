import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { resolve } from "path";

const proxyTarget = process.env.PROXY_TARGET || "http://localhost:3000";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: false, // Use our own public/manifest.webmanifest
      workbox: {
        navigateFallback: "/offline.html",
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        runtimeCaching: [
          {
            urlPattern:
              /\/(api|event|session|file|find|config|agent|command|global)\/.*/,
            handler: "NetworkFirst",
            options: {
              networkTimeoutSeconds: 3,
              cacheName: "api-cache",
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": proxyTarget,
      "/event": proxyTarget,
      "/git": proxyTarget,
      "/terminal/ws": {
        target: proxyTarget,
        ws: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
