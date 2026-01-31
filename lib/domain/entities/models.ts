/**
 * Domain Models
 *
 * Type aliases combining Appwrite document metadata with schema interfaces.
 */

import { Models } from "node-appwrite";
import { AssignmentSchema, ScheduleSchema, UserSchema } from "./schema";

export type HousingTask = Models.Document & AssignmentSchema;
export type HousingSchedule = Models.Document & ScheduleSchema;
export type Member = Models.Document & UserSchema;

export type LeaderboardEntry = {
  id: string; // discord_id
  name: string;
  points: number;
  rank: number;
};
