import { AppwriteTaskRepository } from "@/lib/infrastructure/persistence/task.repository";
import { PointsService } from "@/lib/application/services/ledger/points.service";
import { ScheduleService } from "@/lib/application/services/housing/schedule.service";
import { AppwriteLedgerRepository } from "@/lib/infrastructure/persistence/ledger.repository";
import { AppwriteUserRepository } from "@/lib/infrastructure/persistence/user.repository";
import { HOUSING_CONSTANTS } from "@/lib/constants";

// Helper to construct services (DI Container Lite)
function getServices() {
  const taskRepo = new AppwriteTaskRepository();
  const ledgerRepo = new AppwriteLedgerRepository();
  const userRepo = new AppwriteUserRepository();

  const pointsService = new PointsService(userRepo, ledgerRepo);
  const scheduleService = new ScheduleService(taskRepo);

  return { taskRepo, pointsService, scheduleService };
}

export const expireDutiesJob = async (): Promise<{ errors: string[] }> => {
  const { taskRepo, pointsService, scheduleService } = getServices();
  const errors: string[] = [];
  const now = new Date();

  console.log("⏰ Running ExpireDutiesJob...");

  try {
    const allOpenTasks = await taskRepo.findMany({
      status: "open",
      limit: 100,
    });

    // Filter for overdue tasks
    const overdueTasks = allOpenTasks.filter((task) => {
      if (!task.due_at) return false;
      return new Date(task.due_at) <= now;
    });

    console.log(`   Found ${overdueTasks.length} overdue tasks.`);

    for (const task of overdueTasks) {
      try {
        if (task.type === "bounty" || task.type === "project") continue;

        console.log(`   Expiring task: "${task.title}" (ID: ${task.id})`);

        await taskRepo.update(task.id, {
          status: "expired",
        });

        if (task.assigned_to) {
          try {
            await pointsService.awardPoints(task.assigned_to, {
              amount: -Math.abs(HOUSING_CONSTANTS.FINE_MISSING_DUTY),
              reason: `Missed Duty: ${task.title}`,
              category: "fine",
            });
          } catch (e) {
            console.error(`   Failed to fine user for ${task.id}`, e);
          }
        }

        if (task.schedule_id) {
          try {
            await scheduleService.triggerNextInstance(task.schedule_id, task);
            console.log(
              `   Triggered next instance for schedule ${task.schedule_id}`,
            );
          } catch (e) {
            // CRITICAL: If this fails, the recurrence chain breaks.
            console.error(
              `🚨 CRITICAL SCHEDULER ERROR: Failed to trigger next instance for expired task ${task.id} (Schedule: ${task.schedule_id})`,
              e,
            );
            errors.push(
              `Scheduler Failed for ${task.id}: ${e instanceof Error ? e.message : String(e)}`,
            );
          }
        }
      } catch (error: unknown) {
        const errMsg = `Failed to expire task ${task.id}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errMsg);
        errors.push(errMsg);
      }
    }
  } catch (error: unknown) {
    const errMsg = `Failed to query overdue tasks: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errMsg);
    errors.push(errMsg);
  }

  return { errors };
};
