import { Page, Locator } from '@playwright/test';

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

    // Основные элементы приложения
    get header() {
        return this.page.locator('header');
    }

    get appTitle() {
        return this.page.locator('h1:has-text("Random")');
    }

    get themeToggle() {
        // Используем aria-label для поиска кнопки темы
        return this.page.locator('button[aria-label="Переключить тему"]');
    }

    get navigation() {
        return this.page.locator('nav');
    }

    // Кнопки навигации
    get statsButton() {
        return this.page.locator('button:has-text("Статистика")');
    }

    get historyButton() {
        return this.page.locator('button:has-text("История")');
    }

    get settingsButton() {
        return this.page.locator('button:has-text("Настройки")');
    }

    // Source Selector (выбор списка)
    get sourceSelector() {
        // Ищем кнопку после label "Источник героев"
        return this.page.locator('label:has-text("Источник героев")').locator('..').locator('button').first();
    }

    get sourceSelectorText() {
        // Упрощенный селектор - ищем h2 внутри кнопки источника
        return this.sourceSelector.locator('h2');
    }

    // Главная кнопка генерации
    get generateButton() {
        return this.page.locator('button:has-text("ГЕНЕРИРОВАТЬ")');
    }

    get resetButton() {
        return this.page.locator('button:has-text("Сбросить сессию")');
    }

    // Проверка темы
    async isDarkTheme(): Promise<boolean> {
        const html = this.page.locator('html');
        const className = await html.getAttribute('class');
        return className?.includes('dark') ?? false;
    }

    // Ожидание готовности приложения
    async waitForReady() {
        await this.page.waitForSelector('main', { state: 'visible' });
        // Увеличено до 2 сек для надежной загрузки
        await this.page.waitForTimeout(2000);
    }

    // Открыть панель настроек
    async openSettings() {
        await this.settingsButton.click();
        await this.page.waitForTimeout(500);
    }

    // Закрыть панель настроек (клик вне или на кнопку закрытия)
    async closeSettings() {
        const closeButton = this.page.locator('button[aria-label="Закрыть настройки"]').or(
            this.page.locator('button:has-text("Закрыть")').first()
        );

        if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
            await closeButton.click();
        } else {
            // Клик в область за пределами панели
            await this.page.locator('body').click({ position: { x: 10, y: 10 } });
        }
        await this.page.waitForTimeout(500);
    }

    // Закрыть оверлей результатов генерации (Escape для надежности)
    async closeResultOverlay() {
        // Используем Escape для закрытия - теперь обрабатывается в ResultOverlay
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(500);
    }

    // Переключить тему
    async toggleTheme() {
        await this.themeToggle.click();
        await this.page.waitForTimeout(500);
    }

    // Нажать кнопку генерации
    async clickGenerate() {
        // Явно ждем, пока кнопка станет enabled before клика
        await this.generateButton.waitFor({ state: 'visible', timeout: 10000 });
        await this.page.waitForSelector('button:has-text("ГЕНЕРИРОВАТЬ"):not([disabled])', {
            timeout: 10000
        });
        await this.generateButton.click();
        await this.page.waitForTimeout(500);
    }

    // Получить localStorage данные
    async getLocalStorageItem(key: string): Promise<any> {
        return this.page.evaluate((k) => {
            const item = localStorage.getItem(k);
            if (!item) return null;

            // Пытаемся распарсить как JSON, если не получается - возвращаем как есть
            try {
                return JSON.parse(item);
            } catch {
                return item;
            }
        }, key);
    }

    // Установить localStorage данные
    async setLocalStorageItem(key: string, value: any) {
        await this.page.evaluate(
            ({ k, v }) => {
                if (typeof v === 'string') {
                    localStorage.setItem(k, v);
                } else {
                    localStorage.setItem(k, JSON.stringify(v));
                }
            },
            { k: key, v: value }
        );
    }
}
