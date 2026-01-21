import { z } from "zod";

// Basic recursive schema for options
const optionSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    name: z.string(),
    type: z.number(),
    value: z.union([z.string(), z.number(), z.boolean()]).optional(),
    options: z.array(optionSchema).optional(),
    focused: z.boolean().optional(),
  }),
);

export const discordUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  discriminator: z.string(),
  avatar: z.string().nullable().optional(),
  bot: z.boolean().optional(),
});

export const discordMemberSchema = z.object({
  user: discordUserSchema,
  roles: z.array(z.string()),
  nick: z.string().nullable().optional(),
  joined_at: z.string(),
});

export const discordInteractionDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.number(),
  options: z.array(optionSchema).optional(),
  custom_id: z.string().optional(),
  component_type: z.number().optional(),
});

export const discordInteractionSchema = z.object({
  id: z.string(),
  application_id: z.string(),
  type: z.number(),
  data: discordInteractionDataSchema.optional(),
  guild_id: z.string().optional(),
  channel_id: z.string().optional(),
  member: discordMemberSchema.optional(),
  user: discordUserSchema.optional(),
  token: z.string(),
  version: z.number(),
});

export type ValidatedInteraction = z.infer<typeof discordInteractionSchema>;
