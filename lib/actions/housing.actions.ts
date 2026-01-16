"use server";



import { TasksService } from "@/lib/services/tasks.service";
import { PointsService } from "@/lib/services/points.service";
import { StorageService } from "@/lib/services/s3.service";
import { revalidatePath } from "next/cache";

import { createSessionClient, createJWTClient } from "@/lib/server/appwrite";
import { AuthService } from "@/lib/services/auth.service";
import { HOUSING_ADMIN_ROLES } from "@/lib/config/roles";

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
    if (!await AuthService.verifyBrother(user.$id)) throw new Error("Unauthorized");

    const res = await TasksService.getOpenTasks();
    // Serialize Appwrite Models to plain JSON if needed (Next.js passes data automatically)
    return JSON.parse(JSON.stringify(res.documents));
  } catch (error) {
    console.error("Failed to fetch tasks", error);
    return [];
  }
}

export async function claimTaskAction(taskId: string, authId: string, jwt?: string) {
  try {
    const account = await getAuthAccount(jwt);
    const user = await account.get();
    if (!await AuthService.verifyBrother(user.$id)) throw new Error("Unauthorized");
    
    // Ensure claiming for SELF (Auth Check)
    if (user.$id !== authId) throw new Error("Cannot claim for others");

    // Resolve Profile ID (Discord ID)
    const profile = await AuthService.getProfile(user.$id);
    if (!profile) throw new Error("Profile not found");

    await TasksService.claimTask(taskId, profile.$id);
    revalidatePath("/dashboard/housing");
    return { success: true };
  } catch (error) {
    console.error("Failed to claim task", error);
    return { success: false, error: "Failed to claim task" };
  }
}

export async function submitProofAction(formData: FormData, jwt?: string) {
  try {
     const account = await getAuthAccount(jwt);
     const user = await account.get();
     if (!await AuthService.verifyBrother(user.$id)) throw new Error("Unauthorized");

     const taskId = formData.get('taskId') as string;
     const file = formData.get('file') as File;
     
     if (!file || !taskId) throw new Error("Missing fields");

     // 1. Upload to S3
     const arrayBuffer = await file.arrayBuffer();
     const buffer = Buffer.from(arrayBuffer);
     const key = `proofs/${taskId}-${Date.now()}-${file.name}`;
     
     await StorageService.uploadFile(buffer, key, file.type);
     
     // 2. Update DB
     await TasksService.submitProof(taskId, key);
     
     revalidatePath('/dashboard/housing');
     return { success: true };
  } catch (e) {
     console.error("Upload failed", e);
     return { success: false, error: "Upload failed" };
  }
}

export async function getMyTasksAction(userId: string, jwt?: string) {
    const account = await getAuthAccount(jwt);
    const user = await account.get();
    if (!user || user.$id !== userId) return []; // strict ownership

    const profile = await AuthService.getProfile(user.$id);
    if (!profile) return [];

    const res = await TasksService.getMyTasks(profile.$id);
    return JSON.parse(JSON.stringify(res.documents));
}

export async function getHistoryAction(userId: string) {
    const { account } = await createSessionClient();
    const user = await account.get();
    if (!user || user.$id !== userId) return [];

    const profile = await AuthService.getProfile(user.$id);
    if (!profile) return [];

    const res = await TasksService.getHistory(profile.$id);
    return JSON.parse(JSON.stringify(res.documents));
}

export async function getLeaderboardAction() {
    const { account } = await createSessionClient();
    const user = await account.get();
    if (!await AuthService.verifyBrother(user.$id)) return [];

    const res = await PointsService.getLeaderboard();
    return JSON.parse(JSON.stringify(res.documents));
}

