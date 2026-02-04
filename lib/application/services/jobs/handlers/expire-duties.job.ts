import { ITaskRepository } from "@/lib/domain/ports/task.repository";
import { IPointsService } from "@/lib/domain/ports/services/points.service.port";
import { ScheduleService } from "@/lib/application/services/housing/schedule.service";

export const ExpireDutiesJob = {
  async run(
    taskRepository: ITaskRepository,
    pointsService: IPointsService,
    scheduleService: ScheduleService,
  ): Promise<{ errors: string[] }> {
    const errors: string[] = [];
    const now = new Date();

    try {
      const allOpenTasks = await taskRepository.findMany({
        status: "open",
        limit: 100,
      });

      // Filter for overdue tasks
      const overdueTasks = allOpenTasks.filter((task) => {
        if (!task.due_at) return false;
        return new Date(task.due_at) <= now;
      });

      console.log(`⏱️ Found ${overdueTasks.length} overdue tasks`);

      for (const task of overdueTasks) {
        try {
          if (task.type === "bounty" || task.type === "project") continue;

          await taskRepository.update(task.id, {
            status: "expired",
          });

          if (task.assigned_to) {
            await pointsService.awardPoints(task.assigned_to, {
              amount: -50,
              reason: `Missed Duty: ${task.title}`,
              category: "fine",
            });
          }

          if (task.schedule_id) {
            try {
              await scheduleService.triggerNextInstance(task.schedule_id, task);
            } catch (e) {
              console.error(
                `Failed to trigger next instance for ${task.id}:`,
                e,
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
  },
};
