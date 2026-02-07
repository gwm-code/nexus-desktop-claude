export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  source: 'frontend' | 'backend' | 'cli';
  message: string;
  details?: string;
}

const logs: LogEntry[] = [];
const MAX_LOGS = 1000;

export const logger = {
  debug: (message: string, details?: string) => {
    addLog('debug', 'frontend', message, details);
  },

  info: (message: string, details?: string) => {
    addLog('info', 'frontend', message, details);
  },

  warn: (message: string, details?: string) => {
    addLog('warn', 'frontend', message, details);
    console.warn(message, details);
  },

  error: (message: string, details?: string) => {
    addLog('error', 'frontend', message, details);
    console.error(message, details);
  },

  getLogs: () => [...logs],

  clearLogs: () => {
    logs.length = 0;
  },

  exportLogs: () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

function addLog(
  level: LogEntry['level'],
  source: LogEntry['source'],
  message: string,
  details?: string
) {
  logs.push({
    timestamp: new Date().toISOString(),
    level,
    source,
    message,
    details,
  });

  // Keep only last MAX_LOGS logs
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }
}

// Capture global errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logger.error('Uncaught error', event.error?.stack || event.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection', String(event.reason));
  });
}
