/**
 * Task Services Index
 *
 * Re-exports all task-related services and provides a unified facade.
 */

export * from "./types";
export * from "./duty.service";
export * from "./admin.service";
export * from "./schedule.service";
export * from "./query.service";

import { DutyService } from "./duty.service";
import { AdminService } from "./admin.service";
import { ScheduleService } from "./schedule.service";
import { QueryService } from "./query.service";
import { MaintenanceService } from "./maintenance.service"; // New

export {
  DutyService,
  AdminService,
  ScheduleService,
  QueryService,
  MaintenanceService,
};
