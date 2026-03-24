/**
 * Appwrite admin client factory for non-Next contexts (CLI scripts, diagnostics).
 *
 * Does not import `server-only` env modules — safe for `tsx` scripts.
 */
import { Client } from "node-appwrite";

/**
 * Builds a server-side Appwrite client using endpoint, project id, and API key from the given env map.
 *
 * @param source - Environment map to read from; defaults to `process.env`.
 * @returns Configured `Client` with key authentication.
 * @throws If any of `NEXT_PUBLIC_APPWRITE_ENDPOINT`, `NEXT_PUBLIC_APPWRITE_PROJECT_ID`, or `APPWRITE_API_KEY` is missing.
 */
export function createAppwriteAdminClientFromEnv(
  source: NodeJS.ProcessEnv = process.env,
): Client {
  const endpoint = source.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = source.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const apiKey = source.APPWRITE_API_KEY;

  if (!endpoint || !projectId || !apiKey) {
    throw new Error(
      "NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID, and APPWRITE_API_KEY are required for the Appwrite admin client",
    );
  }

  return new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);
}
