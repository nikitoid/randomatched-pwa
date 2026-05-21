import { test, expect, injectMatchHistory } from '../helpers/fixtures';
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

    test('автокомплит имен игроков на основе истории матчей', async ({ app }) => {
        const mockHistory = [
            {
                id: 'match-1',
                timestamp: Date.now(),
                lastUpdated: Date.now(),
                team1: [
                    { name: 'Игрок А', heroId: 'hero-1', heroName: 'Hero 1' },
                    { name: 'Игрок Б', heroId: 'hero-2', heroName: 'Hero 2' }
                ],
                team2: [
                    { name: 'Игрок В', heroId: 'hero-3', heroName: 'Hero 3' },
                    { name: 'Игрок Г', heroId: 'hero-4', heroName: 'Hero 4' }
                ],
                winner: 'team1'
            }
        ];
        await injectMatchHistory(app.page, mockHistory);

        // Перезагружаем страницу, чтобы подгрузить историю, и ждем готовности приложения
        await app.page.reload();
        await waitForAppReady(app.page);
        await app.namesToggle.click();

        const inputs = app.page.locator('input[placeholder^="Игрок"]');
        
        // 1. Вводим "Игр" в первый инпут
        await inputs.nth(0).fill('Игр');
        
        // Ожидаем появление подсказок
        const dropdown = app.page.locator('.suggestions-dropdown');
        await expect(dropdown).toBeVisible();
        
        // Проверяем, что отображаются все 4 игрока из истории
        const suggestions = dropdown.locator('button');
        await expect(suggestions).toHaveCount(4);
        await expect(suggestions.nth(0)).toHaveText('Игрок А');
        await expect(suggestions.nth(1)).toHaveText('Игрок Б');
        await expect(suggestions.nth(2)).toHaveText('Игрок В');
        await expect(suggestions.nth(3)).toHaveText('Игрок Г');

        // 2. Кликаем по первой подсказке "Игрок А"
        await suggestions.nth(0).click();
        
        // Проверяем, что инпут заполнился и подсказки закрылись
        await expect(inputs.nth(0)).toHaveValue('Игрок А');
        await expect(dropdown).not.toBeVisible();

        // 3. Переходим во второй инпут и вводим "Игр"
        await inputs.nth(1).fill('Игр');
        await expect(dropdown).toBeVisible();

        // Должно быть 3 подсказки, так как "Игрок А" уже введен в первый инпут
        await expect(suggestions).toHaveCount(3);
        await expect(suggestions.nth(0)).toHaveText('Игрок Б');
        await expect(suggestions.nth(1)).toHaveText('Игрок В');
        await expect(suggestions.nth(2)).toHaveText('Игрок Г');

        // Кликаем по "Игрок В" (вторая подсказка в списке, так как "Игрок Б" первая)
        await suggestions.nth(1).click();
        await expect(inputs.nth(1)).toHaveValue('Игрок В');
        await expect(dropdown).not.toBeVisible();
    });
});
