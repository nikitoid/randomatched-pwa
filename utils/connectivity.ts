
/**
 * Checks for actual internet connectivity by pinging a reliable endpoint.
 * This is more reliable than navigator.onLine which only checks for network connection.
 * 
 * @param timeoutMs Timeout in milliseconds for the ping request (default: 5000ms)
 * @returns Promise<boolean> True if internet is accessible, false otherwise
 */
export const checkConnectivity = async (timeoutMs: number = 5000): Promise<boolean> => {
    if (!navigator.onLine) return false;

    try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);

        // We use a no-cors request to a reliable high-availability CDN/endpoint
        // google.com/favicon.ico is a classic choice: high availability, small size
        // We add a timestamp to bypass cache
        await fetch(`https://www.google.com/favicon.ico?_=${Date.now()}`, {
            mode: 'no-cors',
            cache: 'no-store',
            signal: controller.signal
        });

        clearTimeout(id);
        return true;
    } catch (e) {
        return false;
    }
};
