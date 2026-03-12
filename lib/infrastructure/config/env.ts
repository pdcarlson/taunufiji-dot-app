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

function resolveSkipValidationEnv(): ServerEnv {
  const relaxedParsed = serverEnvSchema.partial().safeParse(readServerEnv());

  if (relaxedParsed.success) {
    return {
      ...(process.env as unknown as ServerEnv),
      NODE_ENV: serverEnvSchema.shape.NODE_ENV.parse(undefined),
      ...relaxedParsed.data,
    } as ServerEnv;
  }

  if (relaxedParsed.error instanceof Error) {
    console.warn(
      `⚠️ SKIP_ENV_VALIDATION=true enabled; using raw process.env fallback. Reason: ${relaxedParsed.error.message}`,
    );
  } else {
    console.warn(
      "⚠️ SKIP_ENV_VALIDATION=true enabled; using raw process.env fallback.",
    );
  }

  return process.env as unknown as ServerEnv;
}

/**
 * Validated Environment Object
 * (Server Only)
 */
export const env = skipValidation
  ? resolveSkipValidationEnv()
  : (validatedEnv as ServerEnv);
