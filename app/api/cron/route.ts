import { TasksService } from "@/lib/services/tasks.service";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // Ensure no caching

export async function GET(req: Request) {
  try {
    // 1. Security Check (Optional but recommended)
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    const CRON_SECRET = process.env.CRON_SECRET || "cron_secret_123";

    if (key !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Run Job
    console.log("⏳ Starting Cron Job...");
    const result = await TasksService.runCron();
    console.log("✅ Cron Job Completed:", result);

    return NextResponse.json({ success: true, result });
  } catch (e: any) {
    console.error("❌ Cron Job Failed:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
