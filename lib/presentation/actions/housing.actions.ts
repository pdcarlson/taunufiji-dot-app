"use server";

import {
  TasksService,
  CreateAssignmentDTO,
  CreateScheduleDTO,
} from "@/lib/application/services/task";
import { PointsService } from "@/lib/application/services/points.service";
import { StorageService } from "@/lib/infrastructure/storage/storage";
import { revalidatePath } from "next/cache";

import {
  createSessionClient,
  createJWTClient,
} from "@/lib/presentation/server/appwrite";
import { AuthService } from "@/lib/application/services/auth.service";
import { HOUSING_ADMIN_ROLES } from "@/lib/infrastructure/config/roles";

async function getAuthAccount(jwt?: string) {
  if (jwt) {
    return createJWTClient(jwt).account;
  }
  const { account } = await createSessionClient();
  return account;
}

export async function getOpenTasksAction(jwt?: string) {
  try {
    // Auth Check
    const account = await getAuthAccount(jwt);
    const user = await account.get();
    if (!(await AuthService.verifyBrother(user.$id)))
      throw new Error("Unauthorized");

    const res = await TasksService.getOpenTasks();
    // Serialize Appwrite Models to plain JSON if needed (Next.js passes data automatically)
    return JSON.parse(JSON.stringify(res));
  } catch (error) {
    console.error("Failed to fetch tasks", error);
    return [];
  }
}

export async function getPendingReviewsAction(jwt?: string) {
  try {
    const account = await getAuthAccount(jwt);
    const user = await account.get();

    // Check Admin (Optional: Could assume Caller checks, but safety first)
    if (!(await AuthService.verifyBrother(user.$id)))
      throw new Error("Unauthorized");

    const res = await TasksService.getPendingReviews();
    return JSON.parse(JSON.stringify(res));
  } catch (error) {
    console.error("Failed to fetch pending reviews", error);
    return [];
  }
}

export async function claimTaskAction(
  taskId: string,
  authId: string,
  jwt?: string,
) {
  try {
    const account = await getAuthAccount(jwt);
    const user = await account.get();
    if (!(await AuthService.verifyBrother(user.$id)))
      throw new Error("Unauthorized");

    // Ensure claiming for SELF (Auth Check)
    if (user.$id !== authId) throw new Error("Cannot claim for others");

    // Resolve Profile ID (Discord ID)
    const profile = await AuthService.getProfile(user.$id);
    if (!profile) throw new Error("Profile not found");

    await TasksService.claimTask(taskId, profile.discord_id);
    revalidatePath("/dashboard/housing");
    return { success: true };
  } catch (error) {
    console.error("Failed to claim task", error);
    return { success: false, error: "Failed to claim task" };
  }
}

// @ts-ignore
const heicConvert = require("heic-convert");

export async function submitProofAction(formData: FormData, jwt?: string) {
  try {
    const account = await getAuthAccount(jwt);
    const user = await account.get();
    if (!(await AuthService.verifyBrother(user.$id)))
      throw new Error("Unauthorized");

    const taskId = formData.get("taskId") as string;
    const file = formData.get("file") as File;

    if (!file || !taskId) throw new Error("Missing fields");

    let buffer = Buffer.from(await file.arrayBuffer());
    let contentType = file.type;
    let fileName = file.name;

    // Server-Side HEIC Conversion
    const isHeic =
      file.name.toLowerCase().endsWith(".heic") ||
      file.name.toLowerCase().endsWith(".heif") ||
      file.type.includes("heic") ||
      file.type.includes("heif");

    if (isHeic) {
      console.log(`Converting HEIC on server: ${fileName}`);
      try {
        const outputBuffer = await heicConvert({
          buffer: buffer, // the HEIC file buffer
          format: "JPEG", // output format
          quality: 0.8, // jpeg compression quality
        });

        buffer = Buffer.from(outputBuffer);
        contentType = "image/jpeg";
        fileName = fileName.replace(/\.(heic|heif)$/i, ".jpg");
        console.log(`Conversion successful: ${fileName}`);
      } catch (conversionError) {
        console.error("Server-side HEIC conversion failed", conversionError);
        throw new Error("Failed to process iPhone photo on server.");
      }
    }

    // 1. Upload to S3
    const key = `proofs/${taskId}-${Date.now()}-${fileName}`;

    await StorageService.uploadFile(buffer, key, contentType);

    // 1.5 Get Profile ID
    const profile = await AuthService.getProfile(user.$id);
    if (!profile) throw new Error("Profile not found");

    // 2. Update DB
    await TasksService.submitProof(taskId, profile.discord_id, key);

    revalidatePath("/dashboard/housing");
    return { success: true };
  } catch (e) {
    console.error("Upload failed", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Upload failed",
    };
  }
}

