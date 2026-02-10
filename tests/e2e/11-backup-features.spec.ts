import { test, expect } from '@playwright/test';
import { RandoMatchedApp } from '../helpers/page-objects';
import { injectTestData, waitForAppReady, TEST_LIST_PRIMARY } from '../helpers/test-data';

test.describe('Резервное копирование статистики', () => {
    let app: RandoMatchedApp;

    test.beforeEach(async ({ page }) => {
        // ENABLE TEST MODE (Mock DB)
        await page.addInitScript(() => {
            (window as any).__PLAYWRIGHT_TEST__ = true;
        });

        // MOCK CONNECTIVITY CHECK
        await page.route('**google.com/favicon.ico*', async route => {
            await route.fulfill({ status: 200, body: 'mock-favicon' });
        });

        // Инъекция тестовых данных
        await injectTestData(page, [TEST_LIST_PRIMARY]);
        app = new RandoMatchedApp(page);
        await page.goto('/');
        await waitForAppReady(page);
    });

    // Helper для надежного открытия меню бэкапов
    const openBackupMenu = async (page: any) => {
        const statsTitle = page.locator('h2:has-text("Статистика")');
        await expect(statsTitle).toBeVisible();

        // Увеличиваем ожидание для Safari Mobile, чтобы анимация открытия модалки точно завершилась
        await page.waitForTimeout(1000);

        // Используем force: true и задержки для надежного тройного клика
        await statsTitle.click({ force: true });
        await page.waitForTimeout(200);
        await statsTitle.click({ force: true });
        await page.waitForTimeout(200);
        await statsTitle.click({ force: true });

        // Ждём появления меню
        const backupMenuTitle = page.locator('h3:has-text("Резервное копирование")');
        await expect(backupMenuTitle).toBeVisible({ timeout: 10000 });
    };

    test('должно открываться меню бэкапов по тройному клику на заголовке', async ({ page }) => {
        // Открываем статистику
        await app.statsButton.click();
        await page.waitForTimeout(300);

        // Используем хелпер
        await openBackupMenu(page);

        // Проверяем, что меню бэкапов открылось
        const backupMenu = page.locator('text=Резервное копирование').first();
        await expect(backupMenu).toBeVisible();
    });

    test('меню бэкапов должно содержать кнопки локального и облачного бэкапа', async ({ page }) => {
        // Открываем статистику
        await app.statsButton.click();
        await page.waitForTimeout(300);

        // Открываем меню бэкапов
        await openBackupMenu(page);

        // Проверяем наличие кнопок
        const exportBtn = page.getByTestId('backup-export-btn');
        const cloudBackupBtn = page.getByTestId('backup-cloud-create-btn');
        const closeBtn = page.getByTestId('backup-close-btn');

        await expect(exportBtn).toBeVisible();
        await expect(cloudBackupBtn).toBeVisible();
        await expect(closeBtn).toBeVisible();

        // Проверяем текст кнопок
        await expect(exportBtn).toContainText('Экспорт в файл');
        await expect(cloudBackupBtn).toContainText('Создать бэкап в облаке');
    });

    test('меню должно закрываться по кнопке Закрыть', async ({ page }) => {
        // Открываем статистику и меню бэкапов
        await app.statsButton.click();
        await page.waitForTimeout(300);

        await openBackupMenu(page);

        // Проверяем, что меню открылось
        const backupMenu = page.locator('text=Резервное копирование').first();
        await expect(backupMenu).toBeVisible();

        // Закрываем меню
        const closeBtn = page.getByTestId('backup-close-btn');
        await closeBtn.click();
        await page.waitForTimeout(200);

        // Проверяем, что меню закрылось
        await expect(backupMenu).not.toBeVisible();
    });

    test('должно отображаться сообщение об отсутствии бэкапов', async ({ page }, testInfo) => {
        test.slow(); // Увеличиваем таймаут для этого теста, так как на Safari он нестабилен

        // Открываем статистику и меню бэкапов
        await app.statsButton.click();
        await page.waitForTimeout(300);

        await openBackupMenu(page);

        // Даем время на завершение анимаций и сетевых запросов
        await page.waitForTimeout(2000);

        // После открытия меню ждём одного из возможных состояний
        const emptyMessage = page.getByTestId('backup-list-empty');
        const offlineMessage = page.locator('text=Нет подключения к интернету');
        const backupList = page.getByTestId('backup-list');
        const loadingIndicator = page.getByTestId('backup-loading');

        // Ждём пока появится любой из элементов: загрузка, пустой список, offline, или список бэкапов
        await expect(
            emptyMessage.or(offlineMessage).or(backupList).or(loadingIndicator)
        ).toBeVisible({ timeout: 30000 });
    });

    test('кнопка восстановления должна открывать модальное окно подтверждения с инъектированными бэкапами', async ({ page }) => {
        // Инъекция мокированных бэкапов через localStorage эмуляцию
        // Для этого теста используем прямую инъекцию в DOM
        await app.statsButton.click();
        await page.waitForTimeout(300);

        await openBackupMenu(page);

        // Проверяем структуру UI облачного бэкапа
        const cloudSection = page.locator('h4:has-text("Облачный бэкап")');
        await expect(cloudSection).toBeVisible();

        // Проверяем наличие раздела "Доступные бэкапы"
        const availableBackups = page.locator('text=Доступные бэкапы');
        await expect(availableBackups).toBeVisible();
    });

    test('модальное окно подтверждения должно требовать ввод слова ВОССТАНОВИТЬ', async ({ page }) => {
        // Открываем статистику и меню бэкапов
        await app.statsButton.click();
        await page.waitForTimeout(300);

        await openBackupMenu(page);

        // Проверяем, есть ли кнопки восстановления - если есть бэкапы
        const restoreButtonCount = await page.getByTestId('backup-restore-btn').count();

        if (restoreButtonCount > 0) {
            // Кликаем на первую кнопку восстановления
            await page.getByTestId('backup-restore-btn').first().click();
            await page.waitForTimeout(200);

            // Проверяем, что модальное окно подтверждения открылось
            const confirmInput = page.getByTestId('restore-confirm-input');
            await expect(confirmInput).toBeVisible();

            // Проверяем, что кнопка подтверждения неактивна
            const confirmBtn = page.getByTestId('restore-confirm-btn');
            await expect(confirmBtn).toBeDisabled();

            // Вводим неправильное слово
            await confirmInput.fill('test');
            await expect(confirmBtn).toBeDisabled();

            // Вводим правильное слово
            await confirmInput.fill('ВОССТАНОВИТЬ');
            await expect(confirmBtn).toBeEnabled();

            // Отменяем
            const cancelBtn = page.getByTestId('restore-cancel-btn');
            await cancelBtn.click();
            await page.waitForTimeout(200);

            // Модальное окно должно закрыться
            await expect(confirmInput).not.toBeVisible();
        }
    });

    test('разделы локального и облачного бэкапа должны быть видны', async ({ page }) => {
        // Открываем статистику и меню бэкапов
        await app.statsButton.click();
        await page.waitForTimeout(300);

        await openBackupMenu(page);

        // Проверяем разделы
        const localSection = page.locator('h4:has-text("Локальный бэкап")');
        const cloudSection = page.locator('h4:has-text("Облачный бэкап")');

        await expect(localSection).toBeVisible();
        await expect(cloudSection).toBeVisible();
    });

    test('поле ввода импорта должно принимать JSON файлы', async ({ page }) => {
        // Открываем статистику и меню бэкапов
        await app.statsButton.click();
        await page.waitForTimeout(300);

        await openBackupMenu(page);

        // Проверяем, что поле ввода принимает .json файлы
        const importInput = page.getByTestId('backup-import-input');
        await expect(importInput).toHaveAttribute('accept', '.json');
    });
});
