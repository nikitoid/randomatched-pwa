import { test, expect } from '../helpers/fixtures';
import { waitForAppReady } from '../helpers/test-data';

// Тестовая история для проверки сезонов (с явной таймзоной +04:00)
const MOCK_HISTORY = [
    {
        id: 'match-1',
        timestamp: new Date('2026-05-15T12:00:00+04:00').getTime(),
        team1: [{ name: 'Алекс', heroName: 'Герой S+' }, { name: 'Борис', heroName: 'Герой S-' }],
        team2: [{ name: 'Виктор', heroName: 'Герой A+' }, { name: 'Григорий', heroName: 'Герой A-' }],
        winner: 'team1'
    },
    {
        id: 'match-2',
        timestamp: new Date('2026-05-20T15:00:00+04:00').getTime(),
        team1: [{ name: 'Алекс', heroName: 'Герой S+' }, { name: 'Виктор', heroName: 'Герой A+' }],
        team2: [{ name: 'Борис', heroName: 'Герой S-' }, { name: 'Григорий', heroName: 'Герой A-' }],
        winner: 'team2'
    },
    {
        id: 'match-3',
        timestamp: new Date('2026-01-10T18:00:00+04:00').getTime(), // Матч в январе 2026
        team1: [{ name: 'Борис', heroName: 'Герой S-' }, { name: 'Виктор', heroName: 'Герой A+' }],
        team2: [{ name: 'Алекс', heroName: 'Герой S+' }, { name: 'Григорий', heroName: 'Герой A-' }],
        winner: 'team1'
    }
];

