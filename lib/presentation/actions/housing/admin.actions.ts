"use server";

import { actionWrapper } from "@/lib/presentation/utils/action-handler";
import { CreateAssignmentDTO } from "@/lib/domain/types/task";

export async function createTaskAction(data: CreateAssignmentDTO, jwt: string) {
  return await actionWrapper(
    async ({ container }) => {
      return await container.adminService.createTask(data);
    },
    { jwt },
  );
}

export async function updateTaskAction(
  taskId: string,
  data: Partial<CreateAssignmentDTO>,
  jwt: string,
) {
  return await actionWrapper(
    async ({ container }) => {
      return await container.adminService.updateTask(taskId, data);
    },
    { jwt },
  );
}

export async function deleteTaskAction(taskId: string, jwt: string) {
  return await actionWrapper(
    async ({ container }) => {
      await container.adminService.deleteTask(taskId);
      return true;
    },
    { jwt },
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
    { jwt },
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
    { jwt },
  );
}
