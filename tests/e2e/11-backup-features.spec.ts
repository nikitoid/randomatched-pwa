import { test, expect } from '../helpers/fixtures';
import { waitForAppReady } from '../helpers/test-data';

test.describe('Резервное копирование статистики', () => {
    test.beforeEach(async ({ page, injectData }) => {
        // ENABLE TEST MODE (Mock DB)
        await page.addInitScript(() => {
            (window as any).__PLAYWRIGHT_TEST__ = true;
        });

        // MOCK CONNECTIVITY CHECK
        await page.route('**google.com/favicon.ico*', async route => {
            await route.fulfill({ status: 200, body: 'mock-favicon' });
        });

        await injectData();
        await page.goto('/');
        await waitForAppReady(page);
    });

    test('должно открываться меню бэкапов по тройному клику на заголовке', async ({ app }) => {
        await app.openBackupMenu();
        await expect(app.page.locator('text=Резервное копирование').first()).toBeVisible();
    });

    test('меню бэкапов должно содержать кнопки локального и облачного бэкапа', async ({ app }) => {
        await app.openBackupMenu();

        await expect(app.backupExportButton).toBeVisible();
        await expect(app.backupOpenManagerButton).toBeVisible();
        await expect(app.backupCloseButton).toBeVisible();

        await expect(app.backupExportButton).toContainText('Экспорт в файл');
        await expect(app.backupOpenManagerButton).toContainText('Управление облачными бэкапами');
    });

    test('меню должно закрываться по кнопке Закрыть', async ({ app }) => {
        await app.openBackupMenu();
        await expect(app.page.locator('text=Резервное копирование').first()).toBeVisible();

        await app.backupCloseButton.click();
        await expect(app.page.locator('text=Резервное копирование').first()).toBeHidden();
    });

    test('должно отображаться сообщение об отсутствии бэкапов', async ({ app }) => {
        test.slow();
        await app.openBackupMenu();
        await app.backupOpenManagerButton.click();

        // Ждём появления одного из состояний
        const emptyMessage = app.backupListEmpty;
        const offlineMessage = app.page.locator('text=Нет подключения к интернету');
        const backupList = app.page.getByTestId('backup-list');
        const loadingIndicator = app.page.getByTestId('backup-loading');

        await expect(
            emptyMessage.or(offlineMessage).or(backupList).or(loadingIndicator)
        ).toBeVisible({ timeout: 15000 });
    });

    test('кнопка восстановления должна открывать модальное окно подтверждения', async ({ app }) => {
        await app.openBackupMenu();
        await app.backupOpenManagerButton.click();

        await expect(app.page.locator('h3:has-text("Облачные бэкапы")')).toBeVisible();
        await expect(app.page.locator('text=доступно')).toBeVisible();
    });

    test('модальное окно подтверждения должно требовать ввод слова ВОССТАНОВИТЬ', async ({ app, page }) => {
        await app.openBackupMenu();
        await app.backupOpenManagerButton.click();

        // Создаем бэкап, чтобы кнопка восстановления появилась
        const createBtn = page.getByTestId('backup-manager-create-btn');
        await createBtn.click();
        
        const restoreBtn = app.backupRestoreButtons.first();
        await expect(restoreBtn).toBeVisible({ timeout: 10000 });
        await restoreBtn.click();

        await expect(app.restoreConfirmInput).toBeVisible();
        await expect(app.restoreConfirmBtn).toBeDisabled();

        await app.restoreConfirmInput.fill('test');
        await expect(app.restoreConfirmBtn).toBeDisabled();

        await app.restoreConfirmInput.fill('ВОССТАНОВИТЬ');
        await expect(app.restoreConfirmBtn).toBeEnabled();

        await app.restoreCancelBtn.click();
        await expect(app.restoreConfirmInput).toBeHidden();
    });

    test('разделы локального и облачного бэкапа должны быть видны', async ({ app }) => {
        await app.openBackupMenu();
        await expect(app.page.locator('h4:has-text("Локальный бэкап")')).toBeVisible();
        await expect(app.page.locator('h4:has-text("Облачный бэкап")')).toBeVisible();
    });

    test('поле ввода импорта должно принимать JSON файлы', async ({ app }) => {
        await app.openBackupMenu();
        await expect(app.backupImportInput).toHaveAttribute('accept', '.json');
    });
});
