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
    // Target modern browsers for better performance
    target: 'esnext',
    rollupOptions: {
      output: {
        // More aggressive code splitting to reduce main-thread work
        manualChunks: (id) => {
          // Separate each vendor library into its own chunk
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/@radix-ui/')) {
            return 'vendor-ui';
          }
          if (id.includes('node_modules/@tanstack/react-query')) {
            return 'vendor-query';
          }
          if (id.includes('node_modules/three') || id.includes('node_modules/@react-three/')) {
            return 'vendor-three';
          }
          if (id.includes('node_modules/mapbox-gl')) {
            return 'vendor-mapbox';
          }
          if (id.includes('node_modules/@supabase/')) {
            return 'vendor-supabase';
          }
          // Split other node_modules into smaller chunks
          if (id.includes('node_modules/')) {
            return 'vendor-other';
          }
          // Split large internal modules
          if (id.includes('src/components/RealMapComponent') || id.includes('src/components/MapComponent')) {
            return 'chunk-map';
          }
          if (id.includes('src/components/Avatar') || id.includes('src/components/AvatarDisplay')) {
            return 'chunk-avatars';
          }
        },
        // Optimize chunk naming for better caching
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
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
      // Optimize external dependencies
      external: (id) => {
        // Keep heavy libraries external if they can be loaded separately
        return false; // Keep all internal for now
      },
    },
    // Optimize chunks for better loading and reduced main-thread work
    chunkSizeWarningLimit: 500, // Reduced from 600 to encourage smaller chunks
    // Enable source maps only in development
    sourcemap: mode === 'development',
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
  // Optimize dependencies for reduced main-thread blocking
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      '@tanstack/react-query'
    ],
    exclude: [
      // Exclude heavy libraries from pre-bundling to allow lazy loading
      'mapbox-gl',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      '@supabase/supabase-js'
    ],
    // Force optimization of specific modules
    force: true,
  },
  // Additional performance optimizations
  esbuild: {
    // Drop console logs and debugger statements in production
    drop: mode === 'production' ? ['console', 'debugger'] : [],
    // Use legal comments to reduce bundle size
    legalComments: 'none',
  },
}));
