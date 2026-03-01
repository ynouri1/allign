import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "apple-touch-icon.png", "icon.svg"],
      manifest: {
        name: "alignbygn — Suivi d'aligneurs",
        short_name: "alignbygn",
        description: "Suivi intelligent d'aligneurs dentaires",
        theme_color: "#0D9488",
        background_color: "#F8FFFE",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        offlineGoogleAnalytics: false,
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: "NetworkFirst",
            options: { cacheName: "api-cache", expiration: { maxEntries: 50, maxAgeSeconds: 300 } },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|webp|svg)$/,
            handler: "CacheFirst",
            options: { cacheName: "image-cache", expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React et routing
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          
          // UI Framework (Radix installés + utilitaires CSS)
          'vendor-ui': [
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar', 
            '@radix-ui/react-checkbox',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            'class-variance-authority',
            'clsx',
            'tailwind-merge'
          ],
          
          // Supabase et auth
          'vendor-supabase': ['@supabase/supabase-js'],
          
          // 3D et visualisation - packages installés
          'vendor-3d': ['three', '@react-three/fiber', '@react-three/drei'],
          
          // Charts - package installé
          'vendor-charts': ['recharts'],
          
          // Utils installés
          'vendor-utils': [
            'date-fns',
            'lucide-react', 
            'react-hook-form',
            '@hookform/resolvers',
            'zod'
          ],
          
          // Capacitor - packages mobiles installés
          'vendor-mobile': [
            '@capacitor/core',
            '@capacitor/camera',
            '@capacitor/filesystem'
          ]
        },
        // Configuration pour splitter automatiquement les gros chunks
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop().split('\\').pop()
            : 'chunk';
          return `js/[name]-[hash].js`;
        },
        // Séparer les assets par type
        assetFileNames: (assetInfo) => {
          if (assetInfo.name) {
            const info = assetInfo.name.split('.');
            const ext = info[info.length - 1];
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
              return `img/[name]-[hash].${ext}`;
            } else if (/css/i.test(ext)) {
              return `css/[name]-[hash].${ext}`;
            }
            return `assets/[name]-[hash].${ext}`;
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    },
    // Optimisations supplémentaires
    chunkSizeWarningLimit: 300, // Warning si chunk > 300 KB
    assetsInlineLimit: 4096, // Inline assets < 4KB en base64
  },
}));
