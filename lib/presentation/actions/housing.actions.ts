"use server";

import { createJWTClient } from "@/lib/presentation/server/appwrite";
import { getContainer } from "@/lib/infrastructure/container";
import { logger } from "@/lib/utils/logger";
import { StorageService } from "@/lib/infrastructure/storage/storage";
import { CreateAssignmentDTO } from "@/lib/domain/types/task";
import { CreateScheduleDTO } from "@/lib/domain/types/schedule";

export async function claimTaskAction(
  taskId: string,
  _unsafeUserId: string, // We ignore the passed ID and trust the JWT
  jwt: string,
) {
  try {
    const { dutyService, authService } = getContainer();

    // 1. Verify Identity
    const { account } = createJWTClient(jwt);
    const user = await account.get();
    const authId = user.$id;

    // 2. Authorization
    const isAuthorized = await authService.verifyBrother(authId);
    if (!isAuthorized) {
      throw new Error("Unauthorized");
    }

    // 3. Resolve Profile
    const profile = await authService.getProfile(authId);
    if (!profile) throw new Error("Profile not found");

    // 4. Exec
    const result = await dutyService.claimTask(taskId, profile.discord_id);
    return { success: true, data: result };
  } catch (e: unknown) {
    logger.error("Claim Task Failed", e);
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function unclaimTaskAction(taskId: string, jwt: string) {
  try {
    const { dutyService, authService } = getContainer();

    const { account } = createJWTClient(jwt);
    const user = await account.get();
    const authId = user.$id;

    const isAuthorized = await authService.verifyBrother(authId);
    if (!isAuthorized) throw new Error("Unauthorized");

    const profile = await authService.getProfile(authId);
    if (!profile) throw new Error("Profile not found");

    const result = await dutyService.unclaimTask(taskId, profile.discord_id);
    return { success: true, data: result };
  } catch (e: unknown) {
    logger.error("Unclaim Task Failed", e);
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function submitProofAction(formData: FormData, jwt: string) {
  try {
    const taskId = formData.get("taskId") as string;
    const file = formData.get("file") as File;

    if (!taskId || !file) throw new Error("Missing data");

    const { dutyService, authService } = getContainer();

    const { account } = createJWTClient(jwt);
    const user = await account.get();
    const authId = user.$id;

    const isAuthorized = await authService.verifyBrother(authId);
    if (!isAuthorized) throw new Error("Unauthorized");

    const profile = await authService.getProfile(authId);
    if (!profile) throw new Error("Profile not found");

    // Upload
    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `proofs/${taskId}_${file.name}`;
    await StorageService.uploadFile(buffer, key, file.type);

    // Submit
    const result = await dutyService.submitProof(
      taskId,
      profile.discord_id,
      key,
    );
    return { success: true, data: result };
  } catch (e: unknown) {
    logger.error("Submit Proof Failed", e);
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function createTaskAction(data: CreateAssignmentDTO, jwt: string) {
  try {
    const { adminService, authService } = getContainer();

    const { account } = createJWTClient(jwt);
    const user = await account.get();
    const authId = user.$id;

    // Authorization: Verify Brother
    const isAuthorized = await authService.verifyBrother(authId);
    if (!isAuthorized) throw new Error("Unauthorized");

    const result = await adminService.createTask(data);
    return { success: true, data: result };
  } catch (e: unknown) {
    logger.error("Create Task Failed", e);
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function createScheduleAction(
  data: CreateScheduleDTO,
  jwt: string,
) {
  try {
    const { scheduleService, authService } = getContainer();

    const { account } = createJWTClient(jwt);
    const user = await account.get();
    const authId = user.$id;

    // Authorization: Verify Brother
    const isAuthorized = await authService.verifyBrother(authId);
    if (!isAuthorized) throw new Error("Unauthorized");

    const result = await scheduleService.createSchedule(data);
    return { success: true, data: result };
  } catch (e: unknown) {
    logger.error("Create Schedule Failed", e);
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function updateTaskAction(
  taskId: string,
  data: Partial<CreateAssignmentDTO>,
  jwt: string,
) {
  try {
    const { adminService, authService } = getContainer();

    const { account } = createJWTClient(jwt);
    const user = await account.get();
    const authId = user.$id;

    const isAuthorized = await authService.verifyBrother(authId);
    if (!isAuthorized) throw new Error("Unauthorized");

    const result = await adminService.updateTask(taskId, data);
    return { success: true, data: result };
  } catch (e: unknown) {
    logger.error("Update Task Failed", e);
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function deleteTaskAction(taskId: string, jwt: string) {
  try {
    const { adminService, authService } = getContainer();

    const { account } = createJWTClient(jwt);
    const user = await account.get();
    const authId = user.$id;

    const isAuthorized = await authService.verifyBrother(authId);
    if (!isAuthorized) throw new Error("Unauthorized");

    await adminService.deleteTask(taskId);
    return { success: true, data: true };
  } catch (e: unknown) {
    logger.error("Delete Task Failed", e);
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function getScheduleAction(scheduleId: string, jwt: string) {
  try {
    const { scheduleService, authService } = getContainer();

    const { account } = createJWTClient(jwt);
    const user = await account.get();
    const authId = user.$id;

    const isAuthorized = await authService.verifyBrother(authId);
    if (!isAuthorized) throw new Error("Unauthorized");

    const result = await scheduleService.getSchedule(scheduleId);
    return { success: true, data: result };
  } catch (e: unknown) {
    logger.error("Get Schedule Failed", e);
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function updateScheduleLeadTimeAction(
  scheduleId: string,
  leadTimeHours: number,
  jwt: string,
) {
  try {
    const { scheduleService, authService } = getContainer();

    const { account } = createJWTClient(jwt);
    const user = await account.get();
    const authId = user.$id;

    const isAuthorized = await authService.verifyBrother(authId);
    if (!isAuthorized) throw new Error("Unauthorized");

    const result = await scheduleService.updateSchedule(scheduleId, {
      lead_time_hours: leadTimeHours,
    });
    return { success: true, data: result };
  } catch (e: unknown) {
    logger.error("Update Schedule Failed", e);
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function getAllActiveTasksAction(jwt: string) {
  try {
    const { queryService, authService } = getContainer();

    const { account } = createJWTClient(jwt);
    const user = await account.get();
    const authId = user.$id;

    const isAuthorized = await authService.verifyBrother(authId);
    if (!isAuthorized) return [];

    const result = await queryService.getAllActiveTasks();
    return JSON.parse(JSON.stringify(result));
  } catch (e: unknown) {
    logger.error("Get All Active Tasks Failed", e);
    return [];
  }
}

export async function getSchedulesAction(jwt: string) {
  try {
    const { scheduleService, authService } = getContainer();

    const { account } = createJWTClient(jwt);
    const user = await account.get();
    const authId = user.$id;

    const isAuthorized = await authService.verifyBrother(authId);
    if (!isAuthorized) return [];

    const result = await scheduleService.getSchedules();
    return JSON.parse(JSON.stringify(result));
  } catch (e: unknown) {
    logger.error("Get Schedules Failed", e);
    return [];
  }
}

export async function getAllMembersAction(jwt: string) {
  try {
    const { queryService, authService } = getContainer();

    const { account } = createJWTClient(jwt);
    const user = await account.get();
    const authId = user.$id;

    const isAuthorized = await authService.verifyBrother(authId);
    if (!isAuthorized) return [];

    const result = await queryService.getMembers();
    return JSON.parse(JSON.stringify(result));
  } catch (e: unknown) {
    logger.error("Get All Members Failed", e);
    return [];
  }
}

export async function approveTaskAction(taskId: string, jwt: string) {
  try {
    const { adminService, authService } = getContainer();

    const { account } = createJWTClient(jwt);
    const user = await account.get();
    const authId = user.$id;

    const isAuthorized = await authService.verifyBrother(authId);
    if (!isAuthorized) throw new Error("Unauthorized");

    const result = await adminService.verifyTask(taskId, authId);
    return { success: true, data: result };
  } catch (e: unknown) {
    logger.error("Approve Task Failed", e);
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function rejectTaskAction(
  taskId: string,
  reason: string,
  jwt: string,
) {
  try {
    const { adminService, authService } = getContainer();

    const { account } = createJWTClient(jwt);
    const user = await account.get();
    const authId = user.$id;

    const isAuthorized = await authService.verifyBrother(authId);
    if (!isAuthorized) throw new Error("Unauthorized");

    const result = await adminService.rejectTask(taskId, reason);
    return { success: true, data: result };
  } catch (e: unknown) {
    logger.error("Reject Task Failed", e);
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function getReviewDetailsAction(taskId: string, jwt: string) {
  try {
    const { queryService, authService } = getContainer();

    // Verify
    const { account } = createJWTClient(jwt);
    const user = await account.get();
    const authId = user.$id;

    const isAuthorized = await authService.verifyBrother(authId);
    if (!isAuthorized) throw new Error("Unauthorized");

    // Fetch Task
    const task = await queryService.getTask(taskId);
    if (!task) throw new Error("Task not found");

    let submitterName = "Unknown";
    let proofUrl = "";

    // Resolve Submitter
    if (task.assigned_to) {
      const submitter = await queryService.getUserProfile(task.assigned_to);
      if (submitter) {
        submitterName = submitter.full_name || submitter.discord_handle;
      }
    }

    // Resolve Proof URL (S3 Signed URL)
    if (task.proof_s3_key) {
      proofUrl = await StorageService.getReadUrl(task.proof_s3_key);
    }

    return {
      success: true,
      data: {
        submitterName,
        proofUrl,
      },
    };
  } catch (e: unknown) {
    logger.error("Get Review Details Failed", e);
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}
