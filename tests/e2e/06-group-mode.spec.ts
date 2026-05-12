import { test, expect } from '@playwright/test';
import { injectTestData, waitForAppReady, TEST_LIST_PRIMARY, TEST_LIST_SECONDARY } from '../helpers/test-data';
import { RandoMatchedApp } from '../helpers/page-objects';

test.describe('Групповой режим', () => {
    let app: RandoMatchedApp;

    test.beforeEach(async ({ page }) => {
        app = new RandoMatchedApp(page);
        // Инъектируем два списка для тестирования группового режима
        await injectTestData(page, [TEST_LIST_PRIMARY, TEST_LIST_SECONDARY]);
        await page.goto('/');
        await waitForAppReady(page);
    });

    test('должна существовать возможность работы с несколькими списками', async () => {
        // Проверяем, что оба списка загрузились
        const lists = await app.getLocalStorageItem('randomatched_lists_v1');
        expect(lists.length).toBe(2);
    });

    test('должна быть возможность генерации с группой списков', async ({ page }) => {
        // Открываем селектор списков
        await app.sourceSelector.click();
        await page.waitForTimeout(500);

        // Ищем переключатель группового режима
        const groupModeButton = page.locator('button:has-text("Группа")').first();
        await expect(groupModeButton).toBeVisible({ timeout: 5000 });
        await groupModeButton.click();
        await page.waitForTimeout(500);

        // Закрываем селектор
        await app.sourceSelector.click();
        await page.waitForTimeout(500);

        // Проверяем, что кнопка генерации доступна
        await expect(app.generateButton).toBeEnabled();
    });
});
