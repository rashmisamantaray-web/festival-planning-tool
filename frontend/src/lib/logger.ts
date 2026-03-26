/**
 * Frontend logging utility for Festival Planning Tool.
 *
 * Layer: Utility
 * Provides structured logging with timestamps, levels, and module context.
 * In production, consider routing to a remote logging service.
 *
 * IMPORTANT: Never log sensitive data (API keys, tokens, PII).
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL: LogLevel =
  import.meta.env.DEV ? "debug" : "info";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
}

function formatMessage(
  level: LogLevel,
  module: string,
  message: string,
  meta?: Record<string, unknown>
): string {
  const ts = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  return `[${ts}] [${level.toUpperCase()}] [${module}] ${message}${metaStr}`;
}

function createLogger(module: string) {
  return {
    debug(message: string, meta?: Record<string, unknown>) {
      if (shouldLog("debug")) {
        // eslint-disable-next-line no-console
        console.debug(formatMessage("debug", module, message, meta));
      }
    },
    info(message: string, meta?: Record<string, unknown>) {
      if (shouldLog("info")) {
        // eslint-disable-next-line no-console
        console.info(formatMessage("info", module, message, meta));
      }
    },
    warn(message: string, meta?: Record<string, unknown>) {
      if (shouldLog("warn")) {
        // eslint-disable-next-line no-console
        console.warn(formatMessage("warn", module, message, meta));
      }
    },
    error(message: string, meta?: Record<string, unknown>) {
      if (shouldLog("error")) {
        // eslint-disable-next-line no-console
        console.error(formatMessage("error", module, message, meta));
      }
    },
  };
}

/** Generate a correlation ID for request tracing. */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export const logger = createLogger("app");
export const apiLogger = createLogger("api");
export const pipelineLogger = createLogger("pipeline");
