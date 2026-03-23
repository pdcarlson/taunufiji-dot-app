import { ITaskRepository } from "@/lib/domain/ports/task.repository";
import { calculateNextInstance } from "@/lib/utils/scheduler";

/**
 * Self-heals **active** recurring schedules that have no open/pending/locked instance.
 *
 * @param taskRepository — Injected `ITaskRepository` (same contract as cron: read schedules, `findMany` by
 *   schedule, `create` duty rows, `updateSchedule` for `last_generated_at`). Callers must not pass a repository
 *   that swallows errors silently.
 * @returns Resolves to `void`. On unexpected repository failures, logs `🔥 EnsureFutureTasksJob Failed` and
 *   does not rethrow (hourly cron continues). Per-schedule failures (e.g. cannot compute next instance) log and
 *   `continue` to the next schedule.
 */
export const ensureFutureTasksJob = async (
  taskRepository: ITaskRepository,
) => {
  console.log("🛡️ Running EnsureFutureTasksJob (Self-Healing)...");

  const taskRepo = taskRepository;

  try {
    const schedules = await taskRepo.findActiveSchedules();
    let healedCount = 0;

    for (const schedule of schedules) {
      // Defensive check: intentional recurring cancellations are represented by
      // schedule deactivation and must never be resurrected by this job.
      if (!schedule.active) {
        continue;
      }

      // 1. Check for Active Tasks (Open/Pending/Locked)
      // We don't care about dates here, just existence.
      // If a task is "locked" for next year, that counts as "Future".
      const activeTasks = await taskRepo.findMany({
        scheduleId: schedule.id,
        status: ["open", "pending", "locked"],
        limit: 1,
      });

      if (activeTasks.length > 0) {
        continue;
      }

      console.warn(
        `⚠️ Schedule Missing Future Task: "${schedule.title}" (ID: ${schedule.id})`,
      );

      // 2. Calculate Next Instance from NOW
      // We pass 'new Date()' as referenceDate to ensure we don't schedule in the past
      // But we still need 'last_generated_at' or 'created' for the RRule start anchor

      const lastTasks = await taskRepo.findMany({
        scheduleId: schedule.id,
        limit: 1,
        orderBy: "createdAt",
        orderDirection: "desc",
      });

      let baseDate = new Date();
      // Try to establish the pattern anchor
      if (lastTasks.length > 0) {
        if (lastTasks[0].completed_at)
          baseDate = new Date(lastTasks[0].completed_at);
        else if (lastTasks[0].due_at) baseDate = new Date(lastTasks[0].due_at);
      } else if (schedule.last_generated_at) {
        baseDate = new Date(schedule.last_generated_at);
      }

      // Important: RRule needs the ORIGINAL anchor to calculate correctly (e.g. "Every Friday").
      // If baseDate is "Wednesday", RRule needs to know the series started on a Friday to keep the pattern?
      // Actually `scheduler.ts` sets `dtstart` to `baseDate`.
      // If we want to strictly follow the pattern but skip past dates, we should pass:
      // lastCompletedAt = baseDate
      // referenceDate = NOW

      const now = new Date();
      const nextInstance = calculateNextInstance(
        schedule.recurrence_rule,
        baseDate,
        schedule.lead_time_hours || 24,
        now, // <--- Force it to be in the future
      );

      if (!nextInstance) {
        console.error(
          `   ❌ Failed to calculate next instance for ${schedule.title}`,
        );
        continue;
      }

      console.log(
        `   🚑 Resurrecting Task... Due: ${nextInstance.dueAt.toISOString()}`,
      );

      const isLocked = nextInstance.unlockAt.getTime() > Date.now();

      await taskRepo.create({
        title: schedule.title,
        description: schedule.description,
        points_value: schedule.points_value,
        type: "duty",
        schedule_id: schedule.id,
        assigned_to: schedule.assigned_to,
        due_at: nextInstance.dueAt.toISOString(),
        unlock_at: nextInstance.unlockAt.toISOString(),
        status: isLocked ? "locked" : "open",
        notification_level: isLocked ? "none" : "unlocked",
      });

      // Update Schedule Tracking
      await taskRepo.updateSchedule(schedule.id, {
        last_generated_at: new Date().toISOString(),
      });

      healedCount++;
    }

    if (healedCount > 0) {
      console.log(
        `✅ EnsureFutureTasksJob: Resurrected ${healedCount} schedules.`,
      );
    } else {
      console.log("✅ EnsureFutureTasksJob: All schedules healthy.");
    }
  } catch (error) {
    console.error("🔥 EnsureFutureTasksJob Failed:", error);
  }
};
