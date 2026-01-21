import { Client, Databases, Query, ID, Models } from "node-appwrite";
import { env } from "../config/env";
import { DB_ID, COLLECTIONS } from "../types/schema";
import { PointsService } from "./points.service";
import { Member, HousingTask } from "@/lib/types/models";

// Server-side Admin Client
const client = new Client()
  .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(env.APPWRITE_API_KEY!);

const db = new Databases(client);

export interface CreateAssignmentDTO {
  title: string;
  description: string;
  points_value: number;
  type: "duty" | "bounty" | "project" | "one_off";
  schedule_id?: string;
  initial_image_s3_key?: string;
  assigned_to?: string;
  due_at?: string;
  expires_at?: string;
  unlock_at?: string;
  status?: "open" | "pending" | "locked";
  is_fine?: boolean;
  execution_limit?: number;
}

export interface CreateScheduleDTO {
  title: string;
  description: string;
  points_value: number;
  recurrence_rule: string;
  assigned_to?: string;
}

export const TasksService = {
  /**
   * Create a new task (One-off or Recurring)
   */
  async createTask(data: CreateAssignmentDTO) {
    return await db.createDocument(
      DB_ID,
      COLLECTIONS.ASSIGNMENTS,
      ID.unique(),
      {
        ...data,
        status: data.status || "open",
      },
    );
  },

  async getTask(taskId: string) {
    return await db.getDocument(DB_ID, COLLECTIONS.ASSIGNMENTS, taskId);
  },

  /**
   * Get all open tasks
   */
  async getOpenTasks() {
    return await db.listDocuments(DB_ID, COLLECTIONS.ASSIGNMENTS, [
      Query.equal("status", "open"),
      Query.orderDesc("$createdAt"),
    ]);
  },

  /**
   * Claim a task
   * @param profileId - The Database Profile ID (Discord ID)
   */
  async claimTask(taskId: string, profileId: string) {
    // 1. Fetch to check status and execution limit
    const task = (await db.getDocument(
      DB_ID,
      COLLECTIONS.ASSIGNMENTS,
      taskId,
    )) as HousingTask;

    if (task.status !== "open") {
      throw new Error("Task is not available to be claimed.");
    }

    // Security: Recurrence Cooldown Check?
    // Usually status='locked' covers this, but 'status' check above handles 'locked', 'pending', 'approved'.

    const updates: Partial<CreateAssignmentDTO> = {
      status: "pending",
      assigned_to: profileId,
    };

    // 2. Set Deadline if limit exists
    if (task.execution_limit && task.execution_limit > 0) {
      const due = new Date();
      due.setDate(due.getDate() + task.execution_limit);
      updates.due_at = due.toISOString();
    }

    const result = await db.updateDocument(
      DB_ID,
      COLLECTIONS.ASSIGNMENTS,
      taskId,
      updates,
    );

    // Notify User
    await this._notifyUser(
      profileId,
      `You have successfully claimed **${task.title}**.`,
    );

    return result;
  },

  async submitProof(taskId: string, profileId: string, s3Key: string) {
    // 1. Verify Ownership
    const task = (await db.getDocument(
      DB_ID,
      COLLECTIONS.ASSIGNMENTS,
      taskId,
    )) as HousingTask;

    if (task.assigned_to !== profileId) {
      throw new Error("You are not assigned to this task.");
    }

    const result = await db.updateDocument(
      DB_ID,
      COLLECTIONS.ASSIGNMENTS,
      taskId,
      {
        status: "pending", // Move back to pending (review) if it was something else? Usually 'pending'.
        proof_s3_key: s3Key,
      },
    );

    // Notify Admin
    await this._notifyAdmins(
      `📥 **SUBMISSION**: User <@${profileId}> submitted **${task.title}**.`,
    );

    return result;
  },

  async unclaimTask(taskId: string) {
    return await db.updateDocument(DB_ID, COLLECTIONS.ASSIGNMENTS, taskId, {
      status: "open",
      assigned_to: null,
    });
  },

  /**
   * Admin Reassignment Logic
   * - Unassign: Clear assignee, set to Open.
   * - Reassign: Set new assignee.
   *   - If Recurring Duty: Reset Deadline to Now + Interval (Fairness).
   */
  async adminReassign(taskId: string, profileId: string | null) {
    // 1. Unassign
    if (!profileId) {
      return await db.updateDocument(DB_ID, COLLECTIONS.ASSIGNMENTS, taskId, {
        status: "open",
        assigned_to: null,
      });
    }

    // 2. Reassign
    const task = await this.getTask(taskId);
    const updates: Partial<CreateAssignmentDTO> = {
      status: "open", // Reset status to open (if it was pending/rejected)
      assigned_to: profileId,
    };

    // 3. Fairness Logic (Reset Deadline for Recurring Duties)
    if (task.schedule_id) {
      try {
        const schedule = await db.getDocument(
          DB_ID,
          COLLECTIONS.SCHEDULES,
          task.schedule_id,
        );
        const intervalDays = parseInt(schedule.recurrence_rule);

        if (!isNaN(intervalDays)) {
          const newDue = new Date();
          newDue.setDate(newDue.getDate() + intervalDays);
          updates.due_at = newDue.toISOString();
        }
      } catch (e) {
        console.warn("Could not fetch schedule to reset deadline", e);
      }
    }

    const result = await db.updateDocument(
      DB_ID,
      COLLECTIONS.ASSIGNMENTS,
      taskId,
      updates,
    );

    // Notify New Assignee
    await this._notifyUser(
      profileId,
      `🔔 You have been assigned to: **${task.title}**.`,
    );

    return result;
  },

  async verifyTask(taskId: string) {
    // 1. Approve current task
    const task = await db.updateDocument(
      DB_ID,
      COLLECTIONS.ASSIGNMENTS,
      taskId,
      {
        status: "approved",
      },
    );

    // 1a. Award Points
    // Duties = 0 Points (Duty fulfilled)
    // Bounties/Projects = standard points
    const isDuty = task.type === "duty" || task.type === "one_off";
    const awardAmount = isDuty ? 0 : task.points_value || 0;

    if (task.assigned_to && awardAmount !== 0) {
      await PointsService.awardPoints(task.assigned_to, {
        amount: awardAmount,
        reason: `Completed: ${task.title}`,
        category: "task",
      });
    }

    if (task.assigned_to) {
      await this._notifyUser(
        task.assigned_to,
        `✅ **APPROVED**: Your task **${task.title}** was verified! (+${awardAmount} pts)`,
      );
    }

    // 2. Check for Recurrence
    if (task.schedule_id) {
      try {
        await this.triggerNextInstance(
          task.schedule_id,
          task as unknown as HousingTask,
        );
      } catch (e) {
        console.error("Failed to trigger next instance", e);
        // Don't fail the verification just because recurrence failed
      }
    }

    return task;
  },

  /**
   * Generates the next instance of a recurring task
   */
  async triggerNextInstance(scheduleId: string, previousTask: HousingTask) {
    const schedule = await db.getDocument(
      DB_ID,
      COLLECTIONS.SCHEDULES,
      scheduleId,
    );

    if (!schedule.active) return;

    const intervalDays = parseInt(schedule.recurrence_rule); // Simple "Every X Days"
    if (isNaN(intervalDays)) {
      console.warn(`Unsupported recurrence rule: ${schedule.recurrence_rule}`);
      return;
    }

    // Calculate Dates
    const now = new Date();
    const completedAt = new Date(previousTask.$updatedAt); // verification time
    const prevDue = previousTask.due_at
      ? new Date(previousTask.due_at)
      : completedAt;

    // Next Due = Previous Due + Interval (Keep the cycle)
    const nextDue = new Date(
      prevDue.getTime() + intervalDays * 24 * 60 * 60 * 1000,
    );

    // Unlock Time = MAX(Start of Next Cycle, Completed + Half Interval)
    // Start of Next Cycle = Next Due - Interval (which is prevDue? No, purely date based)
    // If cycle is strict: Cycle Start = prevDue + 1ms?
    // User Logic: "Time until next cycle" vs "50% of time cycle since last submitted".
    // "Next Cycle" starts immediately after the previous one ends effectively.
    // If due date is Day 7. Next cycle starts Day 7.
    // So "Time until next cycle" means "Wait until Day 7".
    // If completed on Day 2. wait until Day 7.
    // If completed on Day 7. wait until Day 7 + (7/2) = Day 10.5.

    const cycleStart = new Date(prevDue.getTime()); // The scheduled start of the new period
    const halfIntervalMs = (intervalDays * 24 * 60 * 60 * 1000) / 2;
    const cooldownEnd = new Date(completedAt.getTime() + halfIntervalMs);

    // Unlock at the LATER of the two
    const unlockAt =
      cycleStart.getTime() > cooldownEnd.getTime() ? cycleStart : cooldownEnd;

    // If we are ALREADY past the unlock time (e.g. verifying late), unlock immediately
    const isLocked = unlockAt.getTime() > now.getTime();

    await this.createTask({
      title: schedule.title,
      description: schedule.description,
      points_value: schedule.points_value,
      type: "duty",
      schedule_id: schedule.$id,
      assigned_to: schedule.assigned_to || previousTask.assigned_to, // Keep assignment? Use template default first
      due_at: nextDue.toISOString(),
      unlock_at: unlockAt.toISOString(),
      status: isLocked ? "locked" : "open",
    });

    // Update Schedule Metadata
    await db.updateDocument(DB_ID, COLLECTIONS.SCHEDULES, schedule.$id, {
      last_generated_at: new Date().toISOString(),
    });
  },

  async createSchedule(data: CreateScheduleDTO) {
    const schedule = await db.createDocument(
      DB_ID,
      COLLECTIONS.SCHEDULES,
      ID.unique(),
      {
        ...data,
        active: true,
        last_generated_at: new Date().toISOString(),
      },
    );

    // Spawn First Instance Immediately (Open)
    await this.createTask({
      title: schedule.title,
      description: schedule.description,
      points_value: schedule.points_value,
      type: "duty",
      schedule_id: schedule.$id,
      assigned_to: schedule.assigned_to,
      // due_at: now + interval? Or just Open?
      // Usually "Due in X days".
      due_at: new Date(
        Date.now() + parseInt(schedule.recurrence_rule) * 24 * 60 * 60 * 1000,
      ).toISOString(),
      status: "open",
    });

    return schedule;
  },

  async getSchedules() {
    return await db.listDocuments(DB_ID, COLLECTIONS.SCHEDULES, [
      Query.orderDesc("$createdAt"),
    ]);
  },

  /**
   * Daily/Hourly Cron Job
   * 1. Unlocks tasks that have passed cooldown.
   * 2. Expires bounties that are overdue.
   */
  async runCron() {
    const now = new Date();

    // 0. 12-Hour Reminders
    // Query: status=open AND due_at < (now + 12h) AND reminded != true
    // Note: Appwrite Query support for "between" or "math" is limited.
    // We check due_at < Now+12h.
    const twelveHoursLater = new Date(now.getTime() + 12 * 60 * 60 * 1000);

    const nearDueTasks = await db.listDocuments(
      DB_ID,
      COLLECTIONS.ASSIGNMENTS,
      [
        Query.equal("status", "open"),
        Query.lessThan("due_at", twelveHoursLater.toISOString()),
        Query.greaterThan("due_at", now.toISOString()), // Not yet overdue
        Query.notEqual("reminded", true), // Avoid spam
      ],
    );

    const reminderPromises = nearDueTasks.documents.map(async (doc) => {
      await db.updateDocument(DB_ID, COLLECTIONS.ASSIGNMENTS, doc.$id, {
        reminded: true,
      });
      if (doc.assigned_to) {
        await this._notifyUser(
          doc.assigned_to,
          `⏰ Reminder: **${doc.title}** is due in less than 12 hours!`,
        );
      }
    });

    // 1. Unlock Tasks
    const lockedTasks = await db.listDocuments(DB_ID, COLLECTIONS.ASSIGNMENTS, [
      Query.equal("status", "locked"),
      Query.lessThanEqual("unlock_at", now.toISOString()),
    ]);

    const unlockPromises = lockedTasks.documents.map((doc) => {
      // Notify? Maybe not needed for unlock.
      return db.updateDocument(DB_ID, COLLECTIONS.ASSIGNMENTS, doc.$id, {
        status: "open",
      });
    });

    // 2. Expire Bounties
    const expiredBounties = await db.listDocuments(
      DB_ID,
      COLLECTIONS.ASSIGNMENTS,
      [
        Query.equal("status", "open"),
        Query.equal("type", "bounty"),
        Query.lessThanEqual("expires_at", now.toISOString()),
      ],
    );

    const expirePromises = expiredBounties.documents.map((doc) =>
      db.updateDocument(DB_ID, COLLECTIONS.ASSIGNMENTS, doc.$id, {
        status: "expired",
      }),
    );

    // 3. Fine Overdue Duties
    const overdueDuties = await db.listDocuments(
      DB_ID,
      COLLECTIONS.ASSIGNMENTS,
      [
        Query.equal("status", "open"),
        // Query.notEqual("type", "bounty") is hard if "type" index not perfect, but we check logic below
        Query.lessThanEqual("due_at", now.toISOString()),
      ],
    );

    const finePromises = overdueDuties.documents.map(async (doc) => {
      if (doc.type === "bounty" || doc.type === "project") return; // Skip non-fined types here (or handle above)

      // A. Mark as Expired
      await db.updateDocument(DB_ID, COLLECTIONS.ASSIGNMENTS, doc.$id, {
        status: "expired",
      });

      // B. Deduct Points (Fine)
      if (doc.assigned_to) {
        // Fine User
        await PointsService.awardPoints(doc.assigned_to, {
          amount: -50,
          reason: `Missed Duty: ${doc.title}`,
          category: "fine",
        });

        // Notify User
        await this._notifyUser(
          doc.assigned_to,
          `❌ You missed **${doc.title}**! (-50 pts)`,
        );

        // Notify Admin (Private Ping via Channel?)
        // "User X missed Task Y"
        await this._notifyAdmins(
          `🚨 **MISSED TASK**: User <@${doc.assigned_to}> missed **${doc.title}**.`,
        );
      }

      // C. Trigger Next Instance (if recurring)
      if (doc.schedule_id) {
        try {
          await this.triggerNextInstance(
            doc.schedule_id,
            doc as unknown as HousingTask,
          );
        } catch (e) {
          console.error("Recurrence failed for fined task", e);
        }
      }
    });

    await Promise.all([
      ...reminderPromises,
      ...unlockPromises,
      ...expirePromises,
      ...finePromises,
    ]);

    return {
      reminded: nearDueTasks.total,
      unlocked: lockedTasks.total,
      expired: expiredBounties.total + overdueDuties.total,
    };
  },

  async rejectTask(taskId: string) {
    const task = (await db.getDocument(
      DB_ID,
      COLLECTIONS.ASSIGNMENTS,
      taskId,
    )) as HousingTask;

    const now = new Date();
    const dueAt = task.due_at ? new Date(task.due_at) : null;
    const isExpired = dueAt && now > dueAt;

    // Case 1: Deadline Passed
    if (isExpired) {
      // 1A: Recurrring Duty or One-off -> Penalty & Delete
      if (task.type === "duty" || task.type === "one_off") {
        // Penalty
        if (task.assigned_to) {
          await PointsService.awardPoints(task.assigned_to, {
            amount: -50,
            reason: "Missed deadline (rejected)",
            category: "fine",
          });

          await this._notifyUser(
            task.assigned_to,
            `❌ **REJECTED**: You missed **${task.title}** and it is now expired. (-50 pts)`,
          );
        }

        // Trigger Next Instance (if recurring)
        if (task.schedule_id) {
          await this.triggerNextInstance(task.schedule_id, task);
        }

        // Delete failed task
        return await db.deleteDocument(DB_ID, COLLECTIONS.ASSIGNMENTS, taskId);
      }

      // 1B: Bounty -> Return to Pool
      if (task.type === "bounty") {
        return await db.updateDocument(DB_ID, COLLECTIONS.ASSIGNMENTS, taskId, {
          status: "open",
          assigned_to: null,
          proof_s3_key: null,
          claimed_at: null, // assuming we track this, if not ignore
        });
      }
    }

    // Case 2: Deadline NOT Passed -> Allow Retry
    const result = await db.updateDocument(
      DB_ID,
      COLLECTIONS.ASSIGNMENTS,
      taskId,
      {
        status: "rejected",
        proof_s3_key: null,
      },
    );

    if (task.assigned_to) {
      await this._notifyUser(
        task.assigned_to,
        `⚠️ **REJECTED**: Your submission for **${task.title}** was rejected. Please retry before the deadline.`,
      );
    }

    return result;
  },

  /**
   * Get tasks assigned to a specific user profile
   * @param profileId - The Database Profile ID (Discord ID)
   */
  async getMyTasks(profileId: string) {
    return await db.listDocuments(DB_ID, COLLECTIONS.ASSIGNMENTS, [
      Query.equal("assigned_to", profileId),
      Query.notEqual("status", "approved"),
      Query.orderDesc("$createdAt"),
    ]);
  },

  /**
   * Get history for a specific user profile
   * @param profileId - The Database Profile ID (Discord ID)
   */
  async getHistory(profileId: string) {
    return await db.listDocuments(DB_ID, COLLECTIONS.ASSIGNMENTS, [
      Query.equal("assigned_to", profileId),
      Query.equal("status", "approved"),
      Query.orderDesc("$createdAt"),
    ]);
  },

  async getMembers(): Promise<Member[]> {
    // Fetch all users
    const users = await db.listDocuments(DB_ID, COLLECTIONS.USERS, [
      Query.limit(100),
      Query.orderAsc("full_name"),
    ]);
    return users.documents as unknown as Member[];
  },

  async getUserProfile(profileId: string) {
    const UserService = (await import("./user.service")).UserService;
    try {
      return await UserService.getByDiscordId(profileId);
    } catch (e) {
      console.warn(`TasksService: User ${profileId} not found.`);
      return null;
    }
  },

  /**
   * Helper to notify User safely
   */
  async _notifyUser(profileId: string, message: string) {
    try {
      if (!profileId) return;
      const user = await this.getUserProfile(profileId);
      if (user && user.discord_id) {
        const { NotificationService } = await import("./notification.service");
        await NotificationService.notifyUser(user.discord_id, message);
      }
    } catch (e) {
      console.warn("Failed to notify user", e);
    }
  },

  /**
   * Helper to Notify Admins (e.g. Housing Chairs)
   */
  async _notifyAdmins(message: string) {
    // Ideally fetch users with Housing Admin Roles.
    // For MVP/Serverless efficiency, we might just ping the Chair if ID known, or iterate cached admins.
    // Let's rely on ROLES constant.
    const { ROLES } = await import("@/lib/config/roles");
    // We can't query users by Role easily without Discord API call.
    // Instead: Query Users who have position_key = 'housing_chair' or similar if we tracked it?
    // Alternative: Just ping the Housing Chair specifically if ID is static?
    // ROLES.HOUSING_CHAIR is a ROLE ID, not User ID.
    // WE NEED A WAY TO FIND ADMINS.
    // Fallback: Notify a specific channel?
    // User asked for "Private Ping".
    // Let's search DB for users with position_key if feasible, or just skip for now until we have "Admin Discovery".
    // WAIT: User Service -> listAdmins?
    // Let's implement a basic "Notify Channel" for Admins as fallback, or leave placeholder.
    // Recommendation: Notify the HOUSING_CHANNEL but tag the Role?

    // Actually, let's just use the NotificationService to msg the channel if defined.
    const { NotificationService } = await import("./notification.service");
    if (process.env.DISCORD_HOUSING_CHANNEL_ID) {
      await NotificationService.notifyChannel(
        process.env.DISCORD_HOUSING_CHANNEL_ID,
        message,
      );
    }
  },
};
