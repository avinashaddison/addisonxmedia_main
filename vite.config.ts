import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    // 8080 + 5173 (Vite default) are commonly taken by other projects on this
    // machine. Using Vite's preview port range to avoid conflicts.
    port: 4173,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://localhost:4001",
        changeOrigin: true,
      },
      // Public website renderer lives on Hono (server-rendered HTML), not in
      // the Vite SPA — proxy it through in dev so /biz/<slug> Just Works.
      "/biz": {
        target: "http://localhost:4001",
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    // Custom manualChunks was previously splitting React-dependent packages
    // (Radix, lucide, sonner, etc.) across separate chunks. In production that
    // made some chunks execute before React was bound, throwing
    // "Cannot read properties of undefined (reading 'forwardRef'/'createContext')"
    // and leaving the SPA blank. Rollup's default chunking respects the import
    // graph correctly — keep it. Lazy-loaded routes (React.lazy in App.tsx)
    // still produce per-route chunks; we just don't hand-curate vendor splits.
    chunkSizeWarningLimit: 1200,
  },
}));