test.describe('Управление сезонами и статистика', () => {
    test.beforeEach(async ({ page, injectData }) => {
        await injectData();
        await page.context().addInitScript((data) => {
            localStorage.setItem('randomatched_match_history_v1', JSON.stringify(data));
            localStorage.removeItem('randomatched_seasons_v1');
        }, MOCK_HISTORY);
    });

    test('по умолчанию при отсутствии сезонов выбирается "Все время" и кнопка сброса скрыта', async ({ app, page }) => {
        await page.goto('/');
        await waitForAppReady(page);

        await app.statsButton.click();
        await expect(app.statsModal).toBeVisible();

        // Раскрываем период
        await page.click('text=Период: Все время');

        // Кнопки сбросить по умолчанию нет
        await expect(page.getByTestId('reset-date-filter-btn')).toBeHidden();

        // Отображаются все 3 матча
        await expect(page.locator('text=Всего матчей').locator('..')).toContainText('3');
    });

    test('создание нового сезона и динамическая фильтрация', async ({ app, page }) => {
        await page.goto('/');
        await waitForAppReady(page);

        await app.statsButton.click();
        await expect(app.statsModal).toBeVisible();

        // Открываем панель периода и кликаем "Настройка сезонов"
        await page.click('text=Период: Все время');
        await page.click('button:has-text("Настройка сезонов")');

        // Модалка управления сезонами должна отображаться
        await expect(page.locator('h3:has-text("Управление сезонами")')).toBeVisible();

        // Создаем новый сезон без даты окончания (действующий текущий сезон от 1 мая 2026)
        await page.click('button:has-text("Создать новый сезон")');
        await page.getByTestId('season-name-input').fill('Майский сезон');
        await page.getByTestId('season-start-date-input').fill('2026-05-01');
        await page.click('button[type="submit"]:has-text("Сохранить")');

        // Закрываем управление сезонами
        await page.getByTestId('close-seasons-manager-btn').click();

        // Переключаемся на чипсу сезона "Майский сезон"
        await page.locator('button[data-season-name="Майский сезон"]').click();

        // Проверяем, что в плашке вывелось имя сезона "Майский сезон"
        await expect(page.locator('text=Период: Майский сезон')).toBeVisible();

        // Матчей от 1 мая — 2 (15 мая и 20 мая, а январь 2026 не входит)
        await expect(page.locator('text=Всего матчей').locator('..')).toContainText('2');
    });

    test('редактирование сезона динамически обновляет значения в инпутах дат', async ({ app, page }) => {
        // Заранее инъектируем созданный активный сезон без даты окончания
        await page.context().addInitScript(() => {
            const season = [{ id: 's1', name: 'Летний Сезон', startDate: '2026-06-01' }];
            localStorage.setItem('randomatched_seasons_v1', JSON.stringify(season));
        });

        await page.goto('/');
        await waitForAppReady(page);

        await app.statsButton.click();
        await expect(app.statsModal).toBeVisible();

        await page.click('text=Период: Летний Сезон');

        // Проверяем начальное значение даты начала
        const startInput = page.locator('input[type="date"]').first();
        await expect(startInput).toHaveValue('2026-06-01');

        // Открываем редактирование сезона
        await page.click('button:has-text("Настройка сезонов")');
        await page.click('button[title="Редактировать сезон"]');

        // Меняем дату начала сезона на 2026-06-05
        await page.getByTestId('season-start-date-input').fill('2026-06-05');
        await page.click('button[type="submit"]:has-text("Сохранить")');

        // Закрываем окно сезонов
        await page.getByTestId('close-seasons-manager-btn').click();

        // Инпут с даты мгновенно поменялся на 2026-06-05
        await expect(startInput).toHaveValue('2026-06-05');
    });

    test('кнопка сброса сбрасывает к дефолтному сезону и скрывается', async ({ app, page }) => {
        await page.context().addInitScript(() => {
            const season = [{ id: 's1', name: 'Сезон 1', startDate: '2026-05-01' }];
            localStorage.setItem('randomatched_seasons_v1', JSON.stringify(season));
        });

        await page.goto('/');
        await waitForAppReady(page);

        await app.statsButton.click();
        await expect(app.statsModal).toBeVisible();

        await page.click('text=Период: Сезон 1');

        // Кнопка сбросить изначально не видна
        await expect(page.getByTestId('reset-date-filter-btn')).toBeHidden();

        // Переключаемся на "Все время"
        await page.click('button:has-text("Все время")');

        // Кнопка сбросить появляется, так как отклонились от Сезона 1
        await expect(page.getByTestId('reset-date-filter-btn')).toBeVisible();

        // Нажимаем сбросить
        await page.getByTestId('reset-date-filter-btn').click();

        // Фильтр вернулся к Сезону 1, кнопка сбросить скрылась
        await expect(page.locator('text=Период: Сезон 1')).toBeVisible();
        await expect(page.getByTestId('reset-date-filter-btn')).toBeHidden();
    });

    test('если дата окончания последнего сезона истекла, включается "Все время" и всплывает toast', async ({ app, page }) => {
        await page.context().addInitScript(() => {
            const season = [{ id: 'old-s', name: 'Истекший Сезон', startDate: '2025-01-01', endDate: '2025-12-31' }];
            localStorage.setItem('randomatched_seasons_v1', JSON.stringify(season));
        });

        await page.goto('/');
        await waitForAppReady(page);

        await app.statsButton.click();
        await expect(app.statsModal).toBeVisible();

        // По умолчанию выбирается "Все время" (так как последний сезон завершился в 2025 году)
        await expect(page.locator('text=Период: Все время')).toBeVisible();

        // Проверяем появление toast с уведомлением (используем first() во избежание дублирования локатора)
        await expect(page.locator('text=истек. Отображается статистика за все время.').first()).toBeVisible();
    });

    test('удаление сезона корректно удаляет сезон из списка', async ({ app, page }) => {
        await page.context().addInitScript(() => {
            const season = [{ id: 's-to-delete', name: 'Тестовый Сезон', startDate: '2026-01-01' }];
            localStorage.setItem('randomatched_seasons_v1', JSON.stringify(season));
        });

        await page.goto('/');
        await waitForAppReady(page);

        await app.statsButton.click();
        await expect(app.statsModal).toBeVisible();

        await page.click('text=Период: Тестовый Сезон');
        await page.click('button:has-text("Настройка сезонов")');

        // Кликаем по кнопке удаления
        await page.click('button[title="Удалить сезон"]');

        // Подтверждаем удаление по test-id
        await page.getByTestId('confirm-delete-season-btn').click();

        // Проверяем, что в списке отобразилось "Сезоны не созданы"
        await expect(page.locator('text=Сезоны не созданы')).toBeVisible();
    });

    test('редактирование сезона скрывает список сезонов и валидирует некорректную дату окончания', async ({ app, page }) => {
        await page.context().addInitScript(() => {
            const season = [{ id: 's-edit', name: 'Сезон для редактирования', startDate: '2026-06-01' }];
            localStorage.setItem('randomatched_seasons_v1', JSON.stringify(season));
        });

        await page.goto('/');
        await waitForAppReady(page);

        await app.statsButton.click();
        await page.click('text=Период: Сезон для редактирования');
        await page.click('button:has-text("Настройка сезонов")');

        // Открываем редактирование
        await page.click('button[title="Редактировать сезон"]');

        // Проверяем, что заголовок списка сезонов скрыт в режиме форматирования
        await expect(page.locator('text=Список сезонов')).toBeHidden();

        // Пробуем поставить дату окончания раньше даты начала
        await page.getByTestId('season-end-date-input').fill('2026-05-01');
        await page.click('button[type="submit"]:has-text("Сохранить")');

        // Должна появиться плашка с ошибкой и форма остаётся открытой
        await expect(page.locator('text=Дата окончания не может быть раньше даты начала')).toBeVisible();
        await expect(page.getByTestId('season-name-input')).toBeVisible();
    });

    test('ручной ввод невалидного периода отображает предупреждение об ошибке', async ({ app, page }) => {
        await page.goto('/');
        await waitForAppReady(page);

        await app.statsButton.click();
        await page.click('text=Период: Все время');

        // Устанавливаем дату с 2026-06-10 по 2026-06-01 (невалидный диапазон)
        const inputs = page.locator('div:has-text("Произвольные даты") + div input[type="date"]');
        await inputs.nth(0).fill('2026-06-10');
        await inputs.nth(1).fill('2026-06-01');

        // Проверяем выведение текста ошибки
        await expect(page.locator('text=Дата окончания не может быть раньше даты начала')).toBeVisible();
    });

    test('модалка создания сезона открывается с необходимыми полями и при отмене сохраняет окно управления сезонами', async ({ app, page }) => {
        await page.goto('/');
        await waitForAppReady(page);

        await app.statsButton.click();
        await expect(app.statsModal).toBeVisible();

        await page.click('text=Период: Все время');
        await page.click('button:has-text("Настройка сезонов")');

        // Модалка управления сезонами открыта
        await expect(page.locator('h3:has-text("Управление сезонами")')).toBeVisible();

        // Кликаем по кнопке создания нового сезона
        await page.click('button:has-text("Создать новый сезон")');

        // Проверяем поля формы создания
        await expect(page.locator('h3:has-text("Новый сезон")')).toBeVisible();
        await expect(page.getByTestId('season-name-input')).toBeVisible();
        await expect(page.getByTestId('season-start-date-input')).toBeVisible();
        await expect(page.getByTestId('season-end-date-input')).toBeVisible();
        await expect(page.locator('button[type="submit"]:has-text("Сохранить")')).toBeVisible();
        await expect(page.getByTestId('cancel-season-form-btn')).toBeVisible();

        // Отменяем создание по кнопке Отмена
        await page.getByTestId('cancel-season-form-btn').click();

        // Форма закрылась, а окно "Управление сезонами" остаётся открытым
        await expect(page.getByTestId('season-name-input')).toBeHidden();
        await expect(page.locator('h3:has-text("Управление сезонами")')).toBeVisible();
        await expect(app.statsModal).toBeVisible();
    });

    test('модалка редактирования сезона открывается с заполненными полями и при отмене возвращает к списку сезонов', async ({ app, page }) => {
        await page.context().addInitScript(() => {
            const season = [{ id: 's1', name: 'Осенний Сезон', startDate: '2026-09-01', endDate: '2026-11-30' }];
            localStorage.setItem('randomatched_seasons_v1', JSON.stringify(season));
        });

        await page.goto('/');
        await waitForAppReady(page);

        await app.statsButton.click();
        await page.click('text=Период: Осенний Сезон');
        await page.click('button:has-text("Настройка сезонов")');

        // Кликаем по редактированию
        await page.click('button[title="Редактировать сезон"]');

        // Проверяем корректность заполнения полей
        await expect(page.locator('h3:has-text("Редактирование сезона")')).toBeVisible();
        await expect(page.getByTestId('season-name-input')).toHaveValue('Осенний Сезон');
        await expect(page.getByTestId('season-start-date-input')).toHaveValue('2026-09-01');
        await expect(page.getByTestId('season-end-date-input')).toHaveValue('2026-11-30');

        // Нажимаем Отмена
        await page.getByTestId('cancel-season-form-btn').click();

        // Закрылась форма редактирования, окно управления сезонами всё ещё открыто с элементом списка
        await expect(page.getByTestId('season-name-input')).toBeHidden();
        await expect(page.locator('h3:has-text("Управление сезонами")')).toBeVisible();
        await expect(page.getByTestId('seasons-manager-modal').getByText('Осенний Сезон')).toBeVisible();
    });

    test('диалог подтверждения удаления отображает заголовок и описание, а при отмене оставляет окно сезонов открытым', async ({ app, page }) => {
        await page.context().addInitScript(() => {
            const season = [{ id: 's1', name: 'Сезон под удаление', startDate: '2026-01-01' }];
            localStorage.setItem('randomatched_seasons_v1', JSON.stringify(season));
        });

        await page.goto('/');
        await waitForAppReady(page);

        await app.statsButton.click();
        await page.click('text=Период: Сезон под удаление');
        await page.click('button:has-text("Настройка сезонов")');

        // Кликаем по кнопке удаления сезона
        await page.click('button[title="Удалить сезон"]');

        // Проверяем поля модалки подтверждения по scoped-локатору
        const confirmModal = page.getByTestId('delete-season-confirm');
        await expect(confirmModal).toBeVisible();
        await expect(confirmModal.locator('h3:has-text("Удалить сезон?")')).toBeVisible();
        await expect(confirmModal.locator('text=Вы действительно хотите удалить сезон')).toBeVisible();
        await expect(confirmModal.locator('text=Сезон под удаление')).toBeVisible();

        // Отменяем удаление по кнопке "Отмена"
        await page.getByTestId('confirm-modal-cancel-btn').click();

        // Диалог удаления закрылся, но модалка сезонов осталась открытой и сезон не удален
        await expect(confirmModal).toBeHidden();
        await expect(page.locator('h3:has-text("Управление сезонами")')).toBeVisible();
        await expect(page.getByTestId('seasons-manager-modal').getByText('Сезон под удаление')).toBeVisible();
    });

    test('отмена формы во время создания сезона закрывает только форму, сохраняя окно сезонов и статистику', async ({ app, page }) => {
        await page.goto('/');
        await waitForAppReady(page);

        await app.statsButton.click();
        await expect(app.statsModal).toBeVisible();

        await page.click('text=Период: Все время');
        await page.click('button:has-text("Настройка сезонов")');

        await expect(page.locator('h3:has-text("Управление сезонами")')).toBeVisible();

        // Открываем форму создания нового сезона
        await page.click('button:has-text("Создать новый сезон")');
        await expect(page.locator('h3:has-text("Новый сезон")')).toBeVisible();

        // Кнопка-крестик в шапке окна формы отсутствует в модалке-шторке
        await expect(page.getByTestId('close-season-form-btn')).toBeHidden();

        // Нажимаем "Отмена" в форме
        await page.getByTestId('cancel-season-form-btn').click();

        // Проверяем: форма создания закрылась
        await expect(page.getByTestId('season-name-input')).toBeHidden();

        // НО окно "Управление сезонами" И окно "Статистика" остаются открытыми
        await expect(page.locator('h3:has-text("Управление сезонами")')).toBeVisible();
        await expect(app.statsModal).toBeVisible();
    });

    test('отмена формы во время редактирования сезона закрывает только форму редактирования', async ({ app, page }) => {
        await page.context().addInitScript(() => {
            const season = [{ id: 's1', name: 'Зимний Сезон', startDate: '2026-12-01' }];
            localStorage.setItem('randomatched_seasons_v1', JSON.stringify(season));
        });

        await page.goto('/');
        await waitForAppReady(page);

        await app.statsButton.click();
        await page.click('text=Период: Зимний Сезон');
        await page.click('button:has-text("Настройка сезонов")');

        // Открываем редактирование
        await page.click('button[title="Редактировать сезон"]');
        await expect(page.locator('h3:has-text("Редактирование сезона")')).toBeVisible();

        // Кнопка-крестик в шапке окна формы отсутствует в модалке-шторке
        await expect(page.getByTestId('close-season-form-btn')).toBeHidden();

        // Нажимаем "Отмена" в форме
        await page.getByTestId('cancel-season-form-btn').click();

        // Проверяем: форма редактирования закрылась, открыт список сезонов с элементом "Зимний Сезон"
        await expect(page.getByTestId('season-name-input')).toBeHidden();
        await expect(page.locator('h3:has-text("Управление сезонами")')).toBeVisible();
        await expect(page.getByTestId('seasons-manager-modal').getByText('Зимний Сезон')).toBeVisible();
        await expect(app.statsModal).toBeVisible();
    });

    test('попытка создания дублирующего сезона отображает ошибку валидации', async ({ app, page }) => {
        await page.context().addInitScript(() => {
            const season = [{ id: 's1', name: 'Осенний Сезон', startDate: '2026-09-01' }];
            localStorage.setItem('randomatched_seasons_v1', JSON.stringify(season));
        });

        await page.goto('/');
        await waitForAppReady(page);

        await app.statsButton.click();
        await page.click('text=Период: Осенний Сезон');
        await page.click('button:has-text("Настройка сезонов")');

        await page.click('button:has-text("Создать новый сезон")');
        await page.getByTestId('season-name-input').fill('осенний сезон');
        await page.getByTestId('season-start-date-input').fill('2026-10-01');
        await page.click('button[type="submit"]:has-text("Сохранить")');

        // Должно отобразиться сообщение об ошибке
        await expect(page.getByText('Сезон с таким названием уже существует')).toBeVisible();
        // Форма не должна закрываться
        await expect(page.getByTestId('season-name-input')).toBeVisible();
    });

    test('ручная установка сезона по умолчанию переопределяет авто-алгоритм и сохраняется в localStorage', async ({ app, page }) => {
        await page.context().addInitScript(() => {
            const twoSeasons = [
                { id: 's1', name: 'Весенний 2026', startDate: '2026-03-01' },
                { id: 's2', name: 'Летний 2026', startDate: '2026-06-01' }
            ];
            localStorage.setItem('randomatched_seasons_v1', JSON.stringify(twoSeasons));
            localStorage.removeItem('randomatched_user_default_season_v1');
        });

        await page.goto('/');
        await waitForAppReady(page);

        // Открываем статистику - по авто-алгоритму выбран "Летний 2026"
        await app.statsButton.click();
        await expect(app.statsModal).toBeVisible();
        await expect(page.locator('text=Период: Летний 2026')).toBeVisible();

        // Открываем менеджер сезонов
        await page.click('text=Период: Летний 2026');
        await page.click('button:has-text("Настройка сезонов")');
        await expect(page.locator('h3:has-text("Управление сезонами")')).toBeVisible();

        // Устанавливаем "Весенний 2026" по умолчанию (кнопка-звезда)
        await page.getByTestId('toggle-default-season-s1').click();

        // Проверяем сохранение в localStorage
        const savedDefault = await page.evaluate(() => localStorage.getItem('randomatched_user_default_season_v1'));
        expect(savedDefault).toBe('s1');

        // Проверяем отображение плашки и бейджа
        await expect(page.getByTestId('reset-user-default-season-btn')).toBeVisible();
        await expect(page.getByTestId('seasons-manager-modal').getByText('По умолчанию: Весенний 2026')).toBeVisible();

        // Закрываем менеджер сезонов
        await page.getByTestId('close-seasons-manager-btn').click();

        // Закрываем модалку статистики и открываем заново
        await app.statsCloseButton.click();
        await expect(app.statsModal).toBeHidden();

        await app.statsButton.click();
        await expect(app.statsModal).toBeVisible();

        // Теперь по умолчанию открывается ручной выбор "Весенний 2026"
        await expect(page.locator('text=Период: Весенний 2026')).toBeVisible();
    });

    test('сброс ручного выбора сезона возвращает авто-алгоритм', async ({ app, page }) => {
        await page.context().addInitScript(() => {
            const twoSeasons = [
                { id: 's1', name: 'Весенний 2026', startDate: '2026-03-01' },
                { id: 's2', name: 'Летний 2026', startDate: '2026-06-01' }
            ];
            localStorage.setItem('randomatched_seasons_v1', JSON.stringify(twoSeasons));
            localStorage.setItem('randomatched_user_default_season_v1', 's1');
        });

        await page.goto('/');
        await waitForAppReady(page);

        await app.statsButton.click();
        await expect(app.statsModal).toBeVisible();

        // Открылся Весенний 2026 из localStorage
        await expect(page.locator('text=Период: Весенний 2026')).toBeVisible();

        // Открываем менеджер сезонов
        await page.click('text=Период: Весенний 2026');
        await page.click('button:has-text("Настройка сезонов")');

        // Нажимаем сброс на авто-выбор
        await page.getByTestId('reset-user-default-season-btn').click();

        // Проверяем, что в localStorage ключ удален
        const savedDefault = await page.evaluate(() => localStorage.getItem('randomatched_user_default_season_v1'));
        expect(savedDefault).toBeNull();

        // Плашка сброса скрылась
        await expect(page.getByTestId('reset-user-default-season-btn')).toBeHidden();

        // Закрываем менеджер сезонов
        await page.getByTestId('close-seasons-manager-btn').click();

        // Закрываем и открываем статистику
        await app.statsCloseButton.click();
        await expect(app.statsModal).toBeHidden();

        await app.statsButton.click();
        await expect(app.statsModal).toBeVisible();

        // Снова применился стандартный авто-алгоритм (Летний 2026)
        await expect(page.locator('text=Период: Летний 2026')).toBeVisible();
    });

    test('удаление сезона, выбранного по умолчанию, сбрасывает ручной выбор в localStorage', async ({ app, page }) => {
        await page.context().addInitScript(() => {
            const seasons = [
                { id: 's-to-delete', name: 'Дефолтный Сезон', startDate: '2026-01-01' },
                { id: 's-other', name: 'Другой Сезон', startDate: '2026-05-01' }
            ];
            localStorage.setItem('randomatched_seasons_v1', JSON.stringify(seasons));
            localStorage.setItem('randomatched_user_default_season_v1', 's-to-delete');
        });

        await page.goto('/');
        await waitForAppReady(page);

        await app.statsButton.click();
        await expect(app.statsModal).toBeVisible();

        await page.click('text=Период: Дефолтный Сезон');
        await page.click('button:has-text("Настройка сезонов")');

        // Удаляем именно 's-to-delete'
        await page.getByTestId('delete-season-s-to-delete').click();
        await page.getByTestId('confirm-delete-season-btn').click();

        // Проверяем, что localStorage очистился
        const savedDefault = await page.evaluate(() => localStorage.getItem('randomatched_user_default_season_v1'));
        expect(savedDefault).toBeNull();
    });
});
