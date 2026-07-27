import { test, expect } from '../helpers/fixtures';
import { waitForAppReady } from '../helpers/test-data';

test.describe('Манипуляция командами', () => {
    test.beforeEach(async ({ page, injectData }) => {
        await injectData();
        await page.goto('/');
        await waitForAppReady(page);
    });

    test('должна быть возможность перегенерировать отдельного героя', async ({ app }) => {
        await app.clickGenerate();
        await app.revealHeroes();
        
        // В оверлее результатов герои отображаются в h2
        const firstHero = app.page.getByTestId('result-overlay').locator('h2').first();
        await expect(firstHero).toBeVisible();
        const firstHeroName = await firstHero.innerText();

        // Кликаем по кнопке реролла конкретного героя
        const rerollButton = app.page.locator('button:has(svg.lucide-refresh-cw)').nth(1);
        await rerollButton.click();
        
        // Проверяем, что оверлей все еще открыт
        await expect(app.page.getByTestId('result-overlay')).toBeVisible();
    });

    test('должна быть возможность перемешать команды', async ({ app }) => {
        await app.clickGenerate();

        // Ищем кнопку перемешивания (Shuffle)
        const shuffleButton = app.page.getByTestId('shuffle-teams-btn');
        
        await expect(shuffleButton).toBeVisible();
        await shuffleButton.click();
        await expect(app.page.getByTestId('result-overlay')).toBeVisible();
    });

    test('должна быть возможность переключать режим отображения карточек (Лицом / Крест)', async ({ app }) => {
        // Заполняем имена, чтобы кнопка "Двигать" была активна
        await app.namesToggle.click();
        await app.fillPlayerName(0, 'Игрок 1');
        await app.fillPlayerName(1, 'Игрок 2');
        await app.namesToggle.click();

        await app.clickGenerate();
        await expect(app.page.getByTestId('result-overlay')).toBeVisible();

        const toggleBtn = app.page.getByTestId('toggle-view-mode-btn');
        await expect(toggleBtn).toBeVisible();
        await expect(toggleBtn).toContainText('Лицом');

        // В режиме "Лицом" кнопка "Двигать" должна быть заблокирована (disabled)
        const moveBtn = app.page.getByRole('button', { name: /Двигать/ });
        await expect(moveBtn).toBeVisible();
        await expect(moveBtn).toBeDisabled();

        // Переключаем на режим "Крест"
        await toggleBtn.click();
        await expect(toggleBtn).toContainText('Крест');

        const savedMode = await app.getLocalStorageItem('randomatched_result_view_mode');
        expect(savedMode).toBe('cross');

        // В режиме "Крест" кнопка "Двигать" должна стать активной (enabled)
        await expect(moveBtn).toBeEnabled();

        // Возвращаем в режим "Лицом"
        await toggleBtn.click();
        await expect(toggleBtn).toContainText('Лицом');

        const savedMode2 = await app.getLocalStorageItem('randomatched_result_view_mode');
        expect(savedMode2).toBe('facing');

        // Кнопка "Двигать" снова должна стать заблокирована (disabled)
        await expect(moveBtn).toBeDisabled();
    });
});
