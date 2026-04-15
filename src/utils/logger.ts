/**
 * Structured logging utility for SmartExam
 * Provides consistent logging across the application
 * Can be configured to disable logging in production
 */

export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  context?: string;
  data?: unknown;
}

class Logger {
  private isDevelopment: boolean;
  private minLogLevel: LogLevel;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    // Only show warnings and errors in production
    this.minLogLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
    const levelIndex = levels.indexOf(level);
    const minIndex = levels.indexOf(this.minLogLevel);
    return levelIndex <= minIndex;
  }

  private formatLog(entry: LogEntry): string {
    return `[${entry.timestamp}] [${entry.level}] ${entry.context ? `[${entry.context}] ` : ''}${entry.message}`;
  }

  private createEntry(level: LogLevel, message: string, context?: string, data?: unknown): LogEntry {
    return {
      level,
      timestamp: new Date().toISOString(),
      message,
      context,
      data,
    };
  }

  error(message: string, context?: string, data?: unknown): void {
    const entry = this.createEntry(LogLevel.ERROR, message, context, data);
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatLog(entry), data || '');
    }
  }

  warn(message: string, context?: string, data?: unknown): void {
    const entry = this.createEntry(LogLevel.WARN, message, context, data);
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatLog(entry), data || '');
    }
  }

  info(message: string, context?: string, data?: unknown): void {
    const entry = this.createEntry(LogLevel.INFO, message, context, data);
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatLog(entry), data || '');
    }
  }

  debug(message: string, context?: string, data?: unknown): void {
    const entry = this.createEntry(LogLevel.DEBUG, message, context, data);
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatLog(entry), data || '');
    }
  }

  setMinLogLevel(level: LogLevel): void {
    this.minLogLevel = level;
  }

  getDevelopmentMode(): boolean {
    return this.isDevelopment;
  }
}

// Export singleton instance
export const logger = new Logger();
