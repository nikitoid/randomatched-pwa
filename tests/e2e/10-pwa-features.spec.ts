import { test, expect } from '@playwright/test';
import { injectTestData, waitForAppReady } from '../helpers/test-data';
import { RandoMatchedApp } from '../helpers/page-objects';

test.describe('PWA функции', () => {
    let app: RandoMatchedApp;

    test.beforeEach(async ({ page }) => {
        app = new RandoMatchedApp(page);
        await injectTestData(page);
        await page.goto('/');
        await waitForAppReady(page);
    });

    test('должна сохраняться работоспособность через localStorage', async () => {
        // Проверяем, что данные сохранены в localStorage
        const lists = await app.getLocalStorageItem('randomatched_lists_v1');
        expect(lists).toBeTruthy();
        expect(lists.length).toBeGreaterThan(0);
    });

    test('должно сохраняться состояние после перезагрузки страницы', async ({ page }) => {
        // Перезагружаем страницу
        await page.reload();
        await waitForAppReady(page);

        // Проверяем, что данные все еще на месте
        const lists = await app.getLocalStorageItem('randomatched_lists_v1');
        expect(lists).toBeTruthy();
        expect(lists.length).toBeGreaterThan(0);

        // Проверяем, что список все еще выбран
        const listName = await app.sourceSelectorText.textContent();
        expect(listName).toContain('Тестовый список 1');
    });

    test('должна корректно работать с localStorage', async () => {
        // Проверяем корректность сохранения различных настроек
        const theme = await app.getLocalStorageItem('theme');
        const colorScheme = await app.getLocalStorageItem('colorScheme');
        const lists = await app.getLocalStorageItem('randomatched_lists_v1');

        expect(theme).toBe('dark');
        expect(colorScheme).toBe('indigo');
        expect(lists).toBeTruthy();
    });

    test('должна сохраняться история матчей в localStorage', async ({ page }) => {
        // Генерируем команду
        await app.clickGenerate();

        // Проверяем наличие истории
        const history = await app.getLocalStorageItem('matchHistory');
        expect(history).toBeDefined();
    });
});
