import { HousingTask } from "@/lib/domain/types/task";

/**
 * Subset of schedule behavior required by housing cron (expiry → next instance).
 */
export interface IScheduleService {
  triggerNextInstance(
    scheduleId: string,
    previousTask: HousingTask,
  ): Promise<void>;
}
