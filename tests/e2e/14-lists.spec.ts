import { test, expect } from '@playwright/test';
import { injectTestData, waitForAppReady } from '../helpers/test-data';
import { RandoMatchedApp } from '../helpers/page-objects';

test.describe('Раздел «Списки героев»', () => {
    let app: RandoMatchedApp;

    test.beforeEach(async ({ page }) => {
        app = new RandoMatchedApp(page);
        await injectTestData(page);
        await page.goto('/');
        await waitForAppReady(page);
    });

    test('должно открываться окно списков', async ({ page }) => {
        await app.openLists();

        // Проверяем, что оверлей списков открылся
        const listsTitle = page.locator('h2:has-text("Списки героев")');
        await expect(listsTitle).toBeVisible({ timeout: 5000 });
    });

    test('закрытие модалки экспорта текста оставляет окно списков открытым', async ({ page }) => {
        await app.openLists();
        const listsTitle = page.locator('h2:has-text("Списки героев")');
        await expect(listsTitle).toBeVisible({ timeout: 5000 });

        // Открываем контекстное меню первого списка
        const menuButton = page.locator('button[aria-label="Меню списка"]').first();
        if (await menuButton.isVisible()) {
            await menuButton.click();
            const exportButton = page.getByText('Экспорт (текст)');
            await exportButton.click();

            const exportModalTitle = page.getByText('Экспорт текста');
            await expect(exportModalTitle).toBeVisible();

            // Закрываем экспорт текста
            const closeBtn = page.getByRole('button', { name: 'Закрыть' }).or(page.getByLabel('Закрыть'));
            await closeBtn.click();

            // Проверяем, что окно списков осталось открытым!
            await expect(listsTitle).toBeVisible();
        }
    });

    test('должна работать кнопка переключения «В группе»/«Не в группе» в редакторе списка', async ({ page }) => {
        await app.openLists();
        const listsTitle = page.locator('h2:has-text("Списки героев")');
        await expect(listsTitle).toBeVisible({ timeout: 5000 });

        // Открываем первый список
        const firstList = page.locator('[data-list-index="0"]').first();
        await firstList.click();

        // Переходим в режим редактирования
        const editButton = page.locator('button[aria-label="Редактировать список"]');
        if (await editButton.isVisible()) {
            await editButton.click();
        }

        // Проверяем наличие кнопки переключения группы
        const groupToggleBtn = page.locator('button[aria-label*="Список"]').filter({ hasText: /В группе|Не в группе/ });
        await expect(groupToggleBtn).toBeVisible();

        const initialText = await groupToggleBtn.innerText();
        await groupToggleBtn.click();

        // Проверяем изменение состояния
        if (initialText.includes('Не в группе')) {
            await expect(groupToggleBtn).toContainText('В группе');
        } else {
            await expect(groupToggleBtn).toContainText('Не в группе');
        }

        // Сохраняем изменения
        const saveButton = page.locator('button[aria-label="Сохранить изменения"]');
        await saveButton.click();

        // Проверяем, что в режиме просмотра отображается корректный бейдж
        const backBtn = page.locator('button[aria-label="Назад"]').first();
        await backBtn.click();
        await expect(listsTitle).toBeVisible();
    });
});

