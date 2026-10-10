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

/**
 * Chapter policy: recurring duties open 3 days before they are due. Used wherever a
 * schedule has no stored lead time, so new schedules and fallbacks never drift back to 24h.
 */
export const DEFAULT_LEAD_TIME_HOURS = 72;

export const CreateScheduleDTOSchema = HousingScheduleSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateScheduleDTO = z.infer<typeof CreateScheduleDTOSchema>;
