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

        // Проверяем, что оверлей списков открылся
        const listsTitle = page.locator('h2:has-text("Списки героев")');
        await expect(listsTitle).toBeVisible({ timeout: 5000 });
    });

    test('закрытие модалки экспорта текста оставляет окно списков открытым', async ({ page }) => {
        await app.openLists();
        const listsTitle = page.locator('h2:has-text("Списки героев")');
        await expect(listsTitle).toBeVisible({ timeout: 5000 });

        // Открываем контекстное меню первого списка
        const menuButton = page.locator('button[aria-label="Меню списка"]').first();
        if (await menuButton.isVisible()) {
            await menuButton.click();
            const exportButton = page.getByText('Экспорт (текст)');
            await exportButton.click();

            const exportModalTitle = page.getByText('Экспорт текста');
            await expect(exportModalTitle).toBeVisible();

            // Закрываем экспорт текста
            const closeBtn = page.getByRole('button', { name: 'Закрыть' }).or(page.getByLabel('Закрыть'));
            await closeBtn.click();

            // Проверяем, что окно списков осталось открытым!
            await expect(listsTitle).toBeVisible();
        }
    });
});
