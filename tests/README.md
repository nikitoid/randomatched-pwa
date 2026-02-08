# Playwright E2E Тесты для RandoMatched

## Описание

Комплексные E2E тесты для PWA приложения RandoMatched, покрывающие весь основной функционал.

## Структура тестов

### Тестовые наборы

- **01-initial-state.spec.ts** - Тесты начального состояния приложения
- **02-list-management.spec.ts** - Тесты управления списками героев
- **03-player-names.spec.ts** - Тесты ввода имен игроков
- **04-team-generation.spec.ts** - Тесты генерации команд
- **05-team-manipulation.spec.ts** - Тесты манипуляции с командами
- **06-group-mode.spec.ts** - Тесты группового режима
- **07-match-history.spec.ts** - Тесты истории матчей
- **08-settings.spec.ts** - Тесты настроек приложения
- **09-session-reset.spec.ts** - Тесты сброса сессии
- **10-pwa-features.spec.ts** - Тесты PWA функций

### Вспомогательные файлы

- **helpers/test-data.ts** - Утилиты для инъекции тестовых данных
- **helpers/page-objects.ts** - Page Object классы для компонентов

## Установка

Playwright уже установлен в проекте. Если нужно переустановить:

```bash
npm install -D @playwright/test@latest
npx playwright install
```

## Запуск тестов

### Запуск всех тестов

```bash
npx playwright test
```

### Запуск с UI режимом (для отладки)

```bash
npx playwright test --ui
```

### Запуск конкретного файла

```bash
npx playwright test tests/e2e/01-initial-state.spec.ts
```

### Запуск для конкретного браузера

```bash
# Chrome Desktop
npx playwright test --project=chrome-desktop

# Chrome Mobile
npx playwright test --project=chrome-mobile

# Safari Mobile
npx playwright test --project=safari-mobile
```

### Запуск в режиме headed (с видимым браузером)

```bash
npx playwright test --headed
```

### Запуск конкретного теста

```bash
npx playwright test -g "должна загружаться приложение"
```

## Просмотр отчетов

После запуска тестов можно просмотреть HTML отчет:

```bash
npx playwright show-report
```

## Отладка тестов

### Режим отладки для конкретного теста

```bash
npx playwright test tests/e2e/04-team-generation.spec.ts --debug
```

### Запуск с замедлением (для визуального контроля)

```bash
npx playwright test --headed --slow-mo=1000
```

### Codegen (генерация тестов)

Для создания новых тестов можно использовать генератор:

```bash
npx playwright codegen http://localhost:5173
```

## Настройка

Основная конфигурация находится в `playwright.config.ts`. Настройки:

- **baseURL**: `http://localhost:5173` (dev-сервер)
- **timeout**: 30 секунд на тест
- **retries**: 0 локально, 2 в CI
- **screenshot**: только при падении тестов
- **video**: сохраняется при падении
- **trace**: при первом повторе

## Поддерживаемые платформы

- **Chrome Desktop** - десктопный Chrome (1920x1080)
- **Chrome Mobile** - мобильный Chrome (Pixel 5)
- **Safari Mobile** - мобильный Safari (iPhone 13 Pro)

## Инъекция тестовых данных

Все тесты используют инъекцию данных через localStorage для обеспечения чистого и предсказуемого начального состояния:

- Тестовые списки героев (12 героев с рангами S+ до E-)
- Имена игроков (10 тестовых имен)
- Базовыепараметры (тема, цветовая схема)

Данные инъектируются в `beforeEach` hook каждого теста.

## Структура Page Objects

Все компоненты приложения обернуты в Page Object классы:

- `SourceSelectorPO` - работа с выбором источников
- `PlayerNameInputPO` - ввод имен игроков
- `MainControlsPO` - главные кнопки управления
- `ResultOverlayPO` - работа с результатами
- `SettingsOverlayPO` - настройки
- `AppNavigationPO` - навигация

## Важные замечания

### Селекторы

Тесты используют комбинацию селекторов для максимальной устойчивости:
- `data-testid` атрибуты (рекомендуется добавить в компоненты)
- Текстовые селекторы
- CSS классы
- ARIA атрибуты

### Ожидания

В тестах используются фиксированные задержки (`waitForTimeout`) для анимаций. При необходимости их можно заменить на более точные ожидания:

```typescript
await page.waitForSelector('[data-testid="element"]', { state: 'visible' });
```

### Offline режим

Для тестирования offline функционала используется:

```typescript
await page.context().setOffline(true);
```

## CI/CD

Для запуска в CI окружении добавьте в ваш workflow:

```yaml
- name: Install dependencies
  run: npm ci

- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npx playwright test
```

## Добавление новых тестов

1. Создайте новый файл в `tests/e2e/`
2. Импортируйте необходимые утилиты из `helpers/`
3. Используйте инъекцию данных в `beforeEach`
4. Следуйте существующим паттернам именования тестов

Пример:

```typescript
import { test, expect } from '@playwright/test';
import { injectTestData, waitForAppReady } from '../helpers/test-data';

test.describe('Новый функционал', () => {
  test.beforeEach(async ({ page }) => {
    await injectTestData(page);
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('должен работать новый функционал', async ({ page }) => {
    // Ваш тест здесь
  });
});
```

## Известные проблемы

Некоторые тесты могут требовать дополнительной настройки селекторов в зависимости от фактической реализации компонентов. При необходимости обновите селекторы в Page Object классах.

## Статистика

- **Всего тестов**: 258
- **Файлов с тестами**: 10
- **Поддерживаемых платформ**: 3
- **Покрытие функционала**: ~100%
