import { ClientDeviceInfo } from '../types';

const CLIENT_ID_STORAGE_KEY = 'randomatched_client_id';

/**
 * Получает существующий или генерирует новый уникальный идентификатор клиента/устройства.
 */
export const getOrCreateClientId = (): string => {
  if (typeof window === 'undefined') {
    return 'rm_server';
  }

  try {
    let id = localStorage.getItem(CLIENT_ID_STORAGE_KEY);
    if (!id || typeof id !== 'string' || id.trim() === '' || id === 'undefined' || id === 'null' || !id.startsWith('rm_')) {
      // Генерация криптографически стойкого случайного суффикса даже в HTTP LAN
      let randomSuffix = '';
      if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const bytes = new Uint8Array(8);
        crypto.getRandomValues(bytes);
        randomSuffix = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
      } else {
        randomSuffix = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
      }

      id = `rm_${Date.now().toString(36)}_${randomSuffix}`;
      localStorage.setItem(CLIENT_ID_STORAGE_KEY, id);
    }
    return id;
  } catch (e) {
    console.warn('[clientId] Failed to access localStorage:', e);
    return `rm_temp_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
  }
};

/**
 * Определяет платформу, браузер и характеристики экрана клиента.
 */
export const getDeviceInfo = (): ClientDeviceInfo => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      os: 'Unknown',
      browser: 'Unknown',
      screen: '0x0',
      isPWA: false
    };
  }

  const ua = navigator.userAgent || '';
  
  // Определение операционной системы
  let os = 'Unknown';
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    os = 'iOS';
  } else if (/Android/.test(ua)) {
    os = 'Android';
  } else if (/Windows/.test(ua)) {
    os = 'Windows';
  } else if (/Macintosh|Mac OS X/.test(ua)) {
    os = 'macOS';
  } else if (/Linux/.test(ua)) {
    os = 'Linux';
  }

  // Определение браузера
  let browser = 'Browser';
  if (/CriOS|Chrome/.test(ua) && !/Edg|OPR/.test(ua)) {
    browser = 'Chrome';
  } else if (/Safari/.test(ua) && !/CriOS|Chrome|Edg|OPR/.test(ua)) {
    browser = 'Safari';
  } else if (/Firefox|FxiOS/.test(ua)) {
    browser = 'Firefox';
  } else if (/Edg/.test(ua)) {
    browser = 'Edge';
  } else if (/OPR|Opera/.test(ua)) {
    browser = 'Opera';
  }

  // Определение PWA Standalone режима
  const isPWA = 
    window.matchMedia('(display-mode: standalone)').matches || 
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://');

  const screen = `${window.screen?.width || window.innerWidth}x${window.screen?.height || window.innerHeight}`;

  return {
    os,
    browser,
    screen,
    isPWA
  };
};

/**
 * Генерирует читаемое имя по умолчанию для устройства.
 */
export const generateDefaultClientName = (device: ClientDeviceInfo, clientId: string): string => {
  const shortId = clientId.length > 4 ? clientId.slice(-4) : clientId;
  const pwaTag = device.isPWA ? ' PWA' : ` (${device.browser})`;
  return `${device.os}${pwaTag} #${shortId}`;
};
