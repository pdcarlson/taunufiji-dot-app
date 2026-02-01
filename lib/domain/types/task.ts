/**
 * Task / Assignment Entity
 */
import { z } from "zod";
import { BaseEntitySchema } from "./base";

export const TaskStatusSchema = z.enum([
  "open",
  "pending",
  "approved",
  "rejected",
  "expired",
  "locked",
]);
export const TaskTypeSchema = z.enum(["duty", "bounty", "project", "one_off"]);
export const NotificationLevelSchema = z
  .enum(["none", "unlocked", "urgent", "expired"])
  .optional();

export const HousingTaskSchema = BaseEntitySchema.extend({
  title: z.string(),
  description: z.string(),
  status: TaskStatusSchema,
  type: TaskTypeSchema,
  points_value: z.number(),
  schedule_id: z.string().optional().nullable(),
  initial_image_s3_key: z.string().optional().nullable(),
  proof_s3_key: z.string().optional().nullable(), // The "After" photo
  assigned_to: z.string().optional().nullable(),
  due_at: z.string().optional().nullable(),
  expires_at: z.string().optional().nullable(),
  unlock_at: z.string().optional().nullable(),
  is_fine: z.boolean().optional(), // Appwrite boolean can be null if not set default? assume strict boolean or optional
  notification_level: NotificationLevelSchema,
  execution_limit: z.number().optional().nullable(),
  completed_at: z.string().optional().nullable(),
});

export type HousingTask = z.infer<typeof HousingTaskSchema>;

// DTOs for Creation/Update often differ from the Entity (no $id, etc)
export const CreateAssignmentDTOSchema = HousingTaskSchema.omit({
  $id: true,
  $collectionId: true,
  $databaseId: true,
  $createdAt: true,
  $updatedAt: true,
  $permissions: true,
}).partial();

export type CreateAssignmentDTO = z.infer<typeof CreateAssignmentDTOSchema>;
