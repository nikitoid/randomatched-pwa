import { test, expect } from '@playwright/test';
import { injectTestData, waitForAppReady } from '../helpers/test-data';
import { RandoMatchedApp } from '../helpers/page-objects';

test.describe('Раздел «Списки героев»', () => {
    let app: RandoMatchedApp;

    test.beforeEach(async ({ page }) => {
        app = new RandoMatchedApp(page);
        await injectTestData(page);
        await page.goto('/');
        await waitForAppReady(page);
    });

    test('должно открываться окно списков', async ({ page }) => {
        await app.openLists();
        await page.waitForTimeout(500);

        // Проверяем, что оверлей списков открылся
        const listsTitle = page.locator('h2:has-text("Списки героев")');
        await expect(listsTitle).toBeVisible({ timeout: 5000 });
    });

    test('должна закрываться панель списков', async ({ page }) => {
        // Открываем списки
        await app.openLists();
        await page.waitForTimeout(500);

        // Закрываем списки
        await app.closeLists();
        await page.waitForTimeout(500);

        // Проверяем, что оверлей скрылся
        const listsTitle = page.locator('h2:has-text("Списки героев")');
        await expect(listsTitle).toBeHidden({ timeout: 5000 });
    });
});
