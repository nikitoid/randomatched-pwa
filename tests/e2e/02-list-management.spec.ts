import { test, expect } from '@playwright/test';
import { injectTestData, waitForAppReady } from '../helpers/test-data';
import { RandoMatchedApp } from '../helpers/page-objects';

test.describe('Управление списками героев', () => {
    let app: RandoMatchedApp;

    test.beforeEach(async ({ page }) => {
        app = new RandoMatchedApp(page);
        await injectTestData(page);
        await page.goto('/');
        await waitForAppReady(page);
    });

    test('должно открываться и закрываться окно настроек', async ({ page }) => {
        // Открываем настройки
        await app.openSettings();
        await page.waitForTimeout(500);

        // Проверяем, что панель настроек открылась
        const settingsPanel = page.locator('text=Настройки').or(page.locator('text=Settings')).first();
        await expect(settingsPanel).toBeVisible({ timeout: 5000 });

        // Закрываем настройки
        await app.closeSettings();
        await page.waitForTimeout(500);
    });

    test('должны сохраняться списки в localStorage', async () => {
        // Проверяем, что список сохранен
        const lists = await app.getLocalStorageItem('randomatched_lists_v1');
        expect(lists).toBeTruthy();
        expect(lists.length).toBe(1);
        expect(lists[0].name).toBe('Тестовый список 1');
        expect(lists[0].heroes.length).toBe(12);
    });

    test('должен отображаться корректный индикатор локального списка', async () => {
        // Проверяем, что список помечен как локальный в localStorage
        const lists = await app.getLocalStorageItem('randomatched_lists_v1');
        expect(lists[0].isLocal).toBe(true);
    });
});