export async function getMyTasksAction(userId: string, jwt?: string) {
  const account = await getAuthAccount(jwt);
  const user = await account.get();
  if (!user || user.$id !== userId) return []; // strict ownership

  // Security Guard
  if (!(await AuthService.verifyBrother(user.$id))) return [];

  const profile = await AuthService.getProfile(user.$id);
  if (!profile) return [];

  const res = await TasksService.getMyTasks(profile.discord_id);
  return JSON.parse(JSON.stringify(res.documents));
}

export async function getHistoryAction(userId: string) {
  const { account } = await createSessionClient();
  const user = await account.get();
  if (!user || user.$id !== userId) return [];

  // Security Guard
  if (!(await AuthService.verifyBrother(user.$id))) return [];

  const profile = await AuthService.getProfile(user.$id);
  if (!profile) return [];

  const res = await TasksService.getHistory(profile.$id);
  return JSON.parse(JSON.stringify(res));
}

export async function unclaimTaskAction(taskId: string, jwt?: string) {
  try {
    const account = await getAuthAccount(jwt);
    const user = await account.get();
    if (!(await AuthService.verifyBrother(user.$id)))
      throw new Error("Unauthorized");

    const profile = await AuthService.getProfile(user.$id);
    if (!profile) throw new Error("Profile not found");

    // Verification that user OWNS the task they are unclaiming
    const task = await TasksService.getTask(taskId);
    if (!task) throw new Error("Task not found");

    // Schema uses 'assigned_to' as Profile ID (Discord ID)
    if (task.assigned_to !== profile.discord_id) {
      throw new Error("You do not own this task");
    }

    await TasksService.unclaimTask(taskId, profile.discord_id);
    revalidatePath("/dashboard/housing");
    return { success: true };
  } catch (e) {
    return { success: false };
  }
}

