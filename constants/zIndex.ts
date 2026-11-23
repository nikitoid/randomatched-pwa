/**
 * Шкала слоев z-index приложения Randomatched.
 * Обеспечивает строгую иерархию и отсутствие конфликтов визуального наложения.
 */
export const Z_INDEX_BASE = {
  BASE: 1,
  HEADER: 10,
  CONTENT_ELEVATED: 20, // Закрытые выпадающие блоки на главном экране (SourceSelector, PlayerNameInput)
  NAVBAR: 30,           // Нижняя панель навигации и локальные sticky-шапки
  BACKDROP: 35,         // Затемнение дропдаунов главного экрана
  DROPDOWN: 38,         // Открытые дропдауны главного экрана (поверх BACKDROP, ниже OVERLAY)
  OVERLAY: 40,          // Полноэкранные экраны (ScreenOverlay: Lists, Stats, Settings, Result)
  OVERLAY_NESTED: 45,   // Вложенный полноэкранный экран поверх OVERLAY (ChangelogOverlay)
  OVERLAY_BACKDROP: 46, // Бэкдропы внутренних меню поверх OVERLAY
  OVERLAY_POPOVER: 48,  // Попапы/контекстные меню внутри OVERLAY (ниже MODAL)
  MODAL: 50,            // Базовый уровень обычных модальных окон (50 + priority + depth*2)
  ALERT: 70,            // Базовый уровень диалогов подтверждения (70 + priority + depth*2)
  TOOLTIP: 200,         // Портальные дропдауны поверх модалок (RankSelect, floating drag card)
  TOAST: 220,           // Тост-уведомления (всегда поверх модалок и алертов)
  UPDATE_BANNER: 225,   // Баннер обновления PWA
  PRANK: 240,           // Секретное послание PrankOverlay
} as const;

/**
 * Рассчитывает динамические значения z-index для модального окна на основе его позиции в стеке.
 * @param depthIndex - Глубина окна в стеке активных элементов (начиная с 0)
 * @param isAlert - Является ли окно приоритетным алертом/подтверждением
 */
export function getModalZIndex(depthIndex = 0, isAlert = false, priority = 10) {
  const base = isAlert ? Z_INDEX_BASE.ALERT : Z_INDEX_BASE.MODAL;
  const backdropZIndex = base + priority + depthIndex * 2;
  const modalZIndex = backdropZIndex + 1;

  return {
    backdropZIndex,
    modalZIndex,
    backdropStyle: { zIndex: backdropZIndex },
    modalStyle: { zIndex: modalZIndex },
  };
}
