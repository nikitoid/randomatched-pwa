import { test, expect } from '@playwright/test';
import { injectTestData, waitForAppReady } from '../helpers/test-data';
import { RandoMatchedApp } from '../helpers/page-objects';

test.describe('Манипуляция с командами', () => {
    let app: RandoMatchedApp;

    test.beforeEach(async ({ page }) => {
        app = new RandoMatchedApp(page);
        await injectTestData(page);
        await page.goto('/');
        await waitForAppReady(page);

        // Генерируем команды для последующих манипуляций
        await app.clickGenerate();
        await page.waitForTimeout(2000);
    });

    test('должна быть доступна кнопка в оверлее после генерации', async ({ page }) => {
        // После генерации открывается ResultOverlay с кнопками
        const overlayButton = page.getByTestId('center-action-button');
        await expect(overlayButton).toBeVisible({ timeout: 5000 });
    });

    test('должен выполняться сброс сессии', async ({ page }) => {
        // Закрываем оверлей результатов через кнопку X
        await app.closeResultOverlay();
        await page.waitForTimeout(500);

        // Нажимаем кнопку "Сбросить сессию" на главной странице
        await expect(app.resetButton).toBeVisible({ timeout: 5000 });
        await app.resetButton.click();
        await page.waitForTimeout(500);

        // Подтверждаем сброс в модальном окне
        const confirmButton = page.getByTestId('confirm-reset-button');
        await expect(confirmButton).toBeVisible();
        await confirmButton.click();
        await page.waitForTimeout(500);

        // После сброса кнопка генерации должна быть доступна
        await expect(app.generateButton).toBeEnabled({ timeout: 5000 });
    });
});