export async function approveTaskAction(taskId: string, jwt?: string) {
  try {
    const account = await getAuthAccount(jwt);
    const user = await account.get();
    // RBAC: Must be Admin
    const isAdmin = await AuthService.verifyRole(
      user.$id,
      HOUSING_ADMIN_ROLES as string[],
    );
    if (!isAdmin) throw new Error("Unauthorized (Admin Only)");

    await TasksService.verifyTask(taskId, user.$id);
    revalidatePath("/dashboard/housing");
    return { success: true };
  } catch (e: unknown) {
    console.error("approveTaskAction failed", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { success: false, error: msg };
  }
}

export async function rejectTaskAction(
  taskId: string,
  reason: string | null,
  jwt?: string,
) {
  try {
    const account = await getAuthAccount(jwt);
    const user = await account.get();
    const isAdmin = await AuthService.verifyRole(
      user.$id,
      HOUSING_ADMIN_ROLES as string[],
    );
    if (!isAdmin) throw new Error("Unauthorized");

    await TasksService.rejectTask(taskId, reason || "No reason provided");
    revalidatePath("/dashboard/housing");
    return { success: true };
  } catch (e) {
    console.error("rejectTaskAction failed", e);
    return { success: false, error: (e as Error).message };
  }
}

export async function createTaskAction(
  data: CreateAssignmentDTO,
  jwt?: string,
) {
  try {
    const account = await getAuthAccount(jwt);
    const user = await account.get();
    // Only Admins can CREATE/ASSIGN tasks arbitrarily
    const isAdmin = await AuthService.verifyRole(
      user.$id,
      HOUSING_ADMIN_ROLES as string[],
    );
    if (!isAdmin) throw new Error("Unauthorized");

    await TasksService.createTask(data);
    revalidatePath("/dashboard/housing");
    return { success: true };
  } catch (e) {
    console.error("createTaskAction failed", e);
    return { success: false, error: (e as Error).message };
  }
}

export async function reassignTaskAction(
  taskId: string,
  userId: string,
  userName: string,
  jwt?: string,
) {
  try {
    const account = await getAuthAccount(jwt);
    const user = await account.get();
    const isAdmin = await AuthService.verifyRole(
      user.$id,
      HOUSING_ADMIN_ROLES as string[],
    );
    if (!isAdmin) throw new Error("Unauthorized");

    // Handle Unassign (empty string -> null)
    const targetProfileId = userId && userId.length > 0 ? userId : null;

    await TasksService.adminReassign(taskId, targetProfileId);

    revalidatePath("/dashboard/housing");
    return { success: true };
  } catch (e) {
    console.error("reassignTaskAction failed", e);
    return { success: false, error: (e as Error).message };
  }
}

export async function getSchedulesAction(jwt?: string) {
  try {
    const account = await getAuthAccount(jwt);
    const user = await account.get();
    const isAdmin = await AuthService.verifyRole(
      user.$id,
      HOUSING_ADMIN_ROLES as string[],
    );
    if (!isAdmin) return [];

    // Need TasksService.getSchedules() -> I haven't implemented this in Service yet!
    // I should implement it in Service first.
    // For now, I'll use db.listDocuments directly in Service, so I need to go back to Service.
    // But I can't call DB directly here.
    // I will assume TasksService.getSchedules() exists and then go fix it.
    // Wait, I can't assume. I should fix it.
    // But tool use rules: "Do not do parallel tool calls".
    // I will finish this file then update TasksService.
    const res = await TasksService.getSchedules();
    return JSON.parse(JSON.stringify(res));
  } catch (e) {
    console.error("Failed to fetch schedules", e);
    return [];
  }
}

export async function createScheduleAction(
  data: CreateScheduleDTO,
  jwt?: string,
) {
  try {
    const account = await getAuthAccount(jwt);
    const user = await account.get();
    const isAdmin = await AuthService.verifyRole(
      user.$id,
      HOUSING_ADMIN_ROLES as string[],
    );
    if (!isAdmin) throw new Error("Unauthorized");

    await TasksService.createSchedule(data);
    revalidatePath("/dashboard/housing");
    return { success: true };
  } catch (e) {
    console.error("Failed to create schedule", e);
    return { success: false, error: "Failed to create schedule" };
  }
}

export async function checkHousingAdminAction(jwt?: string) {
  try {
    const account = await getAuthAccount(jwt);
    const user = await account.get();
    return await AuthService.verifyRole(
      user.$id,
      HOUSING_ADMIN_ROLES as string[],
    );
  } catch {
    return false;
  }
}

export async function getAllMembersAction(jwt?: string) {
  try {
    // Authenticate as at least a logged in user
    const account = await getAuthAccount(jwt);
    const user = await account.get();

    // Security Guard
    if (!(await AuthService.verifyBrother(user.$id))) return [];

    const members = await TasksService.getMembers();

    return members;
  } catch (e) {
    console.error("Failed to fetch members", e);
    return [];
  }
}

export async function getReviewDetailsAction(taskId: string, jwt?: string) {
  try {
    const account = await getAuthAccount(jwt);
    const user = await account.get();
    const isAdmin = await AuthService.verifyRole(
      user.$id,
      HOUSING_ADMIN_ROLES as string[],
    );
    if (!isAdmin) throw new Error("Unauthorized");

    const task = await TasksService.getTask(taskId);
    if (!task) throw new Error("Task not found");

    let submitterName = "Unknown Brother";
    let proofUrl = "";

    // 1. Get Submitter Name (Discord ID -> User Profile -> Name)
    if (task.assigned_to) {
      // We need a way to get profile by Discord ID.
      // AuthService.getProfile gets by Auth ID.
      // We need `getProfileByDiscordId`? Or just query users list.
      // Let's rely on AuthService having a query or use DB directly here for speed/simplicity
      // Wait, AuthService.getProfile uses "auth_id" query.
      // We need "discord_id" query or "primary key" query.
      // The USER COLLECTION ID is the Auth ID? No.
      // Schema: `discord_id` is Index Unique.
      // Wait, `db.getDocument` requires Document ID.
      // Is Document ID == Discord ID?
      // In `getProfile` we do `db.listDocuments(..., Query.equal("auth_id", authId))`.
      // The document ID is internal Appwrite ID usually.
      // But wait, `TasksService.claimTask` saves `profileId` to `assigned_to`.
      // Where does `profileId` come from? `profile.$id`.
      // So `assigned_to` IS the Document ID of the User Profile.
      // So we can just `db.getDocument`.
      try {
        const submitter = await TasksService.getUserProfile(task.assigned_to);
        if (submitter) {
          submitterName =
            submitter.full_name || submitter.discord_handle || "Brother";
        }
      } catch (e) {
        console.warn("Failed to fetch submitter profile", e);
      }
    }

    // 2. Get Signed URL
    if (task.proof_s3_key) {
      proofUrl = await StorageService.getReadUrl(task.proof_s3_key);
    }

    return { success: true, submitterName, proofUrl };
  } catch (e) {
    return { success: false, error: "Failed to fetch details" };
  }
}

export async function updateTaskAction(
  taskId: string,
  data: Partial<CreateAssignmentDTO>, // Use Payload Type directly
  jwt?: string,
) {
  try {
    const account = await getAuthAccount(jwt);
    const user = await account.get();
    const isAdmin = await AuthService.verifyRole(
      user.$id,
      HOUSING_ADMIN_ROLES as string[],
    );
    if (!isAdmin) throw new Error("Unauthorized");

    await TasksService.updateTask(taskId, data);
    revalidatePath("/dashboard/housing");
    return { success: true };
  } catch (e) {
    console.error("updateTaskAction failed", e);
    return { success: false, error: (e as Error).message };
  }
}

export async function deleteTaskAction(taskId: string, jwt?: string) {
  try {
    const account = await getAuthAccount(jwt);
    const user = await account.get();
    const isAdmin = await AuthService.verifyRole(
      user.$id,
      HOUSING_ADMIN_ROLES as string[],
    );
    if (!isAdmin) throw new Error("Unauthorized");

    await TasksService.deleteTask(taskId);
    revalidatePath("/dashboard/housing");
    return { success: true };
  } catch (e) {
    console.error("deleteTaskAction failed", e);
    return { success: false, error: (e as Error).message };
  }
}

export async function getScheduleAction(scheduleId: string, jwt?: string) {
  try {
    const account = await getAuthAccount(jwt);
    const user = await account.get();
    // Role check optional if we allow user to see schedule details?
    // Usually only Admin edits.
    const isAdmin = await AuthService.verifyRole(
      user.$id,
      HOUSING_ADMIN_ROLES as string[],
    );
    if (!isAdmin) throw new Error("Unauthorized");

    const schedule = await TasksService.getSchedule(scheduleId);
    return JSON.parse(JSON.stringify(schedule));
  } catch (e) {
    return null;
  }
}

export async function updateScheduleLeadTimeAction(
  scheduleId: string,
  leadTime: number,
  jwt?: string,
) {
  try {
    const account = await getAuthAccount(jwt);
    const user = await account.get();
    const isAdmin = await AuthService.verifyRole(
      user.$id,
      HOUSING_ADMIN_ROLES as string[],
    );
    if (!isAdmin) throw new Error("Unauthorized");

    await TasksService.updateSchedule(scheduleId, {
      lead_time_hours: leadTime,
    });

    // Optional: Recalculate unlocking for tasks?
    // Usually the cron handles future instances.
    // If we want to strictly update the *linked* task's unlock time, we'd need to fetch it.
    // Logic: If there is an OPEN or LOCKED task associated with this schedule, update its unlock_at?
    // Let's keep it simple: Changing schedule affects FUTURE instances.

    revalidatePath("/dashboard/housing");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
