import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Randomatched: Unmatched Team Generator',
        short_name: 'Randomatched',
        description: 'Генератор команд 2 на 2 для настольной игры Unmatched с удобным интерфейсом.',
        theme_color: '#059669',
        background_color: '#f1f5f9',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'https://cdn-icons-png.flaticon.com/512/9303/9303867.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://cdn-icons-png.flaticon.com/512/9303/9303867.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        // Кэшируем все статические ресурсы для работы без интернета
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Fallback для SPA роутинга в оффлайне
        navigateFallback: '/index.html',
        // Увеличиваем лимит размера кэша для JS бандлов
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024
      }
    })
  ],
});