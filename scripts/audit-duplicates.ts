import fs from "fs";
import path from "path";

// Load .env.local manually
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
  }
} catch (e) {
  console.warn("⚠️ Failed to load .env.local manually");
}

import { AppwriteTaskRepository } from "@/lib/infrastructure/persistence/task.repository";

const taskRepo = new AppwriteTaskRepository();

async function auditDuplicates() {
  console.log("🔍 Auditing for Duplicate Tasks...");

  const schedules = await taskRepo.findActiveSchedules();
  console.log(`Checking ${schedules.length} active schedules...`);

  for (const schedule of schedules) {
    const activeTasks = await taskRepo.findMany({
      scheduleId: schedule.id,
      status: ["open", "pending", "locked"],
      orderBy: "due_at",
      orderDirection: "desc",
    });

    if (activeTasks.length > 1) {
      console.log(`\n⚠️  Schedule: "${schedule.title}" (${schedule.id})`);
      console.log(`    Has ${activeTasks.length} active tasks:`);
      activeTasks.forEach((t) => {
        console.log(
          `    - [${t.status.toUpperCase()}] "${t.title}" Due: ${t.due_at} (ID: ${t.id})`,
        );
      });
    }
  }
  console.log("\n✅ Audit Complete.");
}

auditDuplicates();
