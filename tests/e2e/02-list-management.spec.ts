import { test, expect } from '../helpers/fixtures';
import { waitForAppReady, TEST_LIST_PRIMARY, TEST_LIST_SECONDARY } from '../helpers/test-data';

test.describe('Управление списками героев', () => {
    test.beforeEach(async ({ page, injectData }) => {
        await injectData([TEST_LIST_PRIMARY, TEST_LIST_SECONDARY]);
        await page.goto('/');
        await waitForAppReady(page);
    });

    test('должен отображаться текущий выбранный список', async ({ app }) => {
        await expect(app.sourceSelector).toBeVisible();
        await expect(app.sourceSelector).toContainText('Тестовый список 1');
    });

    test('должно открываться меню выбора списка', async ({ app }) => {
        await app.sourceSelector.click();
        // Ждем появления элементов управления внутри выпадающего списка
        await expect(app.page.locator('button:has-text("Один")')).toBeVisible();
        await expect(app.page.locator('button:has-text("Группа")')).toBeVisible();
    });

    test('должна быть возможность сменить активный список', async ({ app }) => {
        await app.sourceSelector.click();

        // Выбираем второй список (он должен закрыться автоматически)
        const secondaryListItem = app.page.locator(`text=${TEST_LIST_SECONDARY.name}`).first();
        await secondaryListItem.click();

        // Проверяем, что текст на главной обновился
        await expect(app.sourceSelector).toContainText('Тестовый список 2');
    });
});
