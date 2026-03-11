import "server-only";
import { readServerEnv, ServerEnv, serverEnvSchema } from "./server-env-schema";

/**
 * Environment Configuration
 *
 * NEXT_PUBLIC_ variables are inlined by the Next.js compiler.
 * Server-only variables are protected by 'server-only' and only available in Node.js environments.
 */

const parsed = serverEnvSchema.safeParse(readServerEnv());
const skipValidation = process.env.SKIP_ENV_VALIDATION === "true";
const validatedEnv = parsed.success ? parsed.data : undefined;

if (!parsed.success) {
  const formattedErrors = parsed.error.flatten().fieldErrors;
  const invalidKeys = Object.keys(formattedErrors);

  if (skipValidation) {
    console.warn(
      `⚠️ Skipping strict server environment validation (SKIP_ENV_VALIDATION=true). Invalid keys: ${
        invalidKeys.length > 0 ? invalidKeys.join(", ") : "unknown"
      }.`,
    );
  } else {
    console.error("Server environment validation failed:", parsed.error.format());
    throw new Error(
      `Invalid server environment variables: ${
        invalidKeys.length > 0 ? invalidKeys.join(", ") : "unknown"
      }`,
    );
  }
}

/**
 * Validated Environment Object
 * (Server Only)
 */
export const env = skipValidation
  ? (process.env as unknown as ServerEnv)
  : (validatedEnv as ServerEnv);
