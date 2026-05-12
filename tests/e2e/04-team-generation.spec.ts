import { test, expect } from '../helpers/fixtures';
import { waitForAppReady } from '../helpers/test-data';

test.describe('Генерация команд', () => {
    test.beforeEach(async ({ page, injectData }) => {
        await injectData();
        await page.goto('/');
        await waitForAppReady(page);
    });

    test('должна выполняться генерация героев', async ({ app }) => {
        await app.clickGenerate();

        // Проверяем наличие оверлея с результатами по test-id
        await expect(app.page.getByTestId('result-overlay')).toBeVisible();

        // Проверяем, что отображаются карточки героев (их должно быть 4 в стандартном режиме 2x2)
        // Карточки имеют специфический градиент или структуру, но мы можем проверить по h2 внутри оверлея
        const heroNames = app.page.getByTestId('result-overlay').locator('h2');
        await expect(heroNames).toHaveCount(4);
    });

    test('результаты генерации должны закрываться по нажатию Escape', async ({ app }) => {
        await app.clickGenerate();
        await expect(app.page.getByTestId('result-overlay')).toBeVisible();

        await app.closeResultOverlay();
        await expect(app.page.getByTestId('result-overlay')).toBeHidden();
    });

    test('после генерации должна обновляться история', async ({ app }) => {
        // Заполняем имена, чтобы можно было записать результат
        await app.namesToggle.click();
        await app.fillPlayerName(0, 'Игрок 1');
        await app.fillPlayerName(1, 'Игрок 2');
        await app.namesToggle.click();

        await app.clickGenerate();
        await app.revealHeroes();
        
        // Записываем результат матча
        await app.recordMatch(1);

        // Открываем статистику (бывшую историю)
        await app.statsButton.click();
        await expect(app.page.getByTestId('stats-title')).toBeVisible();
        
        // Проверяем наличие записи в localStorage
        const history = await app.getLocalStorageItem('randomatched_match_history_v1');
        expect(history.length).toBeGreaterThan(0);
    });

    test('кнопка Сбросить сессию должна очищать текущий результат', async ({ app }) => {
        await app.clickGenerate();
        await app.closeResultOverlay();

        // Проверяем, что кнопка сброса появилась и работает
        await expect(app.resetButton).toBeVisible();
        await app.resetButton.click();
        
        // Подтверждаем сброс в модалке
        const confirmBtn = app.page.getByTestId('confirm-reset-button');
        await confirmBtn.waitFor({ state: 'visible' });
        await confirmBtn.click();
        
        // После сброса кнопка генерации должна быть видна и активна
        await expect(app.generateButton).toBeEnabled({ timeout: 10000 });
    });
});
