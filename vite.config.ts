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
    // Each lazy-loaded /app page already gets its own chunk via React.lazy.
    // Beyond that, group large vendor deps into named chunks so the browser can
    // cache them across route navigations and across deploys (when the app code
    // changes but the deps don't, the browser keeps the cached vendor chunks).
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          // Charts (recharts) are only on Analytics — keep separate so it isn't pulled in for other routes.
          if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
          // Drag-and-drop is only on /app/deals.
          if (id.includes("@dnd-kit")) return "vendor-dnd";
          // Editor / picker libs only on a few pages.
          if (id.includes("react-day-picker") || id.includes("date-fns")) return "vendor-date";
          if (id.includes("embla-carousel") || id.includes("vaul")) return "vendor-ui-extras";
          // shadcn/Radix primitives — used app-wide, get their own.
          if (id.includes("@radix-ui")) return "vendor-radix";
          // The big platform deps.
          if (id.includes("react-router")) return "vendor-router";
          if (id.includes("@tanstack")) return "vendor-query";
          if (id.includes("react-dom") || id.match(/[\\/]react[\\/]/)) return "vendor-react";
          // Everything else (small libs) lumps into one vendor chunk.
          return "vendor";
        },
      },
    },
    // Skip the warning for chunks > 500KB — we've split deliberately.
    chunkSizeWarningLimit: 800,
  },
}));
