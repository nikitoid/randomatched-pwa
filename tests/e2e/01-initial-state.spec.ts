import { test, expect } from '../helpers/fixtures';
import { waitForAppReady } from '../helpers/test-data';

test.describe('Начальное состояние приложения', () => {
    test.beforeEach(async ({ page, injectData }) => {
        await injectData();
        await page.goto('/');
        await waitForAppReady(page);
    });

    test('должно загружаться приложение с корректным заголовком', async ({ app }) => {
        await expect(app.appTitle).toBeVisible();
        await expect(app.appTitle).toContainText('Randomatched');
    });

    test('должна отображаться кнопка переключения темы', async ({ app }) => {
        await expect(app.themeToggle).toBeVisible();
    });

    test('должны отображаться основные элементы управления', async ({ app }) => {
        await expect(app.sourceSelector).toBeVisible();
        await expect(app.generateButton).toBeVisible();
        await expect(app.generateButton).toContainText('СГЕНЕРИРОВАТЬ');
    });

    test('должна отображаться навигация', async ({ app }) => {
        await expect(app.navigation).toBeVisible();
        await expect(app.statsButton).toBeVisible();
        await expect(app.listsButton).toBeVisible();
        await expect(app.settingsButton).toBeVisible();
    });

    test('должна быть установлена темная тема по умолчанию', async ({ app }) => {
        expect(await app.isDarkTheme()).toBe(true);
        expect(await app.getLocalStorageItem('theme')).toBe('dark');
    });

    test('должна переключаться светлая/темная тема', async ({ app }) => {
        // Изначально темная
        expect(await app.isDarkTheme()).toBe(true);

        // Переключаем на светлую
        await app.toggleTheme();
        expect(await app.isDarkTheme()).toBe(false);

        // Переключаем обратно на темную
        await app.toggleTheme();
        expect(await app.isDarkTheme()).toBe(true);
    });

    test('должны корректно сохраняться данные в localStorage', async ({ app }) => {
        const lists = await app.getLocalStorageItem('randomatched_lists_v1');
        expect(lists).toBeTruthy();
        expect(lists.length).toBeGreaterThan(0);
        expect(lists[0].name).toBe('Тестовый список 1');

        expect(await app.getLocalStorageItem('theme')).toBe('dark');
        expect(await app.getLocalStorageItem('colorScheme')).toBe('indigo');
    });
});
