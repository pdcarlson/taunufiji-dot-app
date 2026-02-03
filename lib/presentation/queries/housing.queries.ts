import "server-only";

import { QueryService } from "@/lib/application/services/task/query.service";
import { ScheduleService } from "@/lib/application/services/task/schedule.service";
import { AppwriteTaskRepository } from "@/lib/infrastructure/persistence/task.repository";
import { AppwriteUserRepository } from "@/lib/infrastructure/persistence/user.repository";

// REPOSITORIES (Uses getAdminClient() internally, safe for server components)
const taskRepo = new AppwriteTaskRepository();
const userRepo = new AppwriteUserRepository();

// SERVICES
// We use the same service logic as the rest of the application
const queryService = new QueryService(taskRepo, userRepo);
const scheduleService = new ScheduleService(taskRepo);

/**
 * Fetch all active tasks (Server Side)
 * Returns plain JSON-serializable objects (since HousingTask uses strings for dates)
 */
export async function fetchAllTasks() {
  try {
    const tasks = await queryService.getAllActiveTasks();
    // Ensure serialization just in case, though schema suggests it's clean
    return JSON.parse(JSON.stringify(tasks));
  } catch (error) {
    console.error("Failed to prefetch tasks:", error);
    return [];
  }
}

/**
 * Fetch all members (Server Side)
 */
export async function fetchAllMembers() {
  try {
    const members = await queryService.getMembers();
    return JSON.parse(JSON.stringify(members));
  } catch (error) {
    console.error("Failed to prefetch members:", error);
    return [];
  }
}

/**
 * Fetch all schedules (Server Side)
 */
export async function fetchAllSchedules() {
  try {
    const schedules = await scheduleService.getSchedules();
    return JSON.parse(JSON.stringify(schedules));
  } catch (error) {
    console.error("Failed to prefetch schedules:", error);
    return [];
  }
}
