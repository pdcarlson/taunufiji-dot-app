import { BaseEntity } from "./base.entity";
import { AssignmentSchema, ScheduleSchema } from "./appwrite.schema";

export type HousingTask = BaseEntity & AssignmentSchema;
export type HousingSchedule = BaseEntity & ScheduleSchema;
