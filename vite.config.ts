import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    cssCodeSplit: true,
    // CSS optimization for reducing unused CSS
    cssMinify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate heavy libraries into their own chunks
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-toast', '@radix-ui/react-avatar'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-three': ['three', '@react-three/fiber', '@react-three/drei'],
          'vendor-map': ['mapbox-gl'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
        // Optimize CSS output
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const extType = info[info.length - 1];
          if (/\.(css)$/.test(assetInfo.name || '')) {
            return `assets/styles/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    // Optimize chunks for better loading
    chunkSizeWarningLimit: 600,
  },
  // CSS processing optimizations to reduce unused CSS
  css: {
    devSourcemap: mode === 'development',
    // PostCSS optimizations for production
    postcss: mode === 'production' ? {
      plugins: [
        // Additional CSS optimizations would go here
        // Note: Tree-shaking and unused CSS removal handled by build process
      ]
    } : undefined,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', '@tanstack/react-query', 'mapbox-gl'],
    exclude: [],
  },
}));
