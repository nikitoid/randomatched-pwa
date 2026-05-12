import { test as base } from '@playwright/test';
import { RandoMatchedApp } from './page-objects';
import { injectTestData, HeroList, TEST_LIST_PRIMARY } from './test-data';

// Определение типов для наших фикстур
type MyFixtures = {
    app: RandoMatchedApp;
    injectData: (lists?: HeroList[]) => Promise<void>;
};

// Создаем расширенный объект test
export const test = base.extend<MyFixtures>({
    // Фикстура для главного объекта приложения
    app: async ({ page }, use) => {
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
export async function injectMatchHistory(page: any, history: any[]) {
    await page.context().addInitScript((historyData: any[]) => {
        localStorage.setItem('randomatched_match_history_v1', JSON.stringify(historyData));
    }, history);
}

export { expect } from '@playwright/test';
