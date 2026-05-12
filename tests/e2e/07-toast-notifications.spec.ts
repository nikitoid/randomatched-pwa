import { test, expect } from '../helpers/fixtures';
import { waitForAppReady } from '../helpers/test-data';

test.describe('Уведомления (Toasts)', () => {
    test.beforeEach(async ({ page, injectData }) => {
        await injectData();
        await page.goto('/');
        await waitForAppReady(page);
    });

    test('должно появляться уведомление при смене темы', async ({ app }) => {
        await app.toggleTheme();
        
        // Проверяем наличие тоста по test-id
        const toast = app.page.getByTestId('toast');
        await expect(toast.first()).toBeVisible();
    });

    test('уведомление должно содержать текст о смене темы', async ({ app }) => {
        await app.toggleTheme();
        const toast = app.page.getByTestId('toast');
        await expect(toast.first()).toContainText(/тема/i);
    });
});
