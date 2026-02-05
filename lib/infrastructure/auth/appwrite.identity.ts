/**
 * Appwrite Identity Provider
 *
 * Adapter for interactions with Appwrite's Users API.
 */

import { Query } from "node-appwrite";
import { getUsers } from "@/lib/infrastructure/persistence/client";
import {
  IIdentityProvider,
  Identity,
} from "@/lib/domain/ports/identity.provider";

export class AppwriteIdentityProvider implements IIdentityProvider {
  private get users() {
    return getUsers();
  }

  async listIdentities(userId: string): Promise<Identity[]> {
    try {
      const result = await this.users.listIdentities([
        Query.equal("userId", userId),
      ]);

      return result.identities.map((id) => ({
        userId: id.userId,
        provider: id.provider,
        providerUid: id.providerUid,
        providerAccessToken: id.providerAccessToken,
      }));
    } catch (error) {
      console.error(
        `[AppwriteIdentityProvider] listIdentities failed for ${userId}`,
        error,
      );
      return [];
    }
  }

  async getIdentity(
    userId: string,
    provider: "discord",
  ): Promise<Identity | null> {
    const identities = await this.listIdentities(userId);
    return identities.find((id) => id.provider === provider) || null;
  }

  async updateName(userId: string, name: string): Promise<void> {
    try {
      await this.users.updateName(userId, name);
    } catch (error) {
      // Log but don't throw, as this is often non-critical
      console.warn(
        `[AppwriteIdentityProvider] updateName failed for ${userId}`,
        error,
      );
    }
  }
}
