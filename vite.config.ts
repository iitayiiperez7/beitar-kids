import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// `vite build --mode pages` builds for https://<user>.github.io/beitar-kids/
export default defineConfig(({ mode }) => {
  const base = mode === 'pages' ? '/beitar-kids/' : '/'
  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'מכירים את בית״ר!',
          short_name: 'בית״ר קידס',
          description: 'משחק לימודי לילדים: מכירים את שחקני בית״ר ירושלים',
          lang: 'he',
          dir: 'rtl',
          start_url: base,
          scope: base,
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#171717',
          theme_color: '#171717',
          icons: [
            { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'],
          // Openly licensed player photos are loaded from Wikimedia Commons; keep them for offline play.
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/upload\.wikimedia\.org\//,
              handler: 'CacheFirst',
              options: {
                cacheName: 'player-photos',
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 90 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
  }
})
