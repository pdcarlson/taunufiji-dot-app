/**
 * Base Entity
 *
 * Represents the standard metadata fields available on all validated domain entities.
 * Decoupled from Appwrite internals ($id -> id).
 */
import { z } from "zod";

export const BaseEntitySchema = z.object({
  id: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type BaseEntity = z.infer<typeof BaseEntitySchema>;
