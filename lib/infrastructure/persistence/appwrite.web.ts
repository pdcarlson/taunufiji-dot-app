import { Client, Account, Databases, Storage } from "appwrite";
import { env } from "@/lib/infrastructure/config/env";

const client = new Client();

client
    .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export { client };
