import { test, expect } from '@playwright/test';
import { injectTestData, waitForAppReady } from '../helpers/test-data';
import { RandoMatchedApp } from '../helpers/page-objects';

test.describe('Ручной выбор героя', () => {
    let app: RandoMatchedApp;

    test.beforeEach(async ({ page }) => {
        app = new RandoMatchedApp(page);
        await injectTestData(page);
        await page.goto('/');
        await waitForAppReady(page);

        // Генерируем команды
        await app.clickGenerate();

        // Открываем героев (новые кнопки появляются только после раскрытия)
        const revealBtn = page.getByTestId('center-action-button');
        await expect(revealBtn).toBeVisible();
        await revealBtn.click();
    });

    test('должна быть доступна кнопка ручного выбора', async ({ page }) => {
        // Проверяем наличие кнопки на карточке игрока (по иконке UserCog)
        // Кнопка появляется при наведении на карточку в десктопе, но в тесте мы можем искать её в DOM
        // В ResultOverlay кнопки рендератся всегда, если !isFloating и hasHero (что верно для статических карт)
        // На mobile они могут быть всегда видны или требовать тапа.
        // В коде ResultOverlay:
        // {onManualSelect && ( <button ...><UserCog size={14} /></button> )}

        // Ищем оверлей результатов
        const overlay = page.getByTestId('result-overlay');
        await expect(overlay).toBeVisible();

        // Ищем кнопку внутри оверлея
        const manualSelectBtn = overlay.getByTestId('manual-select-btn').first();
        await expect(manualSelectBtn).toBeVisible({ timeout: 10000 });
    });

    test('должно открываться модальное окно выбора героя', async ({ page }) => {
        const manualSelectBtn = page.getByTestId('manual-select-btn').first();
        await manualSelectBtn.click({ force: true });

        // Проверяем появление модального окна
        const modal = page.getByTestId('hero-selection-modal');
        await expect(modal).toBeVisible();
        await expect(modal.getByPlaceholder('Поиск героя...')).toBeVisible();

        // Ожидаем, что список героев отрендерился
        const heroButtons = modal.getByTestId('hero-select-button');
        await expect(heroButtons).toHaveCount(12);
    });

    test('должен работать поиск и выбор героя', async ({ page }) => {
        // Открываем модальное окно для первого игрока
        const manualSelectBtn = page.getByTestId('manual-select-btn').first();
        await manualSelectBtn.click({ force: true });

        const modal = page.getByTestId('hero-selection-modal');
        await expect(modal).toBeVisible();

        // Ищем инпут поиска
        const searchInput = modal.getByPlaceholder('Поиск героя...');

        // Находим первого свободного героя (не занятого и не текущего)
        const allHeroButtons = modal.getByTestId('hero-select-button');
        const availableHeroBtn = allHeroButtons.filter({
            hasNotText: /ЗАНЯТ|ТЕКУЩИЙ/
        }).first();

        await expect(availableHeroBtn).toBeVisible();

        const heroName = (await availableHeroBtn.locator('.truncate.font-bold').textContent())?.trim();
        expect(heroName).toBeTruthy();

        // Пробуем поиск по этому имени
        await searchInput.fill(heroName!);

        // Теперь в списке должен быть наш герой (и он должен быть кликабелен)
        const heroBtnInSearch = modal.getByRole('button', { name: new RegExp(heroName!) });
        await expect(heroBtnInSearch).toBeVisible();
        await heroBtnInSearch.click();

        // Модальное окно должно закрыться
        await expect(searchInput).not.toBeVisible();

        // Проверяем, что на карточке отображается выбранный герой
        const heroNameOnCard = page.locator('h2', { hasText: heroName! });
        await expect(heroNameOnCard).toBeVisible();
    });

    test('занятые герои должны быть недоступны', async ({ page }) => {
        // Открываем модалку первого игрока
        const manualSelectBtn = page.getByTestId('manual-select-btn').first();
        await manualSelectBtn.click({ force: true });

        const modal = page.getByTestId('hero-selection-modal');
        await expect(modal).toBeVisible();

        // В тестовых данных 4 игрока, значит 3 героя заняты другими
        const busyBadges = modal.getByText('ЗАНЯТ');
        await expect(busyBadges).toHaveCount(3);

        const currentBadge = modal.getByText('ТЕКУЩИЙ');
        await expect(currentBadge).toHaveCount(1);

        // Проверяем, что кнопка с "ЗАНЯТ" действительно disabled
        const firstBusyBtn = modal.locator('button', { has: page.getByText('ЗАНЯТ') }).first();
        await expect(firstBusyBtn).toBeDisabled();
    });
});
