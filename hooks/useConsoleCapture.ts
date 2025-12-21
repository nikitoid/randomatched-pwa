
import { useState, useEffect } from 'react';

export interface LogEntry {
  type: 'log' | 'warn' | 'error';
  content: string;
  timestamp: string;
}

export const useConsoleCapture = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    // Backup original methods
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const formatArgs = (args: any[]) => {
      return args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
    };

    const addLog = (type: 'log' | 'warn' | 'error', args: any[]) => {
      const entry: LogEntry = {
        type,
        content: formatArgs(args),
        timestamp: new Date().toLocaleTimeString()
      };
      setLogs(prev => [...prev.slice(-49), entry]); // Keep last 50 logs
    };

    console.log = (...args) => {
      addLog('log', args);
      originalLog.apply(console, args);
    };

    console.warn = (...args) => {
      addLog('warn', args);
      originalWarn.apply(console, args);
    };

    console.error = (...args) => {
      addLog('error', args);
      originalError.apply(console, args);
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  return logs;
};
