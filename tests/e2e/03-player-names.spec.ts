import { test, expect } from '@playwright/test';
import { injectTestData, injectPlayerNames, waitForAppReady } from '../helpers/test-data';
import { RandoMatchedApp } from '../helpers/page-objects';

test.describe('Ввод имен игроков', () => {
    let app: RandoMatchedApp;

    test.beforeEach(async ({ page }) => {
        app = new RandoMatchedApp(page);
        await injectTestData(page);
        await page.goto('/');
        await waitForAppReady(page);
    });

    test('должна сохраняться возможность работы без имен игроков', async () => {
        // Проверяем, что кнопка генерации доступна даже без имен
        await expect(app.generateButton).toBeEnabled();
    });

    test('должны сохраняться введенные имена', async ({ page }) => {
        // Инъектируем имена
        await injectPlayerNames(page);

        // Проверяем, что имена сохранились в localStorage
        const savedTeams = await app.getLocalStorageItem('randomatched_saved_teams_v1');
        expect(savedTeams).toBeTruthy();
    });

    test('должна быть возможность генерации с именами игроков', async ({ page }) => {
        // Инъектируем имена
        await injectPlayerNames(page);
        await page.reload();
        await waitForAppReady(page);

        // Проверяем, что кнопка генерации активна
        await expect(app.generateButton).toBeEnabled();
    });
});
