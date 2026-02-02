"use server";

import { revalidatePath } from "next/cache";

import { CreateAssignmentDTO } from "@/lib/domain/types/task";
import { CreateScheduleDTO } from "@/lib/domain/types/schedule";

import { StorageService } from "@/lib/infrastructure/storage/storage";
import { HOUSING_ADMIN_ROLES } from "@/lib/infrastructure/config/roles";
import { safeAction } from "@/lib/core/safe-action";

export async function getOpenTasksAction(jwt?: string) {
  return await safeAction(
    async ({ container }) => {
      const tasks = await container.queryService.getOpenTasks();
      return JSON.parse(JSON.stringify(tasks));
    },
    { jwt },
  );
}

export async function getAllActiveTasksAction(jwt?: string) {
  return await safeAction(
    async ({ container }) => {
      const tasks = await container.queryService.getAllActiveTasks();
      return JSON.parse(JSON.stringify(tasks));
    },
    { jwt },
  );
}

export async function getPendingReviewsAction(jwt?: string) {
  return await safeAction(
    async ({ container }) => {
      const reviews = await container.queryService.getPendingReviews();
      return JSON.parse(JSON.stringify(reviews));
    },
    { jwt },
  );
}

export async function claimTaskAction(
  taskId: string,
  authId: string,
  jwt?: string,
) {
  return await safeAction(
    async ({ container, userId }) => {
      // Ensure claiming for SELF
      if (userId !== authId) throw new Error("Cannot claim for others");

      // Resolve Profile ID (Discord ID)
      const profile = await container.authService.getProfile(userId);
      if (!profile) throw new Error("Profile not found");

      await container.dutyService.claimTask(taskId, profile.discord_id);
      revalidatePath("/dashboard/housing");
      return { success: true };
    },
    { jwt },
  );
}

export async function submitProofAction(formData: FormData, jwt?: string) {
  return await safeAction(
    async ({ container, userId }) => {
      const taskId = formData.get("taskId") as string;
      const file = formData.get("file") as File;

      if (!file || file.size === 0) throw new Error("File is required");

      // 1. Upload to S3 (Keep StorageService as is for now)
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const ext = file.name.split(".").pop();
      const key = `proofs/${taskId}/${Date.now()}.${ext}`;

      await StorageService.uploadFile(buffer, key, file.type);
      const s3Key = key;

      // 2. Resolve Profile
      const profile = await container.userService.getByAuthId(userId);
      if (!profile) throw new Error("Profile not found");

      // 3. Mark Submitted
      await container.dutyService.submitProof(
        taskId,
        profile.discord_id,
        s3Key,
      );

      revalidatePath("/dashboard/housing");
      return { success: true };
    },
    { jwt },
  );
}

export async function getMyTasksAction(userId: string, jwt?: string) {
  return await safeAction(
    async ({ container, userId: authUserId }) => {
      if (authUserId !== userId) return []; // strict ownership

      const profile = await container.userService.getByAuthId(authUserId);
      if (!profile) return []; // Or throw error? adhering to safeAction, maybe throw is better, but this mimics old logic.
      // But old logic returned [], safeAction wrapper will return { success: true, data: [] }
      // Checks out.

      const res = await container.dutyService.getMyTasks(profile.discord_id);
      return JSON.parse(JSON.stringify(res.documents));
    },
    { jwt },
  );
}

export async function getHistoryAction(userId: string) {
  return await safeAction(
    async ({ container, userId: authUserId }) => {
      if (authUserId !== userId) throw new Error("Unauthorized history access");

      const profile = await container.userService.getByAuthId(authUserId);
      if (!profile) throw new Error("Profile not found");

      const res = await container.queryService.getHistory(profile.discord_id);
      return JSON.parse(JSON.stringify(res));
    },
    {}, // No JWT passed in original implies Session
  );
}

export async function unclaimTaskAction(taskId: string, jwt?: string) {
  return await safeAction(
    async ({ container, userId }) => {
      const profile = await container.userService.getByAuthId(userId);
      if (!profile) throw new Error("Profile not found");

      const task = await container.queryService.getTask(taskId);
      if (!task) throw new Error("Task not found");

      if (task.assigned_to !== profile.discord_id) {
        throw new Error("You do not own this task");
      }

      await container.dutyService.unclaimTask(taskId, profile.discord_id);
      revalidatePath("/dashboard/housing");
      return { success: true };
    },
    { jwt },
  );
}

export async function approveTaskAction(taskId: string, jwt?: string) {
  return await safeAction(
    async ({ container, userId }) => {
      await container.adminService.verifyTask(taskId, userId);
      revalidatePath("/dashboard/housing");
      return { success: true };
    },
    { jwt, allowedRoles: HOUSING_ADMIN_ROLES as string[] },
  );
}

