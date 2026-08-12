
import { isTestEnvironment } from '../firebase';

/**
 * Checks for actual internet connectivity by pinging reliable endpoints.
 * This is more reliable than navigator.onLine which only checks for local network interface connection.
 * 
 * @param timeoutMs Timeout in milliseconds for the ping request (default: 3000ms)
 * @returns Promise<boolean> True if internet is accessible, false otherwise
 */
export const checkConnectivity = async (timeoutMs: number = 3000): Promise<boolean> => {
    if (!navigator.onLine) return false;

    // In Playwright E2E test environment, avoid actual network calls to external CDNs
    if (isTestEnvironment()) {
        return true;
    }

    try {
        const controller = new AbortController();
        const timerId = setTimeout(() => controller.abort(), timeoutMs);

        // Ping endpoints using race (Promise.any) for extreme reliability against regional ISP blocks
        const timestamp = Date.now();
        const pingUrls = [
            `https://www.google.com/favicon.ico?_=${timestamp}`,
            `https://yandex.ru/favicon.ico?_=${timestamp}`,
            `https://cloudflare.com/favicon.ico?_=${timestamp}`
        ];

        const pingPromises = pingUrls.map(url =>
            fetch(url, {
                mode: 'no-cors',
                cache: 'no-store',
                signal: controller.signal
            })
        );

        await Promise.any(pingPromises);
        clearTimeout(timerId);
        return true;
    } catch {
        return false;
    }
};

/**
 * Wraps any promise with a hard timeout to prevent hanging UI on blocked networks or Lie-Fi
 */
export const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = 5000): Promise<T> => {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Operation timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        promise
            .then((res) => {
                clearTimeout(timer);
                resolve(res);
            })
            .catch((err) => {
                clearTimeout(timer);
                reject(err);
            });
    });
};


