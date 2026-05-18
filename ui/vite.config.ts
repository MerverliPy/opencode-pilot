import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { resolve } from "path";

const proxyTarget = process.env.PROXY_TARGET || "http://localhost:3000";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      manifest: false, // Use our own public/manifest.webmanifest
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
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
      "/session": {
        target: proxyTarget,
        changeOrigin: true,
        // Don't proxy SPA routes — only proxy actual API calls
        bypass: (req) => {
          const url = req.url ?? "";
          // SPA routes (serve index.html)
          if (url === "/sessions" || url.startsWith("/sessions/")) return url;
          // Deep link: /session/<sessionId> (exactly one path segment)
          if (/^\/session\/[^/]+$/.test(url)) return url;
          // Everything else (/session, /session/xxx/message, etc.) → proxy to backend
          return undefined;
        },
      },
      "/git": proxyTarget,
      "/push": proxyTarget,
      "/tunnel": proxyTarget,
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
