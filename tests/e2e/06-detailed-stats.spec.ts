import { test, expect } from '../helpers/fixtures';
import { waitForAppReady } from '../helpers/test-data';

// Пример истории для статистики
const MOCK_HISTORY = [
    {
        id: 'match-1',
        timestamp: Date.now() - 15000,
        team1: [{ name: 'Алекс', heroName: 'Герой S+', kills: 5 }, { name: 'Борис', heroName: 'Герой S-', kills: 1 }],
        team2: [{ name: 'Виктор', heroName: 'Герой A+', kills: 0 }, { name: 'Григорий', heroName: 'Герой A-', kills: 0 }],
        winner: 'team1'
    },
    {
        id: 'match-2',
        timestamp: Date.now() - 10000,
        team1: [{ name: 'Алекс', heroName: 'Герой S+', kills: 3 }, { name: 'Борис', heroName: 'Герой S-', kills: 1 }],
        team2: [{ name: 'Виктор', heroName: 'Герой A+', kills: 0 }, { name: 'Григорий', heroName: 'Герой A-', kills: 0 }],
        winner: 'team1'
    },
    {
        id: 'match-3',
        timestamp: Date.now() - 5000,
        team1: [{ name: 'Алекс', heroName: 'Герой S+', kills: 4 }, { name: 'Борис', heroName: 'Герой S-', kills: 1 }],
        team2: [{ name: 'Виктор', heroName: 'Герой A+', kills: 0 }, { name: 'Григорий', heroName: 'Герой A-', kills: 0 }],
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

    test('на вкладке "Игроки" из модального окна расшифровки можно открыть подробную справку об алгоритме эффективности', async ({ app }) => {
        await app.statsButton.click();
        await expect(app.statsModal).toBeVisible();

        // Переходим на вкладку "Игроки"
        await app.page.locator('button:has-text("Игроки")').click();

        // Кликаем по кнопке "Расшифровка расчёта" над списком игроков
        await app.page.locator('button:has-text("Расшифровка расчёта")').click();

        // Модалка расшифровки должна быть видна
        const breakdownModal = app.page.locator('[data-testid="stats-efficiency-breakdown-modal"]');
        await expect(breakdownModal).toBeVisible();

        // Находим кнопку "Подробнее"
        const infoBtn = breakdownModal.locator('[data-testid="stats-efficiency-info-btn"]');
        await expect(infoBtn).toBeVisible();

        // Кликаем по кнопке "Подробнее"
        await infoBtn.click();

        // Модалка алгоритма должна открыться
        const modal = app.page.locator('[data-testid="stats-efficiency-modal"]');
        await expect(modal).toBeVisible();
        await expect(modal.locator('text=Алгоритм эффективности')).toBeVisible();
        await expect(modal.locator('text=Почему этот расчёт справедлив')).toBeVisible();

        // Закрываем модалку по кнопке "Понятно"
        await modal.locator('button:has-text("Понятно")').click();
        await expect(modal).toBeHidden();
    });

    test('на вкладке "Игроки" должен отображаться бейдж "Ебака парень" для топ-киллера', async ({ app }) => {
        await app.statsButton.click();
        await expect(app.statsModal).toBeVisible();

        await app.page.locator('button:has-text("Игроки")').click();
        await expect(app.statsModal.getByText('Ебака парень', { exact: true })).toBeVisible();
    });

    test('на вкладке "Игроки" должен отображаться бейдж "Underdog" для андердога', async ({ app }) => {
        await app.statsButton.click();
        await expect(app.statsModal).toBeVisible();

        await app.page.locator('button:has-text("Игроки")').click();
        await expect(app.statsModal.getByText('Underdog', { exact: true })).toBeVisible();
    });
});
