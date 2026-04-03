import { env } from "@/lib/infrastructure/config/env";

/**
 * Mostly development-gated logging to avoid cluttering production and leaking
 * user-provided data. Errors always log; `info` follows the same dev gate as
 * `log` / `warn` / `debug`.
 */

const isDev = env.NODE_ENV === "development";

export const logger = {
  log: (message: string, ...args: unknown[]) => {
    if (isDev) {
      console.log(`\x1b[36m[LOG]\x1b[0m ${message}`, ...args);
    }
  },
  error: (message: string, ...args: unknown[]) => {
    // Always log errors, even in prod, but maybe format differently? 
    // For now, simple console.error is fine for Vercel logs.
    console.error(`\x1b[31m[ERROR]\x1b[0m ${message}`, ...args);
  },
  info: (message: string, ...args: unknown[]) => {
    if (isDev) {
      console.info(`\x1b[32m[INFO]\x1b[0m ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: unknown[]) => {
    if (isDev) {
      console.warn(`\x1b[33m[WARN]\x1b[0m ${message}`, ...args);
    }
  },
  debug: (message: string, ...args: unknown[]) => {
    if (isDev) {
      console.debug(`\x1b[90m[DEBUG]\x1b[0m ${message}`, ...args);
    }
  },
};
