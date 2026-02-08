import { test, expect } from '@playwright/test';
import { injectTestData, waitForAppReady } from '../helpers/test-data';
import { RandoMatchedApp } from '../helpers/page-objects';

test.describe('Начальное состояние приложения', () => {
    let app: RandoMatchedApp;

    test.beforeEach(async ({ page }) => {
        app = new RandoMatchedApp(page);
        // Инъекция тестовых данных (theme='dark', списки и т.д.) ПЕРЕД page.goto
        await injectTestData(page);
        await page.goto('/');
        await waitForAppReady(page);
    });

    test('должно загружаться приложение с корректным заголовком', async () => {
        await expect(app.appTitle).toBeVisible();
        await expect(app.appTitle).toContainText('Randomatched');
    });

    test('должна отображаться кнопка переключения темы', async () => {
        await expect(app.themeToggle).toBeVisible();
    });

    test('должны отображаться основные элементы управления', async () => {
        // Проверяем наличие source selector
        await expect(app.sourceSelector).toBeVisible();

        // Проверяем наличие кнопки генерации
        await expect(app.generateButton).toBeVisible();
        await expect(app.generateButton).toContainText('ГЕНЕРИРОВАТЬ');
    });

    test('должна отображаться навигация', async () => {
        await expect(app.navigation).toBeVisible();
        await expect(app.statsButton).toBeVisible();
        await expect(app.historyButton).toBeVisible();
        await expect(app.settingsButton).toBeVisible();
    });

    test('должна быть установлена темная тема по умолчанию', async () => {
        const isDark = await app.isDarkTheme();
        expect(isDark).toBe(true);

        // Проверяем, что данные есть в localStorage
        const theme = await app.getLocalStorageItem('theme');
        expect(theme).toBe('dark');
    });

    test('должна переключаться светлая/темная тема', async ({ page }) => {
        // Изначально темная тема
        let isDark = await app.isDarkTheme();
        expect(isDark).toBe(true);

        // Переключаем на светлую
        await app.toggleTheme();
        await page.waitForTimeout(500);

        isDark = await app.isDarkTheme();
        expect(isDark).toBe(false);

        // Переключаем обратно на темную
        await app.toggleTheme();
        await page.waitForTimeout(500);

        isDark = await app.isDarkTheme();
        expect(isDark).toBe(true);
    });

    test('должны корректно сохраняться данные в localStorage', async () => {
        // Проверяем, что тестовые данные загрузились
        const lists = await app.getLocalStorageItem('randomatched_lists_v1');
        expect(lists).toBeTruthy();
        expect(lists.length).toBeGreaterThan(0);
        expect(lists[0].name).toBe('Тестовый список 1');

        // Проверяем настройки
        const theme = await app.getLocalStorageItem('theme');
        expect(theme).toBe('dark');

        const colorScheme = await app.getLocalStorageItem('colorScheme');
        expect(colorScheme).toBe('indigo');
    });
});
