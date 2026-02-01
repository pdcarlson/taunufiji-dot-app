/**
 * Schedule Entity
 */
import { z } from "zod";
import { BaseEntitySchema } from "./base";

export const HousingScheduleSchema = BaseEntitySchema.extend({
  title: z.string(),
  description: z.string(),
  recurrence_rule: z.string(),
  assigned_to: z.string().optional().nullable(),
  points_value: z.number(),
  active: z.boolean(),
  last_generated_at: z.string().optional().nullable(),
  lead_time_hours: z.number().optional().nullable(),
});

export type HousingSchedule = z.infer<typeof HousingScheduleSchema>;

export const CreateScheduleDTOSchema = HousingScheduleSchema.omit({
  $id: true,
  $collectionId: true,
  $databaseId: true,
  $createdAt: true,
  $updatedAt: true,
  $permissions: true,
});

export type CreateScheduleDTO = z.infer<typeof CreateScheduleDTOSchema>;
