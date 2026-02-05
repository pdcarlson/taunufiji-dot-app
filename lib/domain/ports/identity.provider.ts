/**
 * Identity Provider Port
 *
 * Abstract interface for Identity Management Systems (e.g. Appwrite Auth, Auth0).
 * Decouples the Application Layer from specific Auth SDKs.
 */

export interface Identity {
  userId: string;
  provider: string;
  providerUid: string;
  providerAccessToken?: string;
}

export interface IIdentityProvider {
  /**
   * List identities associated with a user
   */
  listIdentities(userId: string): Promise<Identity[]>;

  /**
   * Get a specific identity provider details for a user
   */
  getIdentity(userId: string, provider: "discord"): Promise<Identity | null>;

  /**
   * Update the name of the auth account
   */
  updateName(userId: string, name: string): Promise<void>;
}
