/**
 * Domain Models
 *
 * Type aliases combining BaseEntity with schema interfaces.
 * Now purely decoupled from "node-appwrite".
 */

import { BaseEntity } from "./base";
import {
  AssignmentSchema,
  ScheduleSchema,
  UserSchema,
  LedgerSchema,
} from "./schema";

export type HousingTask = BaseEntity & AssignmentSchema;
export type HousingSchedule = BaseEntity & ScheduleSchema;
export type Member = BaseEntity & UserSchema;
export type LedgerEntry = BaseEntity & LedgerSchema;

/**
 * Library Resource
 * Represents a file in the library metadata collection.
 */
export interface LibraryResource extends BaseEntity {
  department: string;
  course_number: string;
  course_name: string;
  professor: string;
  semester: string;
  year: number;
  type: string;
  version: string;
  original_filename: string;
  file_s3_key: string;
  uploaded_by: string;
}

export type LeaderboardEntry = {
  id: string; // discord_id
  name: string;
  points: number;
  rank: number;
};
