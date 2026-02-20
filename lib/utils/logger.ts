import { env } from "@/lib/infrastructure/config/env";

/**
 * Development-only logger to avoid cluttering production logs and leaking info.
 * Use this instead of console.log for debugging.
 */

// Force true for now to debug production issues if needed, or stick to env
const isDev = env.NODE_ENV === "development";

export const logger = {
  log: (message: string, ...args: any[]) => {
    if (isDev) {
      console.log(`\x1b[36m[LOG]\x1b[0m ${message}`, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    // Always log errors, even in prod, but maybe format differently? 
    // For now, simple console.error is fine for Vercel logs.
    console.error(`\x1b[31m[ERROR]\x1b[0m ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    if (isDev) {
      console.warn(`\x1b[33m[WARN]\x1b[0m ${message}`, ...args);
    }
  },
  debug: (message: string, ...args: any[]) => {
    if (isDev) {
      console.debug(`\x1b[90m[DEBUG]\x1b[0m ${message}`, ...args);
    }
  },
};
