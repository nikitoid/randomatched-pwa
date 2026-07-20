import { test, expect } from '@playwright/test';
import { RandoMatchedApp } from '../helpers/page-objects';
import { injectTestData, waitForAppReady, TEST_LIST_PRIMARY } from '../helpers/test-data';

test.describe('Управление облачными бэкапами', () => {
    let app: RandoMatchedApp;

    test.beforeEach(async ({ page }) => {
        // ENABLE TEST MODE (Mock DB)
        // This instructs the app (firebase.ts) to use the in-memory MockFirestore
        await page.addInitScript(() => {
            (window as any).__PLAYWRIGHT_TEST__ = true;
        });

        // MOCK CONNECTIVITY CHECK
        // The app checks connection by pinging google favicon. We must ensure this succeeds.
        await page.route('**google.com/favicon.ico*', async route => {
            await route.fulfill({ status: 200, body: 'mock-favicon' });
        });

        await injectTestData(page, [TEST_LIST_PRIMARY]);
        app = new RandoMatchedApp(page);
        await page.goto('/');
        await waitForAppReady(page);
    });

    const openBackupMenu = async (page: any) => {
        const statsTitle = page.locator('h2:has-text("Статистика")');
        await expect(statsTitle).toBeVisible();
        await page.waitForTimeout(1000);
        await statsTitle.click({ force: true });
        await page.waitForTimeout(200);
        await statsTitle.click({ force: true });
        await page.waitForTimeout(200);
        await statsTitle.click({ force: true });
        const backupMenuTitle = page.locator('h3:has-text("Резервное копирование")');
        await expect(backupMenuTitle).toBeVisible({ timeout: 10000 });
    };

    test('полный цикл: создание, просмотр, удаление бэкапа', async ({ page }, testInfo) => {
        test.slow();

        // 1. Открываем меню
        await app.statsButton.click();
        await openBackupMenu(page);

        // 2. Открываем менеджер бэкапов
        const openManagerBtn = page.getByTestId('backup-open-manager-btn');
        await expect(openManagerBtn).toBeVisible();
        await openManagerBtn.click();

        // Ждем появления модалки менеджера
        const managerTitle = page.locator('h3:has-text("Облачные бэкапы")');
        await expect(managerTitle).toBeVisible();

        // 3. Создаем бэкап
        const createBtn = page.getByTestId('backup-manager-create-btn');
        await createBtn.click();

        // Ждем обновления списка (появления кнопки восстановления)
        // Ищем в списке элементов
        await expect(page.getByTestId('backup-manager-restore-btn').first()).toBeVisible({ timeout: 15000 });

        // 4. Проверяем наличие кнопок действий в элементах списка
        const backupItem = page.getByTestId('backup-item').first();
        const viewBtn = backupItem.locator('button[aria-label="Просмотреть"]');
        const deleteBtn = backupItem.locator('button[aria-label="Удалить"]');

        await expect(viewBtn).toBeVisible();
        await expect(deleteBtn).toBeVisible();

        // 5. Тест просмотра
        await viewBtn.click();

        // Ждем открытия встроенной в менеджер модалки просмотра (она рендерится поверх или внутри)
        // BackupViewer имеет свой портал или рендерится условно?
        // В CloudBackupManager: {viewingBackup && <BackupViewer ... />}
        // BackupViewer обычно имеет заголовок "Просмотр бэкапа"
        const viewerTitle = page.locator('h3:has-text("Просмотр бэкапа")');
        await expect(viewerTitle).toBeVisible();

        // Закрываем просмотр
        const closeViewerBtn = page.getByTestId('backup-viewer-close-btn');
        await closeViewerBtn.click();

        await expect(viewerTitle).not.toBeVisible();

        // 6. Тест удаления
        await deleteBtn.click();

        // Модалка удаления (внутри менеджера)
        const deleteModalTitle = page.locator('h3:has-text("Удаление бэкапа")');
        await expect(deleteModalTitle).toBeVisible();

        // Ввод подтверждения
        const deleteInput = page.getByPlaceholder('УДАЛИТЬ');
        await deleteInput.fill('УДАЛИТЬ');

        // Кнопка подтверждения
        const confirmDeleteBtn = page.locator('button:has-text("Удалить")').last(); // last, т.к. может быть conflict с кнопкой открытия? Нет, это модалка.
        await confirmDeleteBtn.click();

        // Ждем исчезновения бэкапа из списка
        // Если это был единственный бэкап, появится empty state
        // Или просто проверяем что этот элемент исчез (но сложнее, так как айди динамический)
        // Проще проверить что список пуст или количество уменьшилось
        // В нашем случае мы создали 1, удалили 1 -> должен быть empty state
        await expect(page.getByTestId('backup-list-empty')).toBeVisible();
    });
});
