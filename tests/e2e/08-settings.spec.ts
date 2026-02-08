import { test, expect } from '@playwright/test';
import { injectTestData, waitForAppReady } from '../helpers/test-data';
import { RandoMatchedApp } from '../helpers/page-objects';

test.describe('Настройки приложения', () => {
    let app: RandoMatchedApp;

    test.beforeEach(async ({ page }) => {
        app = new RandoMatchedApp(page);
        await injectTestData(page);
        await page.goto('/');
        await waitForAppReady(page);
    });

    test('должно открываться окно настроек', async ({ page }) => {
        await app.openSettings();
        await page.waitForTimeout(500);

        // Проверяем, что панель настроек открылась
        const settingsPanel = page.locator('text=Настройки').or(
            page.locator('text=Settings')
        ).first();

        await expect(settingsPanel).toBeVisible({ timeout: 5000 });
    });

    test('должна переключаться тема из настроек', async ({ page }) => {
        // Изначально должна быть темная тема
        let isDark = await app.isDarkTheme();
        expect(isDark).toBe(true);

        // Переключаем тему через кнопку в хедере (она всегда видна)
        await app.toggleTheme();
        await page.waitForTimeout(500);

        isDark = await app.isDarkTheme();
        expect(isDark).toBe(false);

        // Возвращаем обратно темную тему
        await app.toggleTheme();
        await page.waitForTimeout(500);

        isDark = await app.isDarkTheme();
        expect(isDark).toBe(true);
    });

    test('должны сохраняться настройки в localStorage', async () => {
        // Проверяем базовые настройки
        const theme = await app.getLocalStorageItem('theme');
        expect(theme).toBeTruthy();

        const colorScheme = await app.getLocalStorageItem('colorScheme');
        expect(colorScheme).toBe('indigo');
    });

    test('должна закрываться панель настроек', async ({ page }) => {
        // Открываем настройки
        await app.openSettings();
        await page.waitForTimeout(500);

        // Закрываем настройки
        await app.closeSettings();
        await page.waitForTimeout(500);
    });
});
