"use server";

import { actionWrapper } from "@/lib/presentation/utils/action-handler";
import { CreateAssignmentDTO } from "@/lib/domain/types/task";
import { HOUSING_ADMIN_ROLES } from "@/lib/infrastructure/config/roles";
import { RecurringMutationOptions } from "@/lib/domain/types/recurring";

export async function createTaskAction(data: CreateAssignmentDTO, jwt: string) {
  return await actionWrapper(
    async ({ container }) => {
      return await container.adminService.createTask(data);
    },
    {
      jwt,
      allowedRoles: HOUSING_ADMIN_ROLES,
      actionName: "housing.createTask",
    },
  );
}

export async function updateTaskAction(
  taskId: string,
  data: Partial<CreateAssignmentDTO>,
  jwt: string,
  recurringOptions?: RecurringMutationOptions,
) {
  return await actionWrapper(
    async ({ container }) => {
      return await container.adminService.updateTask(taskId, data, recurringOptions);
    },
    {
      jwt,
      allowedRoles: HOUSING_ADMIN_ROLES,
      actionName: "housing.updateTask",
    },
  );
}

export async function deleteTaskAction(
  taskId: string,
  jwt: string,
  recurringOptions?: RecurringMutationOptions,
) {
  return await actionWrapper(
    async ({ container }) => {
      await container.adminService.deleteTask(taskId, recurringOptions);
      return true;
    },
    {
      jwt,
      allowedRoles: HOUSING_ADMIN_ROLES,
      actionName: "housing.deleteTask",
    },
  );
}

export async function approveTaskAction(
  taskId: string,
  jwt: string,
  pointsOverride?: number,
) {
  return await actionWrapper(
    async ({ container, userId }) => {
      // We pass the authId (userId) as the 'verified_by'
      return await container.adminService.verifyTask(
        taskId,
        userId,
        pointsOverride,
      );
    },
    {
      jwt,
      allowedRoles: HOUSING_ADMIN_ROLES,
      actionName: "housing.approveTask",
    },
  );
}

export async function rejectTaskAction(
  taskId: string,
  reason: string,
  jwt: string,
) {
  return await actionWrapper(
    async ({ container }) => {
      return await container.adminService.rejectTask(taskId, reason);
    },
    {
      jwt,
      allowedRoles: HOUSING_ADMIN_ROLES,
      actionName: "housing.rejectTask",
    },
  );
}
