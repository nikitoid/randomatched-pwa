// https://nuxt.com/docs/api/configuration/nuxt-config
import { VitePWA } from "vite-plugin-pwa";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxt/ui", "@vite-pwa/nuxt"],
  css: ["~/assets/css/main.css"],
  vite: {
    plugins: [
      // Обеспечиваем поддержку PWA через vite-pwa
      VitePWA({
        manifest: {
          name: "Randomatched",
          short_name: "Randomatched",
          description: "Оффлайн приложение для игры Unmatched",
          theme_color: "#000000",
          background_color: "#ffffff",
          display: "standalone",
          start_url: "/",
          icons: [
            {
              src: "/icons/icon-192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "/icons/icon-512.png",
              sizes: "512x512",
              type: "image/png",
            },
            {
              src: "/icons/icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        // Конфигурация для сервис-воркера
        workbox: {
          // Настроим стратегию кэширования
          runtimeCaching: [
            {
              urlPattern:
                /.*\.(?:js|css|html|json|png|jpg|jpeg|svg|ico|woff2)$/,
              handler: "CacheFirst",
              options: {
                cacheName: "assets-cache",
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // Кэш на 30 дней
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com/,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "google-fonts-cache",
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // Кэшируем шрифты на 1 год
                },
              },
            },
          ],
        },
      }),
    ],
  },
  // Дополнительные настройки PWA
  pwa: {
    manifest: {
      name: "Randomatched_PWA",
      short_name: "Randomatched_PWA",
      description: "Оффлайн приложение для игры Unmatched",
      theme_color: "#000000",
      background_color: "#ffffff",
      display: "standalone",
      start_url: "/",
      icons: [
        {
          src: "/icons/icon-192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/icons/icon-512.png",
          sizes: "512x512",
          type: "image/png",
        },
        {
          src: "/icons/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
  },
});
