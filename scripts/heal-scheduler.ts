import fs from "fs";
import path from "path";

// Load .env.local manually since we can't rely on dotenv or next dev here
try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf-8");
    envConfig.split("\n").forEach((line) => {
      const [key, ...values] = line.split("=");
      if (key && values.length > 0) {
        const val = values
          .join("=")
          .trim()
          .replace(/^["']|["']$/g, "");
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = val;
        }
      }
    });
    console.log("✅ Loaded .env.local");
  }
} catch (e) {
  console.warn("⚠️ Failed to load .env.local manually", e);
}

import { AppwriteTaskRepository } from "@/lib/infrastructure/persistence/task.repository";
import { calculateNextInstance } from "@/lib/utils/scheduler";
import { getDatabase } from "@/lib/infrastructure/persistence/client";

// MOCK Container-ish setup since we are in a script
const taskRepo = new AppwriteTaskRepository();

async function healScheduler() {
  console.log("🚑 Starting Scheduler Healer...");

  try {
    // 1. Get All Active Schedules
    console.log("🔍 Fetching active schedules...");
    const schedules = await taskRepo.findActiveSchedules();
    console.log(`found ${schedules.length} active schedules.`);

    let healedCount = 0;

    for (const schedule of schedules) {
      // 2. Check for Future Tasks
      // We look for ANY task linked to this schedule that is NOT expired
      // and has a due date in the future (or is Open/Pending/Locked).
      // Actually, simplest check: "Is there a task for this schedule that is 'open', 'pending' or 'locked'?"
      // If NO -> The chain is broken.

      const activeTasks = await taskRepo.findMany({
        scheduleId: schedule.id,
        status: ["open", "pending", "locked"],
        limit: 1, // We only need to know if ONE exists
        orderBy: "due_at",
        orderDirection: "desc",
      });

      if (activeTasks.length > 0) {
        // Chain is alive
        // console.log(`✅ Schedule "${schedule.title}" is alive.`);
        continue;
      }

      console.warn(
        `⚠️ BROKEN CHAIN DETECTED: "${schedule.title}" (ID: ${schedule.id})`,
      );
      console.log(`   No open/pending/locked tasks found.`);

      // 3. Find Last Task Reference to calculate next date
      // We need the very last task created for this schedule (even if approved/expired)
      const lastTasks = await taskRepo.findMany({
        scheduleId: schedule.id,
        limit: 1,
        orderBy: "createdAt",
        orderDirection: "desc",
      });

      let baseDate = new Date(); // Default to NOW if never ran? Or maybe last_generated_at

      if (lastTasks.length > 0) {
        const lastTask = lastTasks[0];
        console.log(
          `   Last Task: "${lastTask.title}" (${lastTask.status}) - Due: ${lastTask.due_at}`,
        );

        // Use logic from ScheduleService:
        // If completed, use completed_at. If not, use due_at.
        if (lastTask.completed_at) {
          baseDate = new Date(lastTask.completed_at);
        } else if (lastTask.due_at) {
          baseDate = new Date(lastTask.due_at);
        }
      } else {
        console.log(`   No previous tasks found. Starting fresh from NOW.`);
      }

      // 4. Calculate Resurrection Date
      const nextInstance = calculateNextInstance(
        schedule.recurrence_rule,
        baseDate,
        schedule.lead_time_hours || 24,
      );

      if (!nextInstance) {
        console.error(`   ❌ Failed to calculate next instance. Skipping.`);
        continue;
      }

      console.log(`   🚑 Resurrecting...`);
      console.log(`      Due At:    ${nextInstance.dueAt.toISOString()}`);
      console.log(`      Unlock At: ${nextInstance.unlockAt.toISOString()}`);

      const isLocked = nextInstance.unlockAt.getTime() > Date.now();

      // 5. Create the Task
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

      // Update Schedule
      await taskRepo.updateSchedule(schedule.id, {
        last_generated_at: new Date().toISOString(),
      });

      console.log(`   ✅ HEALED.`);
      healedCount++;
    }

    console.log(`\n🎉 Done. Resurrected ${healedCount} schedules.`);
  } catch (error) {
    console.error("🔥 Fatal Error in Healer:", error);
  }
}

healScheduler();
