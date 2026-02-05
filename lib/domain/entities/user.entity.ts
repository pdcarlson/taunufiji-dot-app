import { BaseEntity } from "./base.entity";
import { UserSchema } from "./appwrite.schema";

export type Member = BaseEntity & UserSchema;

export type LeaderboardEntry = {
  id: string; // discord_id
  name: string;
  points: number;
  rank: number;
  rankChange?: number;
};
