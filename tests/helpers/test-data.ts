import { Hero, HeroList } from '../../types';

/**
 * Тестовые данные для E2E тестов
 */

// Тестовые имена игроков
export const TEST_PLAYER_NAMES = [
    'Алекс',
    'Борис',
    'Виктор',
    'Григорий',
    'Дмитрий',
    'Евгений',
    'Иван',
    'Константин',
    'Михаил',
    'Николай',
];

// Тестовые герои для списка
export const TEST_HEROES: Hero[] = [
    { id: 'hero-1', name: 'Герой S+', rank: 'S+' },
    { id: 'hero-2', name: 'Герой S-', rank: 'S-' },
    { id: 'hero-3', name: 'Герой A+', rank: 'A+' },
    { id: 'hero-4', name: 'Герой A-', rank: 'A-' },
    { id: 'hero-5', name: 'Герой B+', rank: 'B+' },
    { id: 'hero-6', name: 'Герой B-', rank: 'B-' },
    { id: 'hero-7', name: 'Герой C+', rank: 'C+' },
    { id: 'hero-8', name: 'Герой C-', rank: 'C-' },
    { id: 'hero-9', name: 'Герой D+', rank: 'D+' },
    { id: 'hero-10', name: 'Герой D-', rank: 'D-' },
    { id: 'hero-11', name: 'Герой E+', rank: 'E+' },
    { id: 'hero-12', name: 'Герой E-', rank: 'E-' },
];

// Дополнительные герои для второго списка
export const TEST_HEROES_SECONDARY: Hero[] = [
    { id: 'hero-s1', name: 'Боец S+', rank: 'S+' },
    { id: 'hero-s2', name: 'Боец S-', rank: 'S-' },
    { id: 'hero-s3', name: 'Боец A+', rank: 'A+' },
    { id: 'hero-s4', name: 'Боец A-', rank: 'A-' },
    { id: 'hero-s5', name: 'Боец B+', rank: 'B+' },
    { id: 'hero-s6', name: 'Боец B-', rank: 'B-' },
    { id: 'hero-s7', name: 'Боец C+', rank: 'C+' },
    { id: 'hero-s8', name: 'Боец C-', rank: 'C-' },
];

// Тестовые списки героев
export function createTestList(id: string, name: string, heroes: Hero[] = TEST_HEROES): HeroList {
    return {
        id,
        name,
        heroes: [...heroes],
        isLocal: true,
        isCloud: false,
        isTemporary: false,
        isGroupable: true,
        lastModified: Date.now(),
    };
}

// Основной тестовый список
export const TEST_LIST_PRIMARY: HeroList = createTestList(
    'test-list-1',
    'Тестовый список 1',
    TEST_HEROES
);

// Второй тестовый список для группового режима
export const TEST_LIST_SECONDARY: HeroList = createTestList(
    'test-list-2',
    'Тестовый список 2',
    TEST_HEROES_SECONDARY
);

/**
 * Инъекция тестовых данных в localStorage
 * ВАЖНО: должна вызываться ПЕРЕД page.goto()
 * Данные устанавливаются через addInitScript на контексте
 */
export async function injectTestData(page: any, lists: HeroList[] = [TEST_LIST_PRIMARY]) {
    // Используем addInitScript на контексте браузера - это выполняется ДО загрузки любой страницы
    await page.context().addInitScript((listsData: HeroList[]) => {
        // ПРАВИЛЬНЫЕ КЛЮЧИ localStorage (из хуков приложения)
        // Сохраняем списки героев
        localStorage.setItem('randomatched_lists_v1', JSON.stringify(listsData));

        // Тема и цветовая схема (хранятся напрямую, не в JSON)
        localStorage.setItem('theme', 'dark');
        localStorage.setItem('colorScheme', 'indigo');

        // Haptics
        localStorage.setItem('randomatched_haptics_enabled_v1', 'true');

        // Очищаем историю матчей для чистого старта
        localStorage.setItem('randomatched_match_history_v1', JSON.stringify([]));
        localStorage.setItem('randomatched_deleted_matches_v1', JSON.stringify([]));
        localStorage.setItem('randomatched_deleted_history_content_v1', JSON.stringify([]));

        // Очищаем сохраненные команды
        localStorage.setItem('randomatched_saved_teams_v1', JSON.stringify([]));
        localStorage.setItem('randomatched_player_names_v1', JSON.stringify([]));

        // Очищаем последнюю сессию
        localStorage.removeItem('randomatched_last_session_v1');
    }, lists);
}

/**
 * Инъекция имен игроков
 */
export async function injectPlayerNames(page: any, names: string[] = TEST_PLAYER_NAMES) {
    await page.evaluate((playerNames: string[]) => {
        const savedTeams = [playerNames];
        localStorage.setItem('randomatched_saved_teams_v1', JSON.stringify(savedTeams));
        localStorage.setItem('randomatched_player_names_v1', JSON.stringify(playerNames));
    }, names);
}

/**
 * Очистка всех данных из localStorage
 */
export async function clearTestData(page: any) {
    await page.evaluate(() => {
        localStorage.clear();
    });
}

/**
 * Получение текущих списков из localStorage
 */
export function getStoredLists(page: any): Promise<HeroList[]> {
    return page.evaluate(() => {
        const data = localStorage.getItem('randomatched_lists_v1');
        return data ? JSON.parse(data) : [];
    });
}

/**
 * Получение истории матчей из localStorage
 */
export function getMatchHistory(page: any) {
    return page.evaluate(() => {
        const data = localStorage.getItem('randomatched_match_history_v1');
        return data ? JSON.parse(data) : [];
    });
}

/**
 * Ожидание загрузки приложения
 */
export async function waitForAppReady(page: any) {
    // Ждем появления основного контента
    await page.waitForSelector('main', { state: 'visible' });

    // Даем время на инициализацию React и загрузку данных из localStorage
    await page.waitForTimeout(2000);

    // Явно ждем, пока кнопка генерации станет enabled (до 10 секунд)
    // Это критически важно, т.к. кнопка disabled пока не загрузятся данные из localStorage
    try {
        await page.waitForSelector('button:has-text("ГЕНЕРИРОВАТЬ"):not([disabled])', {
            state: 'visible',
            timeout: 10000
        });
    } catch (error) {
        console.warn('Кнопка генерации не стала enabled за 10 секунд, продолжаем...');
    }
}
