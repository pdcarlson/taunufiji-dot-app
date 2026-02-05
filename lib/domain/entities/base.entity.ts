/**
 * Base Entity
 *
 * Mirrors the structure of an Appwrite Document but removes the SDK dependency.
 * This allows the Domain Layer to be pure and framework-agnostic.
 */

export interface BaseEntity {
  $id: string;
  $collectionId: string;
  $databaseId: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  [key: string]: any;
}
