import { Models } from "node-appwrite";
import { AssignmentSchema, ScheduleSchema, UserSchema } from "./schema";

export type HousingTask = Models.Document & AssignmentSchema;
export type HousingSchedule = Models.Document & ScheduleSchema;
export type Member = Models.Document & UserSchema;
export type LeaderboardEntry = {
  id: string; // discord_id check
  name: string;
  points: number;
  rank: number;
};
