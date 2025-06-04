import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      // Proxy pour les requêtes API
      '/api': {
        target: 'http://localhost:3000', // Port de NestJS
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: false
      },
      // Proxy pour les WebSockets si nécessaire
      '/socket.io': {
        target: 'ws://localhost:3000',
        ws: true
      }
    }
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Optimisation pour le développement
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
}));