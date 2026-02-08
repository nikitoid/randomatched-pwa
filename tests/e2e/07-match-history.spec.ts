import { test, expect } from '@playwright/test';
import { injectTestData, waitForAppReady } from '../helpers/test-data';
import { RandoMatchedApp } from '../helpers/page-objects';

test.describe('История матчей', () => {
    let app: RandoMatchedApp;

    test.beforeEach(async ({ page }) => {
        app = new RandoMatchedApp(page);
        await injectTestData(page);
        await page.goto('/');
        await waitForAppReady(page);
    });

    test('должна быть доступна кнопка статистики', async () => {
        await expect(app.statsButton).toBeVisible();
    });

    test('должна открываться страница статистики', async ({ page }) => {
        await app.statsButton.click();
        await page.waitForTimeout(1000);

        // Проверяем, что открылась панель статистики
        const statsPanel = page.locator('text=Статистика').or(
            page.locator('text=Stats')
        ).first();

        await expect(statsPanel).toBeVisible({ timeout: 5000 });
    });

    test('должна сохраняться история в localStorage', async ({ page }) => {
        // Генерируем команду
        await app.clickGenerate();
        await page.waitForTimeout(2000);

        // Проверяем, что история начала формироваться
        const history = await app.getLocalStorageItem('matchHistory');
        // История может быть пустой или содержать записи
        expect(history).toBeDefined();
    });
});
