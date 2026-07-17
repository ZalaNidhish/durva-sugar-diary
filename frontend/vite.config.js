import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: "Durva's Sugar Diary",
        short_name: 'Sugar Diary',
        description: 'Daily glucose & insulin log',
        theme_color: '#ec6a9c',
        background_color: '#fff8fa',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Entries fetched successfully get cached, so a day already viewed
        // is still readable offline. Falls back to cache only if the
        // network request fails or is slow (e.g. spotty signal).
        runtimeCaching: [
          {
            urlPattern: /\/api\/entries/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'sugar-diary-api',
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
});
