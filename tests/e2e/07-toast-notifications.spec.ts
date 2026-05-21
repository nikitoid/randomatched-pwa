import { test, expect } from '../helpers/fixtures';
import { waitForAppReady } from '../helpers/test-data';

test.describe('Уведомления (Toasts)', () => {
    test.beforeEach(async ({ page, injectData }) => {
        await injectData();
        await page.goto('/');
        await waitForAppReady(page);
    });

    test('должно появляться уведомление при сбросе сессии', async ({ page, app }) => {
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
        await confirmButton.click();
        
        // Проверяем наличие тоста по test-id
        const toast = app.page.getByTestId('toast');
        await expect(toast.first()).toBeVisible({ timeout: 5000 });
    });

    test('уведомление должно содержать текст о сбросе сессии', async ({ page, app }) => {
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
        await confirmButton.click();

        const toast = app.page.getByTestId('toast');
        await expect(toast.first()).toContainText(/сброшена/i);
    });
});
