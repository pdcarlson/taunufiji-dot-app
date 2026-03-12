import "server-only";
import { readServerEnv, ServerEnv, serverEnvSchema } from "./server-env-schema";

/**
 * Environment Configuration
 *
 * NEXT_PUBLIC_ variables are inlined by the Next.js compiler.
 * Server-only variables are protected by 'server-only' and only available in Node.js environments.
 */

const skipValidation = process.env.SKIP_ENV_VALIDATION === "true";
const parsed = serverEnvSchema.safeParse(readServerEnv());

if (!parsed.success && !skipValidation) {
  const formattedErrors = parsed.error.flatten().fieldErrors;
  const invalidKeys = Object.keys(formattedErrors);
  console.error("Server environment validation failed:", parsed.error.format());
  throw new Error(
    `Invalid server environment variables: ${
      invalidKeys.length > 0 ? invalidKeys.join(", ") : "unknown"
    }`,
  );
}

const validatedEnv = parsed.success ? parsed.data : undefined;

function resolveDefaultNodeEnv(): ServerEnv["NODE_ENV"] {
  const parsedNodeEnv = serverEnvSchema.shape.NODE_ENV.safeParse(undefined);
  return parsedNodeEnv.success ? parsedNodeEnv.data : "development";
}

function resolveSkipValidationEnv(): ServerEnv {
  const parsedWithValidation = serverEnvSchema.safeParse(readServerEnv());

  if (parsedWithValidation.success) {
    return parsedWithValidation.data;
  }

  if (parsedWithValidation.error instanceof Error) {
    console.warn(
      `⚠️ SKIP_ENV_VALIDATION=true enabled; using raw process.env fallback. Reason: ${parsedWithValidation.error.message}`,
    );
  } else {
    console.warn(
      "⚠️ SKIP_ENV_VALIDATION=true enabled; using raw process.env fallback.",
    );
  }

  const rawEnv = readServerEnv();
  return {
    ...rawEnv,
    NODE_ENV: rawEnv.NODE_ENV ?? resolveDefaultNodeEnv(),
  } as ServerEnv;
}

/**
 * Validated Environment Object
 * (Server Only)
 */
export const env = skipValidation
  ? resolveSkipValidationEnv()
  : (validatedEnv as ServerEnv);