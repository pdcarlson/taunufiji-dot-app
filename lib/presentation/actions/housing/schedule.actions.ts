"use server";

import { actionWrapper } from "@/lib/presentation/utils/action-handler";
import { CreateScheduleDTO } from "@/lib/domain/types/schedule";
import { HOUSING_ADMIN_ROLES } from "@/lib/infrastructure/config/roles";
import { RecurringMutationOptions } from "@/lib/domain/types/recurring";

export async function createScheduleAction(
  data: CreateScheduleDTO,
  jwt: string,
) {
  return await actionWrapper(
    async ({ container }) => {
      return await container.scheduleService.createSchedule(data);
    },
    {
      jwt,
      allowedRoles: HOUSING_ADMIN_ROLES,
      actionName: "housing.createSchedule",
    },
  );
}

export async function getScheduleAction(scheduleId: string, jwt: string) {
  return await actionWrapper(
    async ({ container }) => {
      return await container.scheduleService.getSchedule(scheduleId);
    },
    {
      jwt,
      allowedRoles: HOUSING_ADMIN_ROLES,
      actionName: "housing.getSchedule",
    },
  );
}

export async function updateScheduleLeadTimeAction(
  scheduleId: string,
  leadTimeHours: number,
  jwt: string,
  recurringOptions?: RecurringMutationOptions,
) {
  return await actionWrapper(
    async ({ container }) => {
      return await container.scheduleService.updateSchedule(scheduleId, {
        lead_time_hours: leadTimeHours,
      }, recurringOptions);
    },
    {
      jwt,
      allowedRoles: HOUSING_ADMIN_ROLES,
      actionName: "housing.updateScheduleLeadTime",
    },
  );
}

export async function getSchedulesAction(jwt: string) {
  const result = await actionWrapper(
    async ({ container }) => {
      return await container.scheduleService.getSchedules();
    },
    {
      jwt,
      allowedRoles: HOUSING_ADMIN_ROLES,
      actionName: "housing.getSchedules",
    },
  );

  if (result.success && result.data)
    return JSON.parse(JSON.stringify(result.data));
  return [];
}
