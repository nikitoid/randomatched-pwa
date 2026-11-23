import { test, expect } from '../helpers/fixtures';
import { waitForAppReady } from '../helpers/test-data';

test.describe('Offline-First PWA: основной цикл без сети', () => {
    test('работа со списком, генерация 2×2, реролл, запись матча и просмотр статистики при context.setOffline(true)', async ({
        page,
        context,
        app,
        injectData,
    }) => {
        const pageErrors: string[] = [];
        page.on('pageerror', (err) => {
            pageErrors.push(err.message);
        });

        await injectData();
        await page.goto('/');
        await waitForAppReady(page);
        // Ждём завершения фоновой предзагрузки ленивых экранов (preloadAllScreens)
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(300);

        await context.setOffline(true);

        try {
            // 1. Создание и редактирование локального списка в оффлайне
            await app.openLists();
            await page.getByTestId('new-list-btn').click();

            const listNameInput = page.getByPlaceholder('Название...');
            await expect(listNameInput).toBeVisible();
            await listNameInput.fill('Оффлайн список');
            await page.getByTestId('name-submit-btn').click();

            const heroNameInput = page.getByPlaceholder('Добавить героя...');
            await expect(heroNameInput).toBeVisible();
            await heroNameInput.fill('Оффлайн Герой');

            await page.locator('button[aria-label="Сохранить изменения"]').click();
            await page.locator('button[aria-label="Назад"]').first().click();
            await expect(page.locator('h2:has-text("Списки героев")')).toBeVisible();
            await app.closeLists();

            const storedLists = await app.getLocalStorageItem('randomatched_lists_v1');
            expect(storedLists).toBeTruthy();
            const createdList = storedLists!.find((l) => l.name === 'Оффлайн список');
            expect(createdList).toBeDefined();
            expect(createdList!.heroes.some((h) => h.name === 'Оффлайн Герой')).toBe(true);

            // 2. Ввод имён игроков и генерация игры 2×2 без сети
            await app.namesToggle.click();
            await app.fillPlayerName(0, 'Оффлайн 1');
            await app.fillPlayerName(1, 'Оффлайн 2');
            await app.namesToggle.click();

            await app.clickGenerate();
            await app.revealHeroes();

            const resultOverlay = page.getByTestId('result-overlay');
            await expect(resultOverlay).toBeVisible();
            await expect(resultOverlay.locator('h2')).toHaveCount(4);

            // 3. Реролл героя в оффлайне
            const rerollBtn = resultOverlay.locator('button[aria-label="Перевыбрать героя"]').first();
            await expect(rerollBtn).toBeVisible();
            await rerollBtn.click();
            await expect(resultOverlay).toBeVisible();

            // 4. Запись результата матча (ResultOverlay закрывается автоматически)
            await app.recordMatch(1);
            await expect(resultOverlay).toBeHidden({ timeout: 5000 });

            // 5. Открытие и проверка статистики в оффлайне
            await app.statsButton.click();
            const statsModal = app.statsModal;
            await expect(statsModal).toBeVisible();

            await statsModal.getByRole('button', { name: 'Матчи' }).click();
            await expect(statsModal.getByText('Оффлайн 1').first()).toBeVisible();
            await app.statsCloseButton.click();
            await expect(statsModal).toBeHidden();

            const storedHistory = await app.getLocalStorageItem('randomatched_match_history_v1');
            expect(storedHistory).toBeTruthy();
            expect(storedHistory!.length).toBe(1);
            expect(storedHistory![0].winner).toBe('team1');
            expect(pageErrors).toEqual([]);
        } finally {
            await context.setOffline(false);
        }
    });
});
