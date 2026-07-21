import { defineConfig, devices } from '@playwright/test';

/**
 * Конфигурация Playwright для тестирования RandoMatched PWA
 * Поддерживаемые платформы: Chrome Desktop, Chrome Mobile, Safari Mobile
 */
export default defineConfig({
    // Директория с тестами
    testDir: './tests/e2e',

    // Максимальное время выполнения одного теста
    timeout: 30 * 1000,

    // Количество повторных попыток при падении теста
    retries: process.env.CI ? 2 : 0,

    // Количество параллельных workers
    workers: process.env.CI ? 1 : undefined,

    // Репортеры для вывода результатов
    reporter: [
        ['html', { outputFolder: 'playwright-report' }],
        ['list'],
    ],

    // Общие настройки для всех проектов
    use: {
        // Базовый URL приложения
        baseURL: 'http://127.0.0.1:5177',

        // Скриншоты только при падении тестов
        screenshot: 'only-on-failure',

        // Видео только при падении тестов
        video: 'retain-on-failure',

        // Трассировка при первом повторе после падения
        trace: 'on-first-retry',

        // Таймаут для navigation
        navigationTimeout: 10 * 1000,
    },

    // Проекты для различных браузеров и устройств
    projects: [
        // Временно отключено по запросу пользователя
        // {
        //     name: 'chrome-desktop',
        //     use: {
        //         ...devices['Desktop Chrome'],
        //         viewport: { width: 1920, height: 1080 },
        //     },
        // },
        {
            name: 'chrome-mobile',
            use: {
                ...devices['Pixel 7'],
                // Дополнительные настройки для мобильного Chrome
                hasTouch: true,
                isMobile: true,
            },
        },
        {
            name: 'safari-mobile',
            use: {
                ...devices['iPhone 14 Pro'],
                // Дополнительные настройки для мобильного Safari
                hasTouch: true,
                isMobile: true,
            },
        },
    ],

    // Запуск dev-сервера перед тестами
    webServer: {
        command: 'npm run dev -- --host 127.0.0.1 --port 5177 --strictPort',
        url: 'http://127.0.0.1:5177',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },
});
