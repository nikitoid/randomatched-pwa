import { test, expect } from '../helpers/fixtures';
import { waitForAppReady } from '../helpers/test-data';

// Тестовая история с ночными матчами
const MOCK_HISTORY = [
    {
        id: 'match-1',
        timestamp: new Date('2026-05-23T21:00:00').getTime(),
        team1: [{ name: 'Алекс', heroName: 'Герой S+' }, { name: 'Борис', heroName: 'Герой S-' }],
        team2: [{ name: 'Виктор', heroName: 'Герой A+' }, { name: 'Григорий', heroName: 'Герой A-' }],
        winner: 'team1'
    },
    {
        id: 'match-2',
        timestamp: new Date('2026-05-24T01:30:00').getTime(), // Ночной матч того же игрового вечера (23 мая)
        team1: [{ name: 'Алекс', heroName: 'Герой S+' }, { name: 'Виктор', heroName: 'Герой A+' }],
        team2: [{ name: 'Борис', heroName: 'Герой S-' }, { name: 'Григорий', heroName: 'Герой A-' }],
        winner: 'team2'
    },
    {
        id: 'match-3',
        timestamp: new Date('2026-05-24T12:00:00').getTime(), // Матч на следующий день
        team1: [{ name: 'Борис', heroName: 'Герой S-' }, { name: 'Виктор', heroName: 'Герой A+' }],
        team2: [{ name: 'Алекс', heroName: 'Герой S+' }, { name: 'Григорий', heroName: 'Герой A-' }],
        winner: 'team1'
    }
];

test.describe('Фильтр по периоду дат', () => {
    test.beforeEach(async ({ page, injectData }) => {
        await injectData();
        // Инъектируем историю для корректного отображения статистики
        await page.context().addInitScript((data) => {
            localStorage.setItem('randomatched_match_history_v1', JSON.stringify(data));
        }, MOCK_HISTORY);
        
        await page.goto('/');
        await waitForAppReady(page);
    });

    test('фильтр по датам должен корректно группировать ночные сессии', async ({ app, page }) => {
        // Открываем модалку статистики
        await app.statsButton.click();
        await expect(app.statsModal).toBeVisible();

        // По умолчанию показываются все 3 матча
        await expect(page.locator('text=Всего матчей').locator('..').locator('text=3')).toBeVisible();

        // Кликаем на триггер фильтра по периоду
        await page.click('text=Период: Все время');

        // Вводим диапазон дат (2026-05-23 - 2026-05-23)
        // Локаторы инпутов "С даты" и "По дату"
        const startInput = page.locator('input[type="date"]').first();
        const endInput = page.locator('input[type="date"]').last();

        await startInput.fill('2026-05-23');
        await endInput.fill('2026-05-23');

        // Проверяем, что отображаемый период обновился
        await expect(page.locator('text=Период: 23.05.2026')).toBeVisible();

        // Проверяем, что количество матчей стало 2 (так как ночной матч в 01:30 24 мая сдвинулся на 6 часов назад и попал в 23 мая)
        await expect(page.locator('text=Всего матчей').locator('..').locator('text=2')).toBeVisible();

        // Сбрасываем фильтр нажатием кнопки "Сбросить"
        await page.getByTestId('reset-date-filter-btn').click();

        // Проверяем, что период снова стал "Все время" и количество матчей вернулось к 3
        await expect(page.locator('text=Период: Все время')).toBeVisible();
        await expect(page.locator('text=Всего матчей').locator('..').locator('text=3')).toBeVisible();
    });

    test('фильтр должен автоматически сбрасываться при закрытии модального окна', async ({ app, page }) => {
        await app.statsButton.click();
        await expect(app.statsModal).toBeVisible();

        // Открываем фильтр и ставим 23 мая
        await page.click('text=Период: Все время');
        const startInput = page.locator('input[type="date"]').first();
        const endInput = page.locator('input[type="date"]').last();
        await startInput.fill('2026-05-23');
        await endInput.fill('2026-05-23');

        await expect(page.locator('text=Период: 23.05.2026')).toBeVisible();

        // Закрываем модалку
        await app.statsCloseButton.click();
        await expect(app.statsModal).toBeHidden();

        // Открываем снова
        await app.statsButton.click();
        await expect(app.statsModal).toBeVisible();

        // Проверяем, что фильтр сбросился до "Все время"
        await expect(page.locator('text=Период: Все время')).toBeVisible();
        await expect(page.locator('text=Всего матчей').locator('..').locator('text=3')).toBeVisible();
    });
});