export async function unclaimTaskAction(taskId: string, jwt?: string) {
    try {
        const account = await getAuthAccount(jwt);
        const user = await account.get();
        if (!await AuthService.verifyBrother(user.$id)) throw new Error("Unauthorized");
        
        const profile = await AuthService.getProfile(user.$id);
        if (!profile) throw new Error("Profile not found");

        // Verification that user OWNS the task they are unclaiming
        const task = await TasksService.getTask(taskId);
        // Schema uses 'assigned_to' as Profile ID (Discord ID)
        if (task.assigned_to !== profile.$id) {
             throw new Error("You do not own this task");
        }

        await TasksService.unclaimTask(taskId);
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
        const isAdmin = await AuthService.verifyRole(user.$id, HOUSING_ADMIN_ROLES as string[]);
        if (!isAdmin) throw new Error("Unauthorized (Admin Only)");

        await TasksService.verifyTask(taskId);
        revalidatePath("/dashboard/housing");
        return { success: true };
    } catch (e: any) { 
        console.error("approveTaskAction failed", e);
        return { success: false, error: e.message }; 
    }
}

export async function rejectTaskAction(taskId: string, reason: string | null, jwt?: string) {
    try {
        const account = await getAuthAccount(jwt);
        const user = await account.get();
        const isAdmin = await AuthService.verifyRole(user.$id, HOUSING_ADMIN_ROLES as string[]);
        if (!isAdmin) throw new Error("Unauthorized");

        await TasksService.rejectTask(taskId);
        revalidatePath("/dashboard/housing");
        return { success: true };
    } catch (e: any) { 
        console.error("rejectTaskAction failed", e);
        return { success: false, error: e.message }; 
    }
}

export async function createTaskAction(data: any, jwt?: string) {
    try {
        const account = await getAuthAccount(jwt);
        const user = await account.get();
        // Only Admins can CREATE/ASSIGN tasks arbitrarily
        const isAdmin = await AuthService.verifyRole(user.$id, HOUSING_ADMIN_ROLES as string[]);
        if (!isAdmin) throw new Error("Unauthorized");
        
        await TasksService.createTask(data);
        revalidatePath("/dashboard/housing");
        return { success: true };
    } catch (e: any) { 
        console.error("createTaskAction failed", e);
        return { success: false, error: e.message }; 
    }
}

export async function reassignTaskAction(taskId: string, userId: string, userName: string, jwt?: string) {
    try {
        const account = await getAuthAccount(jwt);
        const user = await account.get();
        const isAdmin = await AuthService.verifyRole(user.$id, HOUSING_ADMIN_ROLES as string[]);
        if (!isAdmin) throw new Error("Unauthorized");

        // Handle Unassign (empty string -> null)
        const targetProfileId = userId && userId.length > 0 ? userId : null;
        
        await TasksService.adminReassign(taskId, targetProfileId);
        
        revalidatePath("/dashboard/housing");
        return { success: true };
    } catch (e: any) { 
        console.error("reassignTaskAction failed", e);
        return { success: false, error: e.message }; 
    }
}

export async function getSchedulesAction(jwt?: string) {
    try {
        const account = await getAuthAccount(jwt);
        const user = await account.get();
        const isAdmin = await AuthService.verifyRole(user.$id, HOUSING_ADMIN_ROLES as string[]);
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
        return JSON.parse(JSON.stringify(res.documents));
    } catch (e) {
        console.error("Failed to fetch schedules", e);
        return [];
    }
}

export async function createScheduleAction(data: any, jwt?: string) {
    try {
        const account = await getAuthAccount(jwt);
        const user = await account.get();
        const isAdmin = await AuthService.verifyRole(user.$id, HOUSING_ADMIN_ROLES as string[]);
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
        return await AuthService.verifyRole(user.$id, HOUSING_ADMIN_ROLES as string[]);
    } catch {
        return false;
    }
}

export async function getAllMembersAction(jwt?: string) {
     try {
        // Authenticate as at least a logged in user
        const account = await getAuthAccount(jwt);
        await account.get(); 
        
        const members = await TasksService.getMembers();
        console.log(`[getAllMembersAction] Fetched ${members.length} members`);
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
        const isAdmin = await AuthService.verifyRole(user.$id, HOUSING_ADMIN_ROLES as string[]);
        if (!isAdmin) throw new Error("Unauthorized");

        const task = await TasksService.getTask(taskId);
        
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
                submitterName = submitter.full_name || submitter.discord_handle || "Brother";
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
        console.error("getReviewDetailsAction failed", e);
        return { success: false, error: "Failed to fetch details" };
    }
}
