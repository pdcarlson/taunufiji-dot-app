"use server";

import { actionWrapper } from "@/lib/presentation/utils/action-handler";
import { CreateScheduleDTO } from "@/lib/domain/types/schedule";

export async function createScheduleAction(
  data: CreateScheduleDTO,
  jwt: string,
) {
  return await actionWrapper(
    async ({ container }) => {
      return await container.scheduleService.createSchedule(data);
    },
    { jwt },
  );
}

export async function getScheduleAction(scheduleId: string, jwt: string) {
  return await actionWrapper(
    async ({ container }) => {
      return await container.scheduleService.getSchedule(scheduleId);
    },
    { jwt },
  );
}

export async function updateScheduleLeadTimeAction(
  scheduleId: string,
  leadTimeHours: number,
  jwt: string,
) {
  return await actionWrapper(
    async ({ container }) => {
      return await container.scheduleService.updateSchedule(scheduleId, {
        lead_time_hours: leadTimeHours,
      });
    },
    { jwt },
  );
}

export async function getSchedulesAction(jwt: string) {
  const result = await actionWrapper(
    async ({ container }) => {
      return await container.scheduleService.getSchedules();
    },
    { jwt },
  );

  if (result.success && result.data)
    return JSON.parse(JSON.stringify(result.data));
  return [];
}
