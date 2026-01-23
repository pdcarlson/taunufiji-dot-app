import { Client, Databases, Query, ID, Models } from "node-appwrite";
import { env } from "../config/env";
import { DB_ID, COLLECTIONS } from "../types/schema";
import { PointsService } from "./points.service";
import { Member, HousingTask } from "@/lib/types/models";
import { calculateNextInstance } from "../utils/scheduler";
import { NotificationService } from "@/lib/services/notification.service";

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
  lead_time_hours?: number;
}

export const TasksService = {
  /**
   * Create a new task (One-off or Recurring)
   */
  async createTask(data: CreateAssignmentDTO) {
    const task = await db.createDocument(
      DB_ID,
      COLLECTIONS.ASSIGNMENTS,
      ID.unique(),
      {
        ...data,
        status: data.status || "open",
        notification_level: data.status === "locked" ? "none" : "unlocked", // Initial state
      },
    );

    // Notify Assignee if set
    if (data.assigned_to) {
      await NotificationService.sendNotification(data.assigned_to, "assigned", {
        title: task.title,
        taskId: task.$id,
      });
    }

    return task;
  },

  async getTask(taskId: string) {
    return await db.getDocument(DB_ID, COLLECTIONS.ASSIGNMENTS, taskId);
  },

  /**
   * Get all open tasks
   */
  async getOpenTasks() {
    /*
     * We want 'locked' tasks to auto-open if time passed.
     * So we fetches both Open and Locked tasks.
     * We split the query to ensure compatibility if array syntax causes issues.
     */
    const [openTasks, lockedTasks] = await Promise.all([
      db.listDocuments(DB_ID, COLLECTIONS.ASSIGNMENTS, [
        Query.equal("status", "open"),
        Query.orderDesc("$createdAt"),
      ]),
      db.listDocuments(DB_ID, COLLECTIONS.ASSIGNMENTS, [
        Query.equal("status", "locked"),
        Query.orderDesc("$createdAt"),
      ]),
    ]);

    // Combine documents
    const allDocs = [...openTasks.documents, ...lockedTasks.documents];
    const now = new Date();
    const cleanRows: Models.Document[] = [];

    for (const doc of allDocs) {
      const task = doc as unknown as HousingTask;
      if (
        task.status === "locked" &&
        task.unlock_at &&
        now >= new Date(task.unlock_at)
      ) {
        // Lazy Unlock
        await db.updateDocument(DB_ID, COLLECTIONS.ASSIGNMENTS, task.$id, {
          status: "open",
          notification_level: "unlocked",
        });
        task.status = "open";
      }

      // If it's still locked (future), hide it?
      // Or show it as Locked? The UI supports locked cards.
      // But if it WAS locked and we just opened it, show it.
      cleanRows.push(doc);
    }

    return { documents: cleanRows, total: cleanRows.length };
  },

  /**
   * Get all pending tasks (for Admin Review)
   */
  async getPendingReviews() {
    return await db.listDocuments(DB_ID, COLLECTIONS.ASSIGNMENTS, [
      Query.equal("status", "pending"),
      Query.orderDesc("$updatedAt"),
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
    await NotificationService.sendNotification(profileId, "assigned", {
      title: task.title,
      taskId: task.$id,
    });

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

    // 1b. Check Expiry
    if (task.due_at && new Date() > new Date(task.due_at)) {
      throw new Error("Task is expired. You cannot submit late.");
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
    await NotificationService.notifyAdmins(
      `📥 **SUBMISSION**: User <@${profileId}> submitted **${task.title}**.`,
      { taskId: task.$id },
    );

    return result;
  },

  async unclaimTask(taskId: string) {
    return await db.updateDocument(DB_ID, COLLECTIONS.ASSIGNMENTS, taskId, {
      status: "open",
      assigned_to: null,
      due_at: null, // Clear the deadline so it doesn't show for others
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
    await NotificationService.sendNotification(profileId, "assigned", {
      title: task.title,
      taskId: task.$id,
    });

    return result;
  },

  /**
   * Generic Admin Update
   */
  async updateTask(taskId: string, data: Partial<CreateAssignmentDTO>) {
    // 1. Fetch original to check for Assignment Changes
    const original = await this.getTask(taskId);
    const oldAssignee = original.assigned_to;
    const newAssignee = data.assigned_to;

    // 2. Perform Update
    const result = await db.updateDocument(
      DB_ID,
      COLLECTIONS.ASSIGNMENTS,
      taskId,
      {
        ...data,
      },
    );

    // 3. Handle Assignment Notifications
    if (newAssignee !== undefined && newAssignee !== oldAssignee) {
      // A. Notify Old Assignee (Unassigned)
      if (oldAssignee) {
        await NotificationService.sendNotification(oldAssignee, "unassigned", {
          title: original.title,
          taskId: taskId,
        });
      }

      // B. Notify New Assignee (Assigned)
      if (newAssignee) {
        await NotificationService.sendNotification(newAssignee, "assigned", {
          title: data.title || original.title,
          taskId: taskId,
        });
      }
    } else {
      // C. Notify Update (if assigned logic didn't fire)
      // If assignee didn't change, but other details did, and it IS assigned
      if (oldAssignee) {
        await NotificationService.sendNotification(oldAssignee, "updated", {
          title: data.title || original.title,
          taskId: taskId,
        });
      }
    }

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
      // Event-Driven: Dispatch TASK_APPROVED
      try {
        const { DomainEventBus, DomainEvents } =
          await import("@/lib/events/dispatcher");
        await DomainEventBus.publish(DomainEvents.TASK_APPROVED, {
          userId: task.assigned_to,
          taskId: taskId,
          taskTitle: task.title,
          points: awardAmount,
        });
      } catch (e) {
        console.error("Failed to dispatch TASK_APPROVED event", e);
      }
    }

    if (task.assigned_to) {
      await NotificationService.sendNotification(task.assigned_to, "approved", {
        title: task.title,
        taskId: task.$id,
        points: awardAmount,
      });
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

    // Use previous due date as the anchor for the cycle
    // If it was a legacy task without due date, use completedAt
    const completedAt = new Date(previousTask.$updatedAt);
    const prevDue = previousTask.due_at
      ? new Date(previousTask.due_at)
      : completedAt;

    const nextInstance = calculateNextInstance(
      schedule.recurrence_rule,
      prevDue,
      schedule.lead_time_hours || 24, // Use scheule setting or default 24h
    );

    if (!nextInstance) {
      console.warn(
        `Could not calculate next instance for schedule: ${schedule.$id}`,
      );
      return;
    }

    // Check if we are physically past the unlock time (e.g. late verification)
    const now = new Date();
    const isLocked = nextInstance.unlockAt.getTime() > now.getTime();

    await this.createTask({
      title: schedule.title,
      description: schedule.description,
      points_value: schedule.points_value,
      type: "duty",
      schedule_id: schedule.$id,
      assigned_to: schedule.assigned_to || previousTask.assigned_to,
      due_at: nextInstance.dueAt.toISOString(),
      unlock_at: nextInstance.unlockAt.toISOString(),
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

    // Spawn First Instance
    // For first instance, we use NOW as the baseline
    const nextInstance = calculateNextInstance(
      schedule.recurrence_rule,
      new Date(),
      24, // Default lead time for first (or fetch if we had it in DTO, but usually default)
    );

    if (nextInstance) {
      const isLocked = nextInstance.unlockAt.getTime() > Date.now();
      await this.createTask({
        title: schedule.title,
        description: schedule.description,
        points_value: schedule.points_value,
        type: "duty",
        schedule_id: schedule.$id,
        assigned_to: schedule.assigned_to,
        due_at: nextInstance.dueAt.toISOString(),
        unlock_at: nextInstance.unlockAt.toISOString(),
        status: isLocked ? "locked" : "open",
      });
    }

    return schedule;
  },

  async getSchedules() {
    return await db.listDocuments(DB_ID, COLLECTIONS.SCHEDULES, [
      Query.orderDesc("$createdAt"),
    ]);
  },

  async getSchedule(scheduleId: string) {
    return await db.getDocument(DB_ID, COLLECTIONS.SCHEDULES, scheduleId);
  },

  async updateSchedule(
    scheduleId: string,
    data: Partial<CreateScheduleDTO> & {
      active?: boolean;
      lead_time_hours?: number;
    },
  ) {
    return await db.updateDocument(
      DB_ID,
      COLLECTIONS.SCHEDULES,
      scheduleId,
      data,
    );
  },

  /**
   * Daily/Hourly Cron Job
   * 1. Unlocks tasks that have passed cooldown.
   * 2. Expires bounties that are overdue.
   */
  async runCron() {
    const now = new Date();

    // 1. Unlock Tasks
    // Status 'locked' -> 'open' if now >= unlock_at
    const lockedTasks = await db.listDocuments(DB_ID, COLLECTIONS.ASSIGNMENTS, [
      Query.equal("status", "locked"),
      Query.lessThanEqual("unlock_at", now.toISOString()),
    ]);

    const unlockPromises = lockedTasks.documents.map(async (doc) => {
      // Update status and notification level
      await db.updateDocument(DB_ID, COLLECTIONS.ASSIGNMENTS, doc.$id, {
        status: "open",
        notification_level: "unlocked",
      });

      // Notify User: "Unlocked"
      if (doc.assigned_to) {
        await NotificationService.sendNotification(
          doc.assigned_to,
          "unlocked",
          {
            title: doc.title,
            taskId: doc.$id,
          },
        );
      }
    });

    // 1.5. Backfill Notifications for Open Tasks
    // Catch tasks created directly as "open" (one-off duties, bounties) that never got unlock notification
    // Query for open tasks with no notification level set
    const uninformedTasks = await db.listDocuments(
      DB_ID,
      COLLECTIONS.ASSIGNMENTS,
      [Query.equal("status", "open"), Query.limit(100)],
    );

    // Filter for tasks that haven't been notified (notification_level is empty/none)
    const backfillNotifyPromises = uninformedTasks.documents.map(
      async (doc) => {
        // Skip if already notified or no assignee
        if (!doc.assigned_to) return;
        if (doc.notification_level && doc.notification_level !== "none") return;

        // Update notification level
        await db.updateDocument(DB_ID, COLLECTIONS.ASSIGNMENTS, doc.$id, {
          notification_level: "unlocked",
        });

        // Send unlock notification
        await NotificationService.sendNotification(
          doc.assigned_to,
          "unlocked",
          {
            title: doc.title,
            taskId: doc.$id,
          },
        );
      },
    );

    // 2. 12-Hour Urgent Notifications
    // Find 'open' tasks where due_at is within 12 hours AND notification_level == "unlocked"
    const twelveHoursFromNow = new Date(now.getTime() + 12 * 60 * 60 * 1000);

    const openTasks = await db.listDocuments(DB_ID, COLLECTIONS.ASSIGNMENTS, [
      Query.equal("status", "open"),
      Query.equal("notification_level", "unlocked"), // Only notify once after unlock
      Query.lessThanEqual("due_at", twelveHoursFromNow.toISOString()),
      Query.limit(100), // Batch size
    ]);

    const urgentPromises = openTasks.documents.map(async (doc) => {
      if (!doc.assigned_to || !doc.due_at) return;

      const dueTime = new Date(doc.due_at).getTime();

      // If task is due within next 12 hours (filtered by query), send urgent notification
      if (dueTime <= twelveHoursFromNow.getTime()) {
        await db.updateDocument(DB_ID, COLLECTIONS.ASSIGNMENTS, doc.$id, {
          notification_level: "urgent",
        });

        await NotificationService.sendNotification(doc.assigned_to, "urgent", {
          title: doc.title,
          taskId: doc.$id,
        });
      }
    });

    // 3. Expire Bounties (Claimed but Overdue)
    const claimedBounties = await db.listDocuments(
      DB_ID,
      COLLECTIONS.ASSIGNMENTS,
      [
        Query.equal("type", "bounty"),
        Query.notEqual("status", "open"),
        Query.lessThanEqual("due_at", now.toISOString()),
        Query.limit(100),
      ],
    );

    const bountyPromises = claimedBounties.documents.map((doc) =>
      this.unclaimTask(doc.$id),
    );

    // 4. Overdue Duties (Strict Expiry)
    const overdueDuties = await db.listDocuments(
      DB_ID,
      COLLECTIONS.ASSIGNMENTS,
      [
        Query.equal("status", "open"),
        Query.lessThanEqual("due_at", now.toISOString()),
        Query.limit(100),
      ],
    );

    const finePromises = overdueDuties.documents.map(async (doc) => {
      if (doc.type === "bounty" || doc.type === "project") return;

      // Check if task was submitted (pending) BEFORE expiring it
      const isPending = doc.status === "pending";

      await db.updateDocument(DB_ID, COLLECTIONS.ASSIGNMENTS, doc.$id, {
        status: "expired",
      });

      // Only notify admin if task was NOT pending (pending means user submitted proof)
      if (doc.assigned_to && !isPending) {
        await PointsService.awardPoints(doc.assigned_to, {
          amount: -50,
          reason: `Missed Duty: ${doc.title}`,
          category: "fine",
        });

        // Don't include task link for missed tasks (admin doesn't need to review)
        await NotificationService.notifyAdmins(
          `🚨 **MISSED TASK**: <@${doc.assigned_to}> failed to complete **${doc.title}**. Task expired.`,
        );
      }

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
      ...unlockPromises,
      ...backfillNotifyPromises,
      ...urgentPromises,
      ...bountyPromises,
      ...finePromises,
    ]);

    // Count how many backfill notifications were actually sent
    const backfillCount = uninformedTasks.documents.filter(
      (doc) =>
        doc.assigned_to &&
        (!doc.notification_level || doc.notification_level === "none"),
    ).length;

    // Return statistics
    return {
      unlocked: lockedTasks.total,
      backfill_notified: backfillCount,
      urgent: openTasks.documents.length,
      expired_bounties: claimedBounties.total,
      expired_duties: overdueDuties.total,
    };
  },

  async deleteTask(taskId: string) {
    return await db.deleteDocument(DB_ID, COLLECTIONS.ASSIGNMENTS, taskId);
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

          await NotificationService.sendNotification(
            task.assigned_to,
            "rejected",
            {
              title: task.title,
              taskId: task.$id,
              reason: "Missed Deadline (Expired)",
            },
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
          claimed_at: null,
          due_at: null, // Clear deadline
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
      await NotificationService.sendNotification(task.assigned_to, "rejected", {
        title: task.title,
        taskId: task.$id,
        reason: "Please check feedback and retry.",
      });
    }

    return result;
  },

  /**
   * Get tasks assigned to a specific user profile
   * @param profileId - The Database Profile ID (Discord ID)
   */
  async getMyTasks(profileId: string) {
    // 1. Get ALL assigned tasks (including approved)
    const allAssigned = await db.listDocuments(DB_ID, COLLECTIONS.ASSIGNMENTS, [
      Query.equal("assigned_to", profileId),
      Query.orderDesc("$createdAt"),
    ]);

    // 2. Iterate and Lazy Update (Fire & Forget Logic for Speed, or Await for Consistency?)
    // We await critical changes to ensure the returned list is clean.
    const now = new Date();
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const filtered: Models.Document[] = [];

    for (const task of allAssigned.documents) {
      const taskDoc = task as unknown as HousingTask;

      // Filter A: Approved (User requested these be hidden immediately)
      if (taskDoc.status === "approved") {
        continue;
      }

      // Filter B: Expired (Don't show)
      if (taskDoc.status === "expired") {
        continue;
      }

      // Lazy Check B: Stuck in "Locked" but Time Passed
      if (
        taskDoc.status === "locked" &&
        taskDoc.unlock_at &&
        now >= new Date(taskDoc.unlock_at)
      ) {
        // Fix it now
        // Don't await strictly unless required, but we want to show it as OPEN.
        // We will push a modified object to UI, update DB in background.
        // ACTUALLY: Update DB immediately so next refresh is fast.
        await db.updateDocument(DB_ID, COLLECTIONS.ASSIGNMENTS, taskDoc.$id, {
          status: "open",
          notification_level: "unlocked",
        });
        // Mutate local object to show correct state
        taskDoc.status = "open";
        filtered.push(taskDoc as unknown as Models.Document);
        continue;
      }

      // Lazy Check C: Open/Pending but Expired (Duty)
      // Logic mirrors runCron
      // Note: We already filtered out 'approved' and 'expired' above.
      // CRITICAL FIX: Do NOT expire tasks that have proof submitted (pending review)
      if (
        taskDoc.status !== "rejected" &&
        taskDoc.type !== "bounty" &&
        taskDoc.due_at &&
        now > new Date(taskDoc.due_at) &&
        !taskDoc.proof_s3_key // FIX: Only expire if NO PROOF
      ) {
        // IT IS EXPIRED
        // 1. Mark Expired
        await db.updateDocument(DB_ID, COLLECTIONS.ASSIGNMENTS, taskDoc.$id, {
          status: "expired",
        });

        // 2. Fine User (if not already fined - difficult to track "already fined" without flag)
        // Check notification_level or status history?
        // Status changes to 'expired', so next load it falls into ignored category (unless we show expired).
        // WE DO NOT SHOW EXPIRED TASKS in "My Tasks" (per user request to remove them).
        // So we just perform the fine and DROP it.

        await PointsService.awardPoints(profileId, {
          amount: -50,
          reason: `Missed Duty: ${taskDoc.title}`,
          category: "fine",
        });

        await NotificationService.notifyAdmins(
          `🚨 **MISSED TASK**: <@${profileId}> failed to complete **${taskDoc.title}**. Task expired.`,
          { taskId: taskDoc.$id },
        );

        // 3. Recur
        if (taskDoc.schedule_id) {
          try {
            await this.triggerNextInstance(taskDoc.schedule_id, taskDoc);
          } catch (e) {
            console.error("Lazy Recur failed", e);
          }
        }

        // DROP from filtered list
        continue;
      }

      // Lazy Check D: Open Bounty but Expired (Assigned)
      if (
        taskDoc.type === "bounty" &&
        taskDoc.status !== "open" &&
        // Already filtered "approved" and "expired" above
        taskDoc.due_at &&
        now > new Date(taskDoc.due_at)
      ) {
        // Expired Claim
        await this.unclaimTask(taskDoc.$id);
        // DROP from filtered list (no longer assigned to me)
        continue;
      }

      // If we survived checks, keep it
      filtered.push(task);
    }

    return { documents: filtered, total: filtered.length };
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
};
