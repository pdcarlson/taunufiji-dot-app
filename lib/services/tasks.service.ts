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

    // 2. Halfway Notifications
    // Find 'open' tasks where now > halfway point AND notification_level == "unlocked" (or "none")
    // Note: Appwrite Math is limited. We fetch OPEN tasks with notification_level != 'halfway'
    // Then filter in memory for simplicity (unless scale is huge).
    const openTasks = await db.listDocuments(DB_ID, COLLECTIONS.ASSIGNMENTS, [
      Query.equal("status", "open"),
      Query.notEqual("notification_level", "halfway"), // Don't spam
      Query.notEqual("notification_level", "urgent"), // Don't regress
      Query.limit(100), // Batch size
    ]);

    const halfwayPromises = openTasks.documents.map(async (doc) => {
      if (!doc.assigned_to || !doc.due_at) return;

      // Start time is CreatedAt (One-off) or UnlockAt (Recurring)
      const startTime = doc.unlock_at
        ? new Date(doc.unlock_at).getTime()
        : new Date(doc.$createdAt).getTime();
      const dueTime = new Date(doc.due_at).getTime();
      const duration = dueTime - startTime;

      if (duration <= 0) return; // Weird data

      const halfwayPoint = startTime + duration / 2;

      if (now.getTime() > halfwayPoint) {
        // Update Level
        await db.updateDocument(DB_ID, COLLECTIONS.ASSIGNMENTS, doc.$id, {
          notification_level: "halfway",
        });

        // Notify User: "Halfway"
        await NotificationService.sendNotification(doc.assigned_to, "halfway", {
          title: doc.title,
          taskId: doc.$id,
        });
      }
    });

    // 3. Expire Bounties
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

    // 4. Fine Overdue Duties
    // Duties that are Open and Due Date passed
    const overdueDuties = await db.listDocuments(
      DB_ID,
      COLLECTIONS.ASSIGNMENTS,
      [
        Query.equal("status", "open"),
        Query.lessThanEqual("due_at", now.toISOString()),
      ],
    );

    const finePromises = overdueDuties.documents.map(async (doc) => {
      if (doc.type === "bounty" || doc.type === "project") return;

      // A. Mark as Expired
      await db.updateDocument(DB_ID, COLLECTIONS.ASSIGNMENTS, doc.$id, {
        status: "expired",
      });

      // B. Fine User
      if (doc.assigned_to) {
        await PointsService.awardPoints(doc.assigned_to, {
          amount: -50,
          reason: `Missed Duty: ${doc.title}`,
          category: "fine",
        });

        // Notify User: "Rejected" (or similar Missed message)
        // Using generic notifyUser for now as Matrix didn't specify "Missed" exactly but "Rejected" is close
        // Or we can add "fine" type. Let's stick to standard message.
        await NotificationService.notifyUser(
          doc.assigned_to,
          `❌ **Missed Task**: You missed **${doc.title}**! (-50 pts)`,
        );

        // Notify Admin
        await NotificationService.notifyAdmins(
          `🚨 **MISSED TASK**: <@${doc.assigned_to}> missed **${doc.title}**.`,
          { taskId: doc.$id },
        );
      }

      // C. Trigger Next Instance
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
      ...halfwayPromises,
      ...expirePromises,
      ...finePromises,
    ]);

    return {
      unlocked: lockedTasks.total,
      halfway: openTasks.documents.filter(
        (d) => d.notification_level === "halfway",
      ).length, // Approximate count from this run
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
};
