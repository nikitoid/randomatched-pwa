// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  ssr: false,
  modules: ["@nuxt/ui", "@vite-pwa/nuxt"],
  css: ["~/assets/css/main.css"],
  // Дополнительные настройки PWA
  pwa: {
    // 📦 Манифест — обязательный минимум
    manifest: {
      name: "Randomatched",
      short_name: "RM App",
      description: "Приложение для игры Unmatched",
      theme_color: "#000000",
      background_color: "#ffffff",
      display: "standalone",
      scope: "/",
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
          purpose: "any maskable",
        },
      ],
      shortcuts: [
        {
          name: "Сгенерировать",
          url: "/",
          description: "Быстрая генерация",
        },
      ],
    },

    // ⚙️ Настройки сервис-воркера
    workbox: {
      // Глобальные настройки кэширования
      navigateFallback: "/", // 🔑 Если запрос на HTML — возвращаем кэшированную версию

      // 📦 Глобальное кэширование всех статических файлов через CacheFirst
      globPatterns: [
        "**/*.{js,css,html,json,ico,png,jpg,jpeg,gif,svg,webp,woff,woff2,ttf,eot}",
      ],

      // ⚙️ Стратегия CacheFirst — основной принцип оффлайн-работы
      runtimeCaching: [
        {
          urlPattern: ({ url }) => url.origin === self.location.origin,
          handler: "CacheFirst",
          options: {
            cacheName: "static-assets-v1", // Уникальное имя — важно для обновлений
            expiration: {
              maxEntries: 200, // Максимум 200 файлов в кэше
              maxAgeSeconds: 60 * 60 * 24 * 365, // 1 год — очень долго!
            },
            cacheableResponse: {
              statuses: [0, 200], // Разрешить кэшировать ответы с кодами 0 (cors) и 200
            },
            // Автоматически добавлять хеш к URL для корректного обновления
            // Это работает благодаря Vite и его хешированию имен файлов
          },
        },
      ],

      // 🛠 Дополнительно: кэширование API (если есть)
      // Если у тебя есть статичные данные (например, /api/posts), можно кэшировать их
      /*
      runtimeCaching: [
        {
          urlPattern: ({ url }) => url.origin === self.location.origin,
          handler: 'CacheFirst',
          options: {
            cacheName: 'static-assets-v1',
            expiration: { maxEntries: 200, maxAgeSeconds: 31536000 },
            cacheableResponse: { statuses: [0, 200] }
          }
        },
        {
          urlPattern: /^https:\/\/your-api\.com\/api\//,
          handler: 'CacheFirst',
          options: {
            cacheName: 'api-data-v1',
            expiration: { maxEntries: 50, maxAgeSeconds: 86400 }, // 1 день
            cacheableResponse: { statuses: [0, 200] }
          }
        }
      ]
      */
    },

    // 🔔 Включить автоматический prompt установки
    registerType: "autoUpdate",
    devOptions: {
      enabled: true, // Отключить в dev-режиме (не нужно)
      suppressWarnings: true,
    },

    // 📁 Путь к иконкам — они будут сгенерированы автоматически, если лежат в /public/icons/
    client: {
      installPrompt: true, // 🔑 Включить prompt установки
      // Можно добавить кастомный обработчик, если нужна сложная логика
      // onRegister: async (register) => {
      //   console.log('Service worker registered:', register)
      // }
    },
  },

  // 🌐 Для лучшей совместимости с мобильными устройствами
  app: {
    head: {
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "description", content: "Мое PWA приложение" },
      ],
      link: [{ rel: "icon", type: "image/x-icon", href: "/favicon.ico" }],
    },
  },
});
