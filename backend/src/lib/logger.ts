export interface LogMeta {
  route?: string;
  errorType?: string;
}

function write(level: 'error' | 'warn' | 'info', message: string, meta?: LogMeta): void {
  const entry = { timestamp: new Date().toISOString(), level, message, ...meta };
  (level === 'error' ? process.stderr : process.stdout).write(JSON.stringify(entry) + '\n');
}

export const logger = {
  error: (message: string, meta?: LogMeta) => write('error', message, meta),
  warn:  (message: string, meta?: LogMeta) => write('warn',  message, meta),
  info:  (message: string, meta?: LogMeta) => write('info',  message, meta),
};
