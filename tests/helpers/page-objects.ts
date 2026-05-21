import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Objects для RandoMatched App
 * Основаны на реальной DOM-структуре приложения
 */

/**
 * Главный класс для работы с приложением
 */
export class RandoMatchedApp {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    // --- Локаторы основных элементов ---
    get header() { return this.page.locator('header'); }
    get appTitle() { return this.page.getByRole('heading', { name: /Randomatched/i }); }
    get themeToggle() { return this.page.getByTestId('theme-toggle'); }
    get namesToggle() { return this.page.getByRole('button', { name: 'Имена игроков' }); }
    get navigation() { return this.page.locator('nav'); }

    // Кнопки навигации
    get statsButton() { return this.page.getByRole('button', { name: 'Статистика' }); }
    get historyButton() { return this.page.getByRole('button', { name: 'История' }); }
    get listsButton() { return this.page.getByRole('button', { name: 'Списки' }); }
    get settingsButton() { return this.page.getByRole('button', { name: 'Настройки' }); }

    // Элементы управления на главной
    get sourceSelector() {
        return this.page.locator('label:has-text("Источник героев")')
            .locator('..')
            .locator('button').first();
    }
    get sourceSelectorText() {
        return this.sourceSelector.locator('h2');
    }
    get generateButton() { return this.page.getByRole('button', { name: 'ГЕНЕРИРОВАТЬ' }); }
    get resetButton() { return this.page.getByTestId('reset-session-button'); }

    // --- Локаторы статистики ---
    get statsModal() { return this.page.getByTestId('stats-modal'); }
    get statsTitle() { return this.page.getByTestId('stats-title'); }
    get backupExportButton() { return this.page.getByTestId('backup-export-btn'); }
    get backupImportInput() { return this.page.getByTestId('backup-import-input'); }
    get backupOpenManagerButton() { return this.page.getByTestId('backup-open-manager-btn'); }
    get backupCloseButton() { return this.page.getByTestId('backup-close-btn'); }
    get statsCloseButton() { return this.page.getByTestId('stats-close-btn'); }

    // --- Локаторы облачных бэкапов ---
    get backupManager() { return this.page.locator('h3:has-text("Облачные бэкапы")').locator('..'); }
    get backupListEmpty() { return this.page.getByTestId('backup-list-empty'); }
    get backupRestoreButtons() { return this.page.getByTestId('backup-manager-restore-btn'); }
    get restoreConfirmInput() { return this.page.getByTestId('restore-confirm-input'); }
    get restoreConfirmBtn() { return this.page.getByTestId('restore-confirm-btn'); }
    get restoreCancelBtn() { return this.page.getByTestId('restore-cancel-btn'); }

    // --- Методы взаимодействия ---

    async getLocalStorageItem(key: string): Promise<any> {
        const value = await this.page.evaluate((k) => localStorage.getItem(k), key);
        if (!value) return null;
        try {
            return JSON.parse(value);
        } catch (e) {
            return value;
        }
    }

    async clickGenerate() {
        await this.generateButton.click();
    }

    async openBackupMenu() {
        await this.statsButton.click();
        const title = this.statsTitle;
        // Тройной клик для открытия скрытого меню данных
        await title.click({ clickCount: 3 });
    }

    async isDarkTheme(): Promise<boolean> {
        const html = this.page.locator('html');
        return (await html.getAttribute('class'))?.includes('dark') ?? false;
    }

    async waitForReady() {
        await this.page.waitForSelector('main', { state: 'visible' });
        // Вместо таймаута ждем, пока кнопка генерации станет доступной
        await this.generateButton.waitFor({ state: 'visible' });
    }

    async openSettings() {
        await this.settingsButton.click();
        await this.page.locator('h2:has-text("Настройки")').waitFor({ state: 'visible' });
    }

    async closeSettings() {
        const closeButton = this.page.getByTestId('settings-close-btn');

        await closeButton.waitFor({ state: 'visible' });
        await closeButton.click();
        await closeButton.waitFor({ state: 'hidden' });
    }

    async openLists() {
        await this.listsButton.click();
        await this.page.locator('h2:has-text("Списки героев")').waitFor({ state: 'visible' });
    }

    async closeLists() {
        const closeButton = this.page.getByTestId('lists-close-btn');

        await closeButton.waitFor({ state: 'visible' });
        await closeButton.click();
        await closeButton.waitFor({ state: 'hidden' });
    }

    async closeResultOverlay() {
        const overlay = this.page.getByTestId('result-overlay');
        // Ждем появления (учитывая анимацию 400мс в приложении)
        await overlay.waitFor({ state: 'visible', timeout: 10000 });
        
        // Даем анимации завершиться
        await this.page.waitForTimeout(500);

        const closeBtn = this.page.getByTestId('close-result-overlay');
        if (await closeBtn.isVisible()) {
            await closeBtn.click();
        } else {
            await this.page.keyboard.press('Escape');
        }
        
        // Ждем скрытия
        await overlay.waitFor({ state: 'hidden', timeout: 10000 });
    }

    async revealHeroes() {
        const centerBtn = this.page.getByTestId('center-action-button');
        await centerBtn.waitFor({ state: 'visible' });
        await centerBtn.click();
    }

    async recordMatch(winnerTeam: 1 | 2 = 1) {
        // Нажимаем "Завершить"
        const finishBtn = this.page.getByTestId('finish-match-btn');
        await finishBtn.waitFor({ state: 'visible' });
        await finishBtn.click();
        
        // Выбираем победителя в модалке
        const teamBtn = winnerTeam === 1 
            ? this.page.getByTestId('record-team1-win-btn')
            : this.page.getByTestId('record-team2-win-btn');
        
        await teamBtn.waitFor({ state: 'visible' });
        await teamBtn.click();
    }

    async toggleTheme() {
        const currentTheme = await this.isDarkTheme();
        await this.themeToggle.click();
        
        // Если была темная, ждем удаления класса dark. Если была светлая, ждем добавления.
        if (currentTheme) {
            await expect(this.page.locator('html')).not.toHaveClass(/dark/);
        } else {
            await expect(this.page.locator('html')).toHaveClass(/dark/);
        }
    }

    // --- Хэлперы для ввода данных ---
    async fillPlayerName(index: number, name: string) {
        const input = this.page.getByPlaceholder(/Введите имя|Игрок \d/).nth(index);
        await input.fill(name);
    }
}
