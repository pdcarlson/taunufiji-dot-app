import {
  CronService,
  CronResult,
} from "@/lib/application/services/jobs/cron.service";
import { env } from "@/lib/infrastructure/config/env";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // ensure no caching

export async function GET(req: Request) {
  try {
    // 1. Security check
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    const CRON_SECRET = env.CRON_SECRET;

    if (!CRON_SECRET) {
      console.error("Cron Job Failed: CRON_SECRET is not configured on the server.");
      return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
    }

    if (!key || key !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Run cron job based on 'job' parameter
    const job = searchParams.get("job");
    let result: CronResult | { errors: string[] } | void;

    switch (job) {
      case "HOURLY":
        result = await CronService.runHourly();
        break;
      case "EXPIRE_DUTIES":
        result = await CronService.expireDuties(); // Assuming a method like this exists
        break;
      case "ENSURE_FUTURE_TASKS":
        result = await CronService.ensureFutureTasks(); // Assuming a method like this exists
        break;
      default:
        return NextResponse.json(
          { error: "Invalid or missing job parameter" },
          { status: 400 },
        );
    }

    // 3. Log result for GitHub Actions visibility
    console.log("Cron Result:", JSON.stringify(result));

    return NextResponse.json({ success: true, result });
  } catch (e: unknown) {
    console.error("❌ Cron Job Failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
