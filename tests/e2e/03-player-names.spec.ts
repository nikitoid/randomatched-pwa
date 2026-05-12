import { test, expect } from '../helpers/fixtures';
import { waitForAppReady, TEST_PLAYER_NAMES } from '../helpers/test-data';

test.describe('Имена игроков', () => {
    test.beforeEach(async ({ page, injectData }) => {
        await injectData();
        await page.goto('/');
        await waitForAppReady(page);
    });

    test('должна открываться панель ввода имен', async ({ app }) => {
        await app.namesToggle.click();
        await expect(app.page.locator('span:has-text("Имена игроков")').first()).toBeVisible();
    });

    test('должна быть возможность добавить имена игроков', async ({ app }) => {
        await app.namesToggle.click();
        
        // Вводим имена в 4 инпута
        const inputs = app.page.locator('input[placeholder^="Игрок"]');
        for (let i = 0; i < 4; i++) {
            await inputs.nth(i).fill(TEST_PLAYER_NAMES[i]);
        }

        // Проверяем, что значения сохранились в инпутах
        for (let i = 0; i < 4; i++) {
            await expect(inputs.nth(i)).toHaveValue(TEST_PLAYER_NAMES[i]);
        }
    });

    test('имена должны сохраняться в localStorage', async ({ app }) => {
        await app.namesToggle.click();
        const inputs = app.page.locator('input[placeholder^="Игрок"]');
        
        const testName = 'Тестовый Игрок 1';
        await inputs.first().fill(testName);

        // Ждем небольшую задержку (автосохранение обычно по дебаунсу или сразу)
        // В App.tsx playerNames стейт обновляется сразу
        
        // Проверяем localStorage
        const savedNames = await app.getLocalStorageItem('randomatched_player_names_v1');
        expect(savedNames).toContain(testName);
    });
});
