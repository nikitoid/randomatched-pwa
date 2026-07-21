import { Hero, HeroList } from '../../types';
import { APP_VERSION } from '../../utils/changelog';
export type { Hero, HeroList };

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
export async function injectTestData(page: any, lists: HeroList[] = [TEST_LIST_PRIMARY], appVersion: string = APP_VERSION) {
    // Используем addInitScript на контексте браузера - это выполняется ДО загрузки любой страницы
    await page.context().addInitScript(([listsData, version]: [HeroList[], string]) => {
        // Отключаем CSS-анимации и переходы для мгновенного выполнения E2E тестов
        const disableAnimations = () => {
            if (!document.head) return;
            const style = document.createElement('style');
            style.setAttribute('type', 'text/css');
            style.innerHTML = `
                *, *::before, *::after {
                    animation-duration: 0s !important;
                    animation-delay: 0s !important;
                    transition-duration: 0s !important;
                    transition-delay: 0s !important;
                }
            `;
            document.head.appendChild(style);
        };
        if (document.readyState === 'loading') {
            window.addEventListener('DOMContentLoaded', disableAnimations);
        } else {
            disableAnimations();
        }

        // ПРАВИЛЬНЫЕ КЛЮЧИ localStorage (из хуков приложения)
        // Сохраняем списки героев
        localStorage.setItem('randomatched_lists_v1', JSON.stringify(listsData));
        localStorage.setItem('randomatched_last_seen_version', version);

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
    }, [lists, appVersion]);
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

    // Вместо жесткого ожидания в 2 секунды, ждем пока исчезнет лоадер (если он есть) 
    // или пока кнопка генерации не станет кликабельной.
    // Это делает тесты быстрее на мощных машинах и надежнее на слабых.
    await page.waitForSelector('button:has-text("СГЕНЕРИРОВАТЬ"):not([disabled])', {
        state: 'visible',
        timeout: 15000
    });
}
