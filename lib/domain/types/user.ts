/**
 * User Entity
 */
import { z } from "zod";
import { BaseEntitySchema } from "./base";

export const UserSchema = BaseEntitySchema.extend({
  discord_id: z.string(),
  discord_handle: z.string(),
  full_name: z.string(),
  position_key: z.string(),
  details_points_current: z.number(),
  details_points_lifetime: z.number(),
  status: z.enum(["active", "alumni"]),
  auth_id: z.string(),
  avatar_url: z.string().optional(), // Often computed or fetched separately
});

export type User = z.infer<typeof UserSchema>;

export const CreateUserDTOSchema = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateUserDTO = z.infer<typeof CreateUserDTOSchema>;
