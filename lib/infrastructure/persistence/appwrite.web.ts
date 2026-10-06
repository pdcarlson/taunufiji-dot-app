import { Client, Account, Databases, Storage } from "appwrite";
import { clientEnv } from "@/lib/infrastructure/config/client-env";
import { createJWTCache } from "@/lib/infrastructure/auth/jwt-cache";

const client = new Client();

client
  .setEndpoint(clientEnv.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(clientEnv.NEXT_PUBLIC_APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export { client };

/** Shared JWT cache for server action calls; see `jwt-cache.ts` for why. */
export const jwtCache = createJWTCache(
  async () => (await account.createJWT()).jwt,
);
