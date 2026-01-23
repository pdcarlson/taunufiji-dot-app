import { TasksService } from "@/lib/services/tasks.service";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // ensure no caching

export async function GET(req: Request) {
  try {
    // 1. security check
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    const CRON_SECRET = process.env.CRON_SECRET || "cron_secret_123";

    if (key !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. run job
    console.log("⏳ Starting Cron Job...");
    const result = await TasksService.runCron();
    console.log("✅ Cron Job Completed:", result);

    // 3. optional: notify discord on success (if monitoring webhook is set)
    // SILENCED: Only notify on failure as per user request
    /*
    if (process.env.DISCORD_MONITORING_WEBHOOK) {
      const summary = `✅ **Cron Job Success**\n\`\`\`\nUnlocked: ${result.unlocked}\nUrgent Notifications: ${result.urgent}\nExpired Bounties: ${result.expired_bounties}\nExpired Duties: ${result.expired_duties}\n\`\`\``;

      try {
        await fetch(process.env.DISCORD_MONITORING_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: summary }),
        });
      } catch (notifyError) {
        // don't fail the cron if notification fails
        console.warn("Discord notification failed:", notifyError);
      }
    }
    */

    return NextResponse.json({ success: true, result });
  } catch (e: any) {
    console.error("❌ Cron Job Failed:", e);

    // Notify failure
    if (process.env.DISCORD_MONITORING_WEBHOOK) {
      try {
        await fetch(process.env.DISCORD_MONITORING_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `🚨 **CRON JOB FAILED** 🚨\n\`\`\`\nError: ${e.message}\nStack: ${e.stack ? e.stack.slice(0, 500) : "N/A"}\n\`\`\``,
          }),
        });
      } catch (webhookError) {
        console.error("Failed to send error notification", webhookError);
      }
    }

    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
