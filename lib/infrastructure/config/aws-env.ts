import "server-only";
import { z } from "zod";

const awsEnvSchema = z.object({
  AWS_REGION: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_BUCKET_NAME: z.string().min(1),
});

export type AwsEnv = z.infer<typeof awsEnvSchema>;

function readAwsEnv(source: NodeJS.ProcessEnv = process.env): {
  [K in keyof AwsEnv]: string | undefined;
} {
  return {
    AWS_REGION: source.AWS_REGION,
    AWS_ACCESS_KEY_ID: source.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: source.AWS_SECRET_ACCESS_KEY,
    AWS_BUCKET_NAME: source.AWS_BUCKET_NAME,
  };
}

const skipValidation = process.env.SKIP_ENV_VALIDATION === "true";
const parsed = awsEnvSchema.safeParse(readAwsEnv());

if (!parsed.success && !skipValidation) {
  const invalidKeys = Object.keys(parsed.error.flatten().fieldErrors);
  console.error("AWS environment validation failed:", parsed.error.format());
  throw new Error(
    `Invalid AWS environment variables: ${
      invalidKeys.length > 0 ? invalidKeys.join(", ") : "unknown"
    }`,
  );
}

function resolveSkipValidationEnv(): AwsEnv {
  const rawEnv = readAwsEnv();
  const parsedWithValidation = awsEnvSchema.safeParse(rawEnv);

  if (parsedWithValidation.success) {
    return parsedWithValidation.data;
  }

  console.warn(
    `⚠️ SKIP_ENV_VALIDATION=true enabled for AWS env; using raw process.env fallback. Reason: ${parsedWithValidation.error.message}`,
  );
  return rawEnv as AwsEnv;
}

export const awsEnv = skipValidation
  ? resolveSkipValidationEnv()
  : (parsed.data as AwsEnv);
