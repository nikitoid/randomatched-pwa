/**
 * Универсальная функция копирования текста в буфер обмена.
 * Поддерживает как современный `navigator.clipboard`, так и надежный `execCommand` fallback 
 * для незащищенных контекстов (например, HTTP в локальной сети http://192.168.x.x:5173 на смартфонах).
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (!text) return false;

  // 1. Попытка через стандартный Clipboard API (работает в HTTPS и на localhost)
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('[clipboard] navigator.clipboard.writeText failed, falling back:', err);
    }
  }

  // 2. Fallback через временный textarea (работает на HTTP по локальному IP на всех устройствах)
  try {
    if (typeof document === 'undefined') return false;

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    textArea.style.opacity = '0';

    document.body.appendChild(textArea);

    // Поддержка iOS Safari
    if (navigator.userAgent.match(/ipad|iphone/i)) {
      const range = document.createRange();
      range.selectNodeContents(textArea);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      textArea.setSelectionRange(0, 999999);
    } else {
      textArea.focus();
      textArea.select();
    }

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('[clipboard] Fallback copy failed:', err);
    return false;
  }
};
