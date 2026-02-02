"use server";

import { actionWrapper } from "@/lib/presentation/utils/action-handler";
import { StorageService } from "@/lib/infrastructure/storage/storage";
import { CreateAssignmentDTO } from "@/lib/domain/types/task";
import { CreateScheduleDTO } from "@/lib/domain/types/schedule";

export async function claimTaskAction(
  taskId: string,
  _unsafeUserId: string,
  jwt: string,
) {
  return await actionWrapper(
    async ({ container, userId }) => {
      // 3. Resolve Profile
      const profile = await container.authService.getProfile(userId);
      if (!profile) throw new Error("Profile not found");

      // 4. Exec
      return await container.dutyService.claimTask(taskId, profile.discord_id);
    },
    { jwt },
  );
}

export async function unclaimTaskAction(taskId: string, jwt: string) {
  return await actionWrapper(
    async ({ container, userId }) => {
      const profile = await container.authService.getProfile(userId);
      if (!profile) throw new Error("Profile not found");

      return await container.dutyService.unclaimTask(
        taskId,
        profile.discord_id,
      );
    },
    { jwt },
  );
}

export async function submitProofAction(formData: FormData, jwt: string) {
  return await actionWrapper(
    async ({ container, userId }) => {
      const taskId = formData.get("taskId") as string;
      const file = formData.get("file") as File;

      if (!taskId || !file) throw new Error("Missing data");

      const profile = await container.authService.getProfile(userId);
      if (!profile) throw new Error("Profile not found");

      // Upload
      const buffer = Buffer.from(await file.arrayBuffer());
      const key = `proofs/${taskId}_${file.name}`;
      await StorageService.uploadFile(buffer, key, file.type);

      // Submit
      return await container.dutyService.submitProof(
        taskId,
        profile.discord_id,
        key,
      );
    },
    { jwt },
  );
}

export async function createTaskAction(data: CreateAssignmentDTO, jwt: string) {
  return await actionWrapper(
    async ({ container }) => {
      return await container.adminService.createTask(data);
    },
    { jwt },
  );
}

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

export async function getAllActiveTasksAction(jwt: string) {
  const result = await actionWrapper(
    async ({ container }) => {
      return await container.queryService.getAllActiveTasks();
    },
    { jwt },
  );

  if (result.success && result.data)
    return JSON.parse(JSON.stringify(result.data));
  return [];
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

export async function getAllMembersAction(jwt: string) {
  const result = await actionWrapper(
    async ({ container }) => {
      return await container.queryService.getMembers();
    },
    { jwt },
  );

  if (result.success && result.data)
    return JSON.parse(JSON.stringify(result.data));
  return [];
}

export async function approveTaskAction(taskId: string, jwt: string) {
  return await actionWrapper(
    async ({ container, userId }) => {
      // We pass the authId (userId) as the 'verified_by'
      return await container.adminService.verifyTask(taskId, userId);
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

export async function getReviewDetailsAction(taskId: string, jwt: string) {
  return await actionWrapper(
    async ({ container }) => {
      // Fetch Task
      const task = await container.queryService.getTask(taskId);
      if (!task) throw new Error("Task not found");

      let submitterName = "Unknown";
      let proofUrl = "";

      // Resolve Submitter
      if (task.assigned_to) {
        const submitter = await container.queryService.getUserProfile(
          task.assigned_to,
        );
        if (submitter) {
          submitterName = submitter.full_name || submitter.discord_handle;
        }
      }

      // Resolve Proof URL (S3 Signed URL)
      if (task.proof_s3_key) {
        proofUrl = await StorageService.getReadUrl(task.proof_s3_key);
      }

      return {
        submitterName,
        proofUrl,
      };
    },
    { jwt },
  );
}
