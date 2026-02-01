/**
 * Base Entity
 *
 * Represents the standard metadata fields available on all persisted entities.
 * Note: Uses Appwrite system field names ($id, etc.) to match data reality.
 */
import { z } from "zod";

export const BaseEntitySchema = z.object({
  $id: z.string(),
  $collectionId: z.string(),
  $databaseId: z.string(),
  $createdAt: z.string().datetime(),
  $updatedAt: z.string().datetime(),
  $permissions: z.array(z.string()),
});

export type BaseEntity = z.infer<typeof BaseEntitySchema>;
