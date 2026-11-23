import { test as base, type Page } from '@playwright/test';
import { RandoMatchedApp } from './page-objects';
import { injectTestData, mockExternalFonts, HeroList, TEST_LIST_PRIMARY } from './test-data';
import type { MatchRecord } from '../../types';

// Определение типов для наших фикстур
type MyFixtures = {
    app: RandoMatchedApp;
    injectData: (lists?: HeroList[]) => Promise<void>;
};

// Создаем расширенный объект test
export const test = base.extend<MyFixtures>({
    // Фикстура для главного объекта приложения
    app: async ({ page }, use) => {
        await mockExternalFonts(page);
        const app = new RandoMatchedApp(page);
        await use(app);
    },

    // Фикстура-хелпер для инъекции данных
    injectData: async ({ page }, use) => {
        const injector = async (lists: HeroList[] = [TEST_LIST_PRIMARY]) => {
            await injectTestData(page, lists);
        };
        await use(injector);
    },
});

/**
 * Инъекция истории матчей
 */
export async function injectMatchHistory(page: Page, history: MatchRecord[]) {
    await page.context().addInitScript((historyData: MatchRecord[]) => {
        localStorage.setItem('randomatched_match_history_v1', JSON.stringify(historyData));
    }, history);
}

export { expect } from '@playwright/test';
