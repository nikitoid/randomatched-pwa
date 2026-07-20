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

    test('на вкладке "Игроки" должна быть кнопка справки и открываться модалка алгоритма эффективности', async ({ app }) => {
        await app.statsButton.click();
        await expect(app.statsModal).toBeVisible();

        // Переходим на вкладку "Игроки"
        await app.page.locator('button:has-text("Игроки")').click();

        // Кнопка справки должна быть видна
        const infoBtn = app.page.locator('[data-testid="stats-efficiency-info-btn"]');
        await expect(infoBtn).toBeVisible();

        // Кликаем по кнопке справки
        await infoBtn.click();

        // Модалка должна открыться
        const modal = app.page.locator('[data-testid="stats-efficiency-modal"]');
        await expect(modal).toBeVisible();
        await expect(modal.locator('text=Алгоритм эффективности')).toBeVisible();
        await expect(modal.locator('text=Почему этот расчёт справедлив')).toBeVisible();

        // Закрываем модалку по кнопке "Понятно"
        await modal.locator('button:has-text("Понятно")').click();
        await expect(modal).toBeHidden();

        // Сменяем сортировку на "По винрейту" - кнопка справки должна скрыться
        await app.page.locator('button[aria-label="Сортировка"]').click();
        await app.page.locator('button:has-text("По винрейту")').click();
        await expect(infoBtn).toBeHidden();
    });
});
