// https://nuxt.com/docs/api/configuration/nuxt-config
import { defineNuxtConfig } from "nuxt/config";

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
      theme_color: "#ffffff",
      background_color: "#ffffff",
      display: "standalone",
      start_url: "/",
      lang: "ru",
      icons: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        {
          src: "/icons/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
      shortcuts: [
        {
          name: "Сгенерировать",
          url: "/",
          description: "Быстрая генерация",
          icons: [
            {
              src: "/icons/icon-96.png",
              sizes: "96x96",
              type: "image/png",
            },
          ],
        },
      ],
    },

    // ⚙️ Настройки сервис-воркера
    workbox: {
      // 📦 Глобальное кэширование всех статических файлов
      globPatterns: [
        "**/*.{js,css,html,json,ico,png,jpg,jpeg,gif,svg,webp,woff,woff2,ttf,eot}",
      ],

      // 🔧 Дополнительные настройки для SPA
      navigateFallback: "/",
      navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],

      // 🚀 Настройки runtime кэширования
      runtimeCaching: [
        // Главная страница и навигация - NetworkFirst
        {
          urlPattern: /^\/$/,
          handler: "NetworkFirst",
          options: {
            cacheName: "pages-cache",
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 24 * 60 * 60, // 1 день
            },
            networkTimeoutSeconds: 3,
          },
        },
        // Статические ресурсы (изображения) - CacheFirst
        {
          urlPattern: /\.(?:png|jpg|jpeg|gif|svg|webp|ico)$/,
          handler: "CacheFirst",
          options: {
            cacheName: "images-cache",
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 30 * 24 * 60 * 60, // 30 дней
            },
          },
        },
        // CSS и JS файлы - CacheFirst
        {
          urlPattern: /\.(?:css|js)$/,
          handler: "CacheFirst",
          options: {
            cacheName: "static-resources-cache",
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 7 * 24 * 60 * 60, // 7 дней
            },
          },
        },
        // Шрифты - CacheFirst
        {
          urlPattern: /\.(?:woff|woff2|ttf|eot)$/,
          handler: "CacheFirst",
          options: {
            cacheName: "fonts-cache",
            expiration: {
              maxEntries: 20,
              maxAgeSeconds: 365 * 24 * 60 * 60, // 1 год
            },
          },
        },
        // API запросы - StaleWhileRevalidate
        {
          urlPattern: /^https:\/\/api\./,
          handler: "StaleWhileRevalidate",
          options: {
            cacheName: "api-cache",
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 5 * 60, // 5 минут
            },
          },
        },
      ],
    },

    // 🔔 Включить автоматический prompt установки
    registerType: "autoUpdate",
    injectRegister: "auto",

    // 🔧 Дополнительные настройки
    strategies: "generateSW",
    devOptions: {
      enabled: true,
      type: "module",
    },

    // 📱 Дополнительные настройки для офлайн работы
    client: {
      installPrompt: true,
      periodicSyncForUpdates: 20,
    },
    includeAssets: ["favicon.ico", "icons/*.png", "manifest.webmanifest"],
  },

  // 🌐 Для лучшей совместимости с мобильными устройствами
  app: {
    head: {
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "description", content: "Мое PWA приложение" },
      ],
      link: [
        { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
        { rel: "manifest", href: "/manifest.webmanifest" },
      ],
    },
  },
});
