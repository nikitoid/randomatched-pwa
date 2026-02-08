import { test, expect } from '@playwright/test';
import { injectTestData, waitForAppReady } from '../helpers/test-data';
import { RandoMatchedApp } from '../helpers/page-objects';

test.describe('Генерация команд', () => {
    let app: RandoMatchedApp;

    test.beforeEach(async ({ page }) => {
        app = new RandoMatchedApp(page);
        await injectTestData(page);
        await page.goto('/');
        await waitForAppReady(page);
    });

    test('должна быть доступна кнопка генерации', async () => {
        await expect(app.generateButton).toBeVisible();
        await expect(app.generateButton).toBeEnabled();
    });

    test('должна выполняться генерация команд', async ({ page }) => {
        // Нажимаем кнопку генерации
        await app.clickGenerate();

        // Даем время на генерацию и анимацию
        await page.waitForTimeout(2000);

        // После генерации открывается ResultOverlay - проверяем центральную кнопку
        const overlayButton = page.getByTestId('center-action-button');
        await expect(overlayButton).toBeVisible({ timeout: 5000 });
    });

    test('должна сохраняться возможность повторной генерации', async ({ page }) => {
        // Первая генерация
        await app.clickGenerate();
        await page.waitForTimeout(2000);

        // Закрываем оверлей результатов через кнопку X
        await app.closeResultOverlay();
        await page.waitForTimeout(500);

        // Нажимаем кнопку "Сбросить сессию" на главной странице
        await expect(app.resetButton).toBeVisible({ timeout: 5000 });
        await app.resetButton.click();
        await page.waitForTimeout(500);

        // Подтверждаем сброс в модальном окне
        // Подтверждаем сброс в модальном окне
        const confirmButton = page.getByTestId('confirm-reset-button');
        await expect(confirmButton).toBeVisible();
        await confirmButton.click();
        await page.waitForTimeout(500);

        // Проверяем, что кнопка генерации снова доступна
        await expect(app.generateButton).toBeEnabled({ timeout: 5000 });
    });

    test('должна отображаться плавная генерация', async ({ page }) => {
        // Нажимаем кнопку генерации
        await app.generateButton.click();

        // После клика должен открыться оверлей с результатами
        const overlayButton = page.getByTestId('center-action-button');
        await expect(overlayButton).toBeVisible({ timeout: 5000 });
    });
});
