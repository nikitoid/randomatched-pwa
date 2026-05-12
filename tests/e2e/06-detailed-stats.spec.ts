import { test, expect } from '../helpers/fixtures';
import { waitForAppReady } from '../helpers/test-data';

// Пример истории для статистики
const MOCK_HISTORY = [
    {
        id: 'match-1',
        timestamp: Date.now() - 10000,
        team1: [{ name: 'Алекс', heroName: 'Герой S+' }, { name: 'Борис', heroName: 'Герой S-' }],
        team2: [{ name: 'Виктор', heroName: 'Герой A+' }, { name: 'Григорий', heroName: 'Герой A-' }],
        winner: 'team1'
    },
    {
        id: 'match-2',
        timestamp: Date.now() - 5000,
        team1: [{ name: 'Алекс', heroName: 'Герой S+' }, { name: 'Борис', heroName: 'Герой S-' }],
        team2: [{ name: 'Виктор', heroName: 'Герой A+' }, { name: 'Григорий', heroName: 'Герой A-' }],
        winner: 'team1'
    }
];

test.describe('Детальная статистика', () => {
    test.beforeEach(async ({ page, injectData }) => {
        await injectData();
        // Инъектируем историю для корректного отображения статистики
        await page.context().addInitScript((data) => {
            localStorage.setItem('randomatched_match_history_v1', JSON.stringify(data));
        }, MOCK_HISTORY);
        
        await page.goto('/');
        await waitForAppReady(page);
    });

    test('статистика должна открываться из панели навигации', async ({ app }) => {
        await app.statsButton.click();
        await expect(app.statsModal).toBeVisible();
        await expect(app.statsTitle).toBeVisible();
    });

    test('должна отображаться общая информация в статистике', async ({ app }) => {
        await app.statsButton.click();
        await expect(app.statsModal).toBeVisible();
        
        // Используем более гибкий поиск по тексту, если test-id подводит
        await expect(app.page.locator('text=Топ эффективности')).toBeVisible();
    });

    test('статистика должна закрываться по кнопке', async ({ app }) => {
        await app.statsButton.click();
        await expect(app.statsModal).toBeVisible();

        await app.statsCloseButton.click();
        
        await expect(app.statsModal).toBeHidden();
    });
});
