
export interface LogEntry {
  type: 'log' | 'warn' | 'error' | 'info' | 'debug';
  args: string[];
  time: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private listeners: Set<(logs: LogEntry[]) => void> = new Set();
  private maxLogs = 200;

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    // Consuming early logs captured by index.html script
    const earlyLogs = (window as any).__earlyLogs;
    if (Array.isArray(earlyLogs)) {
        earlyLogs.forEach((log: any) => {
            this.addLog(log.type, log.args, log.time);
        });
        // Disable early logger by removing reference, our override below will replace it anyway
        (window as any).__earlyLogs = null;
    }

    // Capture standard console methods
    const methods = ['log', 'warn', 'error', 'info', 'debug'] as const;
    methods.forEach((type) => {
      const original = console[type];
      console[type] = (...args: any[]) => {
        original.apply(console, args);
        this.addLog(type, args);
      };
    });

    // Capture global script errors and resource loading errors (img, script, etc)
    // capture: true is essential for resource errors which don't bubble
    window.addEventListener('error', (event) => {
      if (event.target && event.target instanceof HTMLElement) {
        const el = event.target as any;
        const src = el.src || el.href || '';
        const tagName = el.tagName.toLowerCase();
        this.addLog('error', [`Resource Error: <${tagName}> failed to load ${src}`]);
      } else {
        this.addLog('error', [event.message || 'Unknown Error']);
      }
    }, true);

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.addLog('error', [`Unhandled Rejection: ${String(event.reason)}`]);
    });
  }

  private addLog(type: 'log' | 'warn' | 'error' | 'info' | 'debug', args: any[], time?: string) {
    const timestamp = time || new Date().toLocaleTimeString('ru-RU', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    const serializedArgs = args.map(arg => {
      try {
        if (arg instanceof Error) return arg.message;
        if (typeof arg === 'object') {
            if (arg === null) return 'null';
            // Handle complex objects like ServiceWorkerRegistration that stringify to {}
            if (arg.toString() === '[object Object]' && arg.constructor.name !== 'Object') {
                return `[${arg.constructor.name}]`;
            }
            return JSON.stringify(arg);
        }
        return String(arg);
      } catch {
        return String(arg);
      }
    });

    this.logs = [...this.logs, { type, args: serializedArgs, time: timestamp }].slice(-this.maxLogs);
    this.notify();
  }

  subscribe(callback: (logs: LogEntry[]) => void) {
    this.listeners.add(callback);
    callback(this.logs);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    this.listeners.forEach(cb => cb(this.logs));
  }
}

export const logger = new Logger();