export async function rejectTaskAction(
  taskId: string,
  reason: string | null,
  jwt?: string,
) {
  return await safeAction(
    async ({ container }) => {
      await container.adminService.rejectTask(
        taskId,
        reason || "No reason provided",
      );
      revalidatePath("/dashboard/housing");
      return { success: true };
    },
    { jwt, allowedRoles: HOUSING_ADMIN_ROLES as string[] },
  );
}

export async function createTaskAction(
  data: CreateAssignmentDTO,
  jwt?: string,
) {
  return await safeAction(
    async ({ container }) => {
      await container.adminService.createTask(data);
      revalidatePath("/dashboard/housing");
      return { success: true };
    },
    { jwt, allowedRoles: HOUSING_ADMIN_ROLES as string[] },
  );
}

export async function reassignTaskAction(
  taskId: string,
  userId: string,
  userName: string,
  jwt?: string,
) {
  return await safeAction(
    async ({ container }) => {
      const targetProfileId = userId && userId.length > 0 ? userId : null;
      await container.adminService.adminReassign(taskId, targetProfileId);
      revalidatePath("/dashboard/housing");
      return { success: true };
    },
    { jwt, allowedRoles: HOUSING_ADMIN_ROLES as string[] },
  );
}

export async function getSchedulesAction(jwt?: string) {
  return await safeAction(
    async ({ container }) => {
      const res = await container.scheduleService.getSchedules();
      return JSON.parse(JSON.stringify(res));
    },
    { jwt, allowedRoles: HOUSING_ADMIN_ROLES as string[] },
  );
}

export async function createScheduleAction(
  data: CreateScheduleDTO,
  jwt?: string,
) {
  return await safeAction(
    async ({ container }) => {
      await container.scheduleService.createSchedule(data);
      revalidatePath("/dashboard/housing");
      return { success: true };
    },
    { jwt, allowedRoles: HOUSING_ADMIN_ROLES as string[] },
  );
}

export async function checkHousingAdminAction(jwt?: string) {
  // Returns ActionResult<boolean> now
  return await safeAction(
    async () => {
      return true; // If we passed the role check, we are admin
    },
    { jwt, allowedRoles: HOUSING_ADMIN_ROLES as string[] },
  );
}

export async function getAllMembersAction(jwt?: string) {
  return await safeAction(
    async ({ container }) => {
      const members = await container.queryService.getMembers();
      return members;
    },
    { jwt },
  );
}

export async function getReviewDetailsAction(taskId: string, jwt?: string) {
  return await safeAction(
    async ({ container }) => {
      const task = await container.queryService.getTask(taskId);
      if (!task) throw new Error("Task not found");

      let submitterName = "Unknown Brother";
      let proofUrl = "";

      if (task.assigned_to) {
        // Here we keep local try-catch because it's non-critical data enrichment
        try {
          const submitter = await container.queryService.getUserProfile(
            task.assigned_to,
          );
          if (submitter) {
            submitterName =
              submitter.full_name || submitter.discord_handle || "Brother";
          }
        } catch (e) {
          console.warn("Failed to fetch submitter profile", e);
        }
      }

      if (task.proof_s3_key) {
        proofUrl = await StorageService.getReadUrl(task.proof_s3_key);
      }

      return { success: true, submitterName, proofUrl };
    },
    { jwt, allowedRoles: HOUSING_ADMIN_ROLES as string[] },
  );
}

export async function updateTaskAction(
  taskId: string,
  data: Partial<CreateAssignmentDTO>,
  jwt?: string,
) {
  return await safeAction(
    async ({ container }) => {
      await container.adminService.updateTask(taskId, data);
      revalidatePath("/dashboard/housing");
      return { success: true };
    },
    { jwt, allowedRoles: HOUSING_ADMIN_ROLES as string[] },
  );
}

export async function deleteTaskAction(taskId: string, jwt?: string) {
  return await safeAction(
    async ({ container }) => {
      await container.adminService.deleteTask(taskId);
      revalidatePath("/dashboard/housing");
      return { success: true };
    },
    { jwt, allowedRoles: HOUSING_ADMIN_ROLES as string[] },
  );
}

export async function getScheduleAction(scheduleId: string, jwt?: string) {
  return await safeAction(
    async ({ container }) => {
      const schedule = await container.scheduleService.getSchedule(scheduleId);
      return JSON.parse(JSON.stringify(schedule));
    },
    { jwt, allowedRoles: HOUSING_ADMIN_ROLES as string[] },
  );
}

export async function updateScheduleLeadTimeAction(
  scheduleId: string,
  leadTime: number,
  jwt?: string,
) {
  return await safeAction(
    async ({ container }) => {
      await container.scheduleService.updateSchedule(scheduleId, {
        lead_time_hours: leadTime,
      });
      revalidatePath("/dashboard/housing");
      return { success: true };
    },
    { jwt, allowedRoles: HOUSING_ADMIN_ROLES as string[] },
  );
}
