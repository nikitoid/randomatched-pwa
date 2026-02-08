import { test, expect } from '@playwright/test';
import { injectTestData, waitForAppReady } from '../helpers/test-data';
import { RandoMatchedApp } from '../helpers/page-objects';

test.describe('Сброс сессии', () => {
    let app: RandoMatchedApp;

    test.beforeEach(async ({ page }) => {
        app = new RandoMatchedApp(page);
        await injectTestData(page);
        await page.goto('/');
        await waitForAppReady(page);
    });

    test('должна быть доступна кнопка сброса после генерации', async ({ page }) => {
        // Генерируем команды
        await app.clickGenerate();
        await page.waitForTimeout(2000);

        // Закрываем оверлей результатов
        await app.closeResultOverlay();
        await page.waitForTimeout(500);

        // Проверяем наличие кнопки сброса на главной странице
        await expect(app.resetButton).toBeVisible({ timeout: 5000 });
    });

    test('должен выполняться сброс при подтверждении', async ({ page }) => {
        // Генерируем команды
        await app.clickGenerate();
        await page.waitForTimeout(2000);

        // Закрываем оверлей результатов
        await app.closeResultOverlay();
        await page.waitForTimeout(500);

        // Нажимаем сброс
        await app.resetButton.click();
        await page.waitForTimeout(500);

        // Подтверждаем сброс в модальном окне
        const confirmButton = page.getByTestId('confirm-reset-button');
        await expect(confirmButton).toBeVisible();
        await confirmButton.click();
        await page.waitForTimeout(500);

        // Проверяем, что кнопка генерации снова доступна
        await expect(app.generateButton).toBeEnabled({ timeout: 5000 });
    });

    test('должна корректно работать повторная генерация после сброса', async ({ page }) => {
        // Первая генерация
        await app.clickGenerate();
        await page.waitForTimeout(2000);

        // Закрываем оверлей результатов
        await app.closeResultOverlay();
        await page.waitForTimeout(500);

        // Сброс
        await app.resetButton.click();
        await page.waitForTimeout(500);

        const confirmButton = page.getByTestId('confirm-reset-button');
        await expect(confirmButton).toBeVisible();
        await confirmButton.click();
        await page.waitForTimeout(500);

        // Повторная генерация
        await expect(app.generateButton).toBeEnabled({ timeout: 5000 });
        await app.clickGenerate();
        await page.waitForTimeout(2000);

        // Проверяем, что снова открылся оверлей
        const overlayButton = page.getByTestId('center-action-button');
        await expect(overlayButton).toBeVisible({ timeout: 5000 });
        await expect(overlayButton).toBeVisible({ timeout: 5000 });
    });
});
