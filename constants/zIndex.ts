/**
 * Шкала слоев z-index приложения Randomatched.
 * Обеспечивает строгую иерархию и отсутствие конфликтов визуального наложения.
 */
export const Z_INDEX_BASE = {
  NAVBAR: 30,
  OVERLAY: 40,        // Экранные полноэкранные панели (ListsOverlay, SettingsOverlay)
  MODAL: 50,          // Базовый уровень обычных модальных окон
  ALERT: 70,          // Базовый уровень диалогов подтверждения и критических окон
  TOAST: 90,          // Уведомления и тосты
  TOOLTIP: 100,       // Выпадающие списки и тултипы
} as const;

/**
 * Рассчитывает динамические значения z-index для модального окна на основе его позиции в стеке.
 * @param depthIndex - Глубина окна в стеке активных элементов (начиная с 0)
 * @param isAlert - Является ли окно приоритетным алертом/подтверждением
 */
export function getModalZIndex(depthIndex = 0, isAlert = false) {
  const base = isAlert ? Z_INDEX_BASE.ALERT : Z_INDEX_BASE.MODAL;
  const backdropZIndex = base + depthIndex * 10;
  const modalZIndex = backdropZIndex + 1;

  return {
    backdropZIndex,
    modalZIndex,
    backdropStyle: { zIndex: backdropZIndex },
    modalStyle: { zIndex: modalZIndex },
  };
}
